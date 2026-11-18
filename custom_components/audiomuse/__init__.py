"""The AudioMuse-AI integration."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.const import CONF_API_TOKEN, CONF_URL, Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType

from .api import AudioMuseClient
from .const import DOMAIN
from .coordinator import AudioMuseCoordinator
from .panel import async_register_panel, async_unregister_panel
from .recent import async_setup_recent
from .services import async_setup_services
from .websocket_api import async_register_websocket_commands

PLATFORMS: list[Platform] = [Platform.SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


@dataclass
class AudioMuseRuntimeData:
    """Objects shared by the platforms and services of one config entry."""

    client: AudioMuseClient
    coordinator: AudioMuseCoordinator


type AudioMuseConfigEntry = ConfigEntry[AudioMuseRuntimeData]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the integration's actions and page commands once, for every config entry."""
    await async_setup_recent(hass)
    async_setup_services(hass)
    async_register_websocket_commands(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: AudioMuseConfigEntry) -> bool:
    """Set up one AudioMuse-AI server."""
    client = AudioMuseClient(
        async_get_clientsession(hass), entry.data[CONF_URL], entry.data[CONF_API_TOKEN]
    )
    coordinator = AudioMuseCoordinator(hass, entry, client)
    await coordinator.async_config_entry_first_refresh()

    entry.runtime_data = AudioMuseRuntimeData(client=client, coordinator=coordinator)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_on_options_change))
    await async_register_panel(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: AudioMuseConfigEntry) -> bool:
    """Unload a config entry; remove the page when no AudioMuse-AI server is left."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded and not any(
        e.state is ConfigEntryState.LOADED
        for e in hass.config_entries.async_entries(DOMAIN)
        if e.entry_id != entry.entry_id
    ):
        async_unregister_panel(hass)
    return unloaded


async def _async_reload_on_options_change(hass: HomeAssistant, entry: AudioMuseConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
