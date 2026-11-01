"""Serve /config/infra_private/ to logged-in Home Assistant users only.

/config/www is published at /local/ without any login. Pages that should only be
seen by household members (the infra dashboard, the Update Tuesday reports) live
in /config/infra_private/ instead and are served here, behind HA's own auth:
a bearer token, or a short-lived signed URL (authSig) such as the one the
infra-frame-card asks HA for.

Links inside a served HTML page that point back at /api/infra_private/ are signed
on the way out for the same user, so embedded iframes keep working.
"""

from __future__ import annotations

from datetime import timedelta
from email.utils import formatdate
import mimetypes
from pathlib import Path
import re

from aiohttp import web

from homeassistant.components.http import KEY_HASS, KEY_HASS_REFRESH_TOKEN_ID, HomeAssistantView
from homeassistant.components.http.auth import async_sign_path
from homeassistant.core import HomeAssistant
import homeassistant.helpers.config_validation as cv
from homeassistant.helpers.typing import ConfigType

DOMAIN = "infra_private"
URL_BASE = "/api/infra_private"
CONFIG_SCHEMA = cv.empty_config_schema(DOMAIN)

_LINK_RE = re.compile(r'((?:src|href)=")(/api/infra_private/[^"]+)(")')
_NESTED_TTL = timedelta(minutes=15)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the authenticated file view."""
    root = Path(hass.config.path("infra_private")).resolve()
    hass.http.register_view(InfraPrivateView(root))
    return True


class InfraPrivateView(HomeAssistantView):
    """GET/HEAD a file under /config/infra_private/ (login required)."""

    url = URL_BASE + "/{path:.+}"
    name = "api:infra_private"
    requires_auth = True

    def __init__(self, root: Path) -> None:
        self._root = root

    def _stat(self, path: str) -> tuple[Path, float] | None:
        target = (self._root / path).resolve()
        if self._root not in target.parents or not target.is_file():
            return None
        return target, target.stat().st_mtime

    async def _respond(self, request: web.Request, path: str, body: bool) -> web.Response:
        hass = request.app[KEY_HASS]
        found = await hass.async_add_executor_job(self._stat, path)
        if found is None:
            raise web.HTTPNotFound
        target, mtime = found
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        headers = {
            "Cache-Control": "no-store",
            "Last-Modified": formatdate(mtime, usegmt=True),
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
        }
        if not body:
            return web.Response(headers=headers, content_type=ctype)
        data = await hass.async_add_executor_job(target.read_bytes)
        if ctype != "text/html":
            return web.Response(body=data, headers=headers, content_type=ctype)
        token_id = request.get(KEY_HASS_REFRESH_TOKEN_ID)
        text = _LINK_RE.sub(
            lambda m: m.group(1)
            + async_sign_path(hass, m.group(2).replace("&amp;", "&"), _NESTED_TTL, refresh_token_id=token_id).replace("&", "&amp;")
            + m.group(3),
            data.decode("utf-8", errors="replace"),
        )
        return web.Response(text=text, headers=headers, content_type="text/html")

    async def get(self, request: web.Request, path: str) -> web.Response:
        return await self._respond(request, path, True)

    async def head(self, request: web.Request, path: str) -> web.Response:
        return await self._respond(request, path, False)
