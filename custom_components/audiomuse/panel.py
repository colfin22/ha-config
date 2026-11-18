"""Register the AudioMuse sidebar page."""

from __future__ import annotations

import hashlib
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

PANEL_URL_PATH = "audiomuse"
WEBCOMPONENT = "audiomuse-panel"
STATIC_URL = "/audiomuse_static"
FRONTEND_DIR = Path(__file__).parent / "frontend"
PANEL_FILE = FRONTEND_DIR / "audiomuse-panel.js"

_DATA_STATIC = "audiomuse_static_registered"
_DATA_PANEL = "audiomuse_panel_registered"


def _file_hash() -> str:
    """Short content hash, so browsers load a new page version after an update."""
    return hashlib.sha256(PANEL_FILE.read_bytes()).hexdigest()[:12]


async def async_register_panel(hass: HomeAssistant) -> None:
    """Add the AudioMuse page to the sidebar (once, however many servers are set up)."""
    if hass.data.get(_DATA_PANEL):
        return
    if not hass.data.get(_DATA_STATIC):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=False)]
        )
        hass.data[_DATA_STATIC] = True
    version = await hass.async_add_executor_job(_file_hash)
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=WEBCOMPONENT,
        frontend_url_path=PANEL_URL_PATH,
        module_url=f"{STATIC_URL}/audiomuse-panel.js?v={version}",
        sidebar_title="AudioMuse",
        sidebar_icon="mdi:music-circle-outline",
        require_admin=False,
        config={},
        embed_iframe=False,
    )
    hass.data[_DATA_PANEL] = True


def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the page from the sidebar (the static path stays until restart)."""
    if hass.data.pop(_DATA_PANEL, None):
        frontend.async_remove_panel(hass, PANEL_URL_PATH)
