"""Config flow for AudioMuse-AI."""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any
from urllib.parse import urlparse

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.const import CONF_API_TOKEN, CONF_URL
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import (
    AudioMuseAuthError,
    AudioMuseClient,
    AudioMuseConnectionError,
    AudioMuseError,
    parse_version,
)
from .const import (
    AI_PROVIDERS,
    CONF_AI_MODEL,
    CONF_AI_PROVIDER,
    CONF_AI_SERVER_URL,
    CONF_DEFAULT_COUNT,
    CONF_DEFAULT_PLAYER,
    CONF_MA_PROVIDER,
    DEFAULT_COUNT,
    DOMAIN,
    MAX_COUNT,
    MIN_COUNT,
    MIN_VERSION,
    MUSIC_ASSISTANT_DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

_PASSWORD = selector.TextSelector(selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD))


def _normalise_url(url: str) -> str:
    url = url.strip().rstrip("/")
    if "://" not in url:
        url = f"http://{url}"
    return url


async def _validate(hass, url: str, token: str) -> tuple[dict[str, str], str | None]:
    """Check URL + token. Returns (errors, version)."""
    client = AudioMuseClient(async_get_clientsession(hass), url, token)
    try:
        version = await client.get_version()
    except AudioMuseAuthError:
        return {"base": "invalid_auth"}, None
    except AudioMuseConnectionError:
        return {"base": "cannot_connect"}, None
    except AudioMuseError:
        _LOGGER.exception("Unexpected answer from AudioMuse-AI at %s", url)
        return {"base": "unknown"}, None
    parsed = parse_version(version)
    if parsed and parsed < MIN_VERSION:
        return {"base": "unsupported_version"}, version
    return {}, version


class AudioMuseConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for AudioMuse-AI."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Ask for the server URL and API token."""
        errors: dict[str, str] = {}
        placeholders = {
            "min_version": ".".join(map(str, MIN_VERSION)),
            "version": "",
            "example_url": "http://audiomuse.local:8000",
        }
        if user_input is not None:
            url = _normalise_url(user_input[CONF_URL])
            await self.async_set_unique_id(url.lower())
            self._abort_if_unique_id_configured()
            token = (user_input.get(CONF_API_TOKEN) or "").strip()
            errors, version = await _validate(self.hass, url, token)
            placeholders["version"] = version or ""
            if not errors:
                host = urlparse(url).hostname or url
                return self.async_create_entry(
                    title=f"AudioMuse-AI ({host})",
                    data={CONF_URL: url, CONF_API_TOKEN: token},
                )
        schema = vol.Schema(
            {
                vol.Required(CONF_URL, default=(user_input or {}).get(CONF_URL, "")): str,
                vol.Optional(CONF_API_TOKEN): _PASSWORD,
            }
        )
        return self.async_show_form(
            step_id="user", data_schema=schema, errors=errors, description_placeholders=placeholders
        )

    async def async_step_reauth(self, entry_data: Mapping[str, Any]) -> ConfigFlowResult:
        """Start re-authentication when the token stops working."""
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask for a new API token."""
        entry = self._get_reauth_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            errors, _ = await _validate(self.hass, entry.data[CONF_URL], user_input[CONF_API_TOKEN])
            if not errors:
                return self.async_update_reload_and_abort(
                    entry, data_updates={CONF_API_TOKEN: user_input[CONF_API_TOKEN]}
                )
        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=vol.Schema({vol.Required(CONF_API_TOKEN): _PASSWORD}),
            errors=errors,
            description_placeholders={"url": entry.data[CONF_URL]},
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> AudioMuseOptionsFlow:
        """Return the options flow."""
        return AudioMuseOptionsFlow()


class AudioMuseOptionsFlow(OptionsFlow):
    """Defaults for playlists and playback."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Show the options form."""
        if user_input is not None:
            cleaned = {k: v for k, v in user_input.items() if v not in ("", None)}
            return self.async_create_entry(data=cleaned)

        opts = self.config_entry.options
        schema = vol.Schema(
            {
                vol.Required(
                    CONF_DEFAULT_COUNT, default=opts.get(CONF_DEFAULT_COUNT, DEFAULT_COUNT)
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=MIN_COUNT, max=MAX_COUNT, step=1, mode=selector.NumberSelectorMode.BOX
                    )
                ),
                vol.Optional(
                    CONF_DEFAULT_PLAYER,
                    description={"suggested_value": opts.get(CONF_DEFAULT_PLAYER)},
                ): selector.EntitySelector(
                    selector.EntitySelectorConfig(
                        filter=[
                            {
                                "domain": "media_player",
                                "integration": MUSIC_ASSISTANT_DOMAIN,
                                # Leaves out Music Assistant's dashboard-display casts.
                                "supported_features": [
                                    "media_player.MediaPlayerEntityFeature.MEDIA_ENQUEUE"
                                ],
                            }
                        ]
                    )
                ),
                vol.Optional(
                    CONF_AI_PROVIDER,
                    description={"suggested_value": opts.get(CONF_AI_PROVIDER)},
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=AI_PROVIDERS, mode=selector.SelectSelectorMode.DROPDOWN
                    )
                ),
                vol.Optional(
                    CONF_AI_MODEL, description={"suggested_value": opts.get(CONF_AI_MODEL)}
                ): str,
                vol.Optional(
                    CONF_AI_SERVER_URL,
                    description={"suggested_value": opts.get(CONF_AI_SERVER_URL)},
                ): str,
                vol.Optional(
                    CONF_MA_PROVIDER, description={"suggested_value": opts.get(CONF_MA_PROVIDER)}
                ): str,
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
