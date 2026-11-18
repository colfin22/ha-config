"""Sensors for AudioMuse-AI library and worker status."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from homeassistant.components.sensor import (
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from . import AudioMuseConfigEntry
from .const import DOMAIN
from .coordinator import AudioMuseCoordinator, AudioMuseData


@dataclass(frozen=True, kw_only=True)
class AudioMuseSensorDescription(SensorEntityDescription):
    """Describes an AudioMuse-AI sensor."""

    value_fn: Callable[[AudioMuseData], Any]
    attrs_fn: Callable[[AudioMuseData], dict[str, Any]] | None = None


SENSORS: tuple[AudioMuseSensorDescription, ...] = (
    AudioMuseSensorDescription(
        key="songs_analysed",
        translation_key="songs_analysed",
        state_class=SensorStateClass.TOTAL,
        value_fn=lambda d: d.summary.songs_analysed,
    ),
    AudioMuseSensorDescription(
        key="albums",
        translation_key="albums",
        state_class=SensorStateClass.TOTAL,
        value_fn=lambda d: d.summary.albums,
    ),
    AudioMuseSensorDescription(
        key="artists",
        translation_key="artists",
        state_class=SensorStateClass.TOTAL,
        value_fn=lambda d: d.summary.artists,
    ),
    AudioMuseSensorDescription(
        key="lyrics_songs",
        translation_key="lyrics_songs",
        state_class=SensorStateClass.TOTAL,
        value_fn=lambda d: d.lyrics.songs if d.lyrics else None,
        attrs_fn=lambda d: {"lyrics_enabled": d.lyrics.enabled if d.lyrics else None},
    ),
    AudioMuseSensorDescription(
        key="busy_workers",
        translation_key="busy_workers",
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda d: d.summary.busy_workers,
        attrs_fn=lambda d: {
            "workers": d.summary.workers,
            "task_types": d.summary.busy_task_types,
        },
    ),
    AudioMuseSensorDescription(
        key="queue_pending",
        translation_key="queue_pending",
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda d: d.summary.queue_pending,
        attrs_fn=lambda d: {"running": d.summary.queue_running},
    ),
    AudioMuseSensorDescription(
        key="unanalysable",
        translation_key="unanalysable",
        entity_category=EntityCategory.DIAGNOSTIC,
        state_class=SensorStateClass.TOTAL,
        value_fn=lambda d: d.summary.unanalysable,
    ),
    AudioMuseSensorDescription(
        key="version",
        translation_key="version",
        entity_category=EntityCategory.DIAGNOSTIC,
        value_fn=lambda d: d.version,
        attrs_fn=lambda d: {
            "music_server": d.default_server.name if d.default_server else None,
            "music_server_type": d.default_server.server_type if d.default_server else None,
        },
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: AudioMuseConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add sensors for one AudioMuse-AI server."""
    coordinator = entry.runtime_data.coordinator
    async_add_entities(AudioMuseSensor(coordinator, entry, d) for d in SENSORS)


class AudioMuseSensor(CoordinatorEntity[AudioMuseCoordinator], SensorEntity):
    """One AudioMuse-AI statistic."""

    _attr_has_entity_name = True
    entity_description: AudioMuseSensorDescription

    def __init__(
        self,
        coordinator: AudioMuseCoordinator,
        entry: AudioMuseConfigEntry,
        description: AudioMuseSensorDescription,
    ) -> None:
        super().__init__(coordinator)
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            manufacturer="AudioMuse-AI",
            model="AudioMuse-AI server",
            sw_version=coordinator.data.version if coordinator.data else None,
            configuration_url=coordinator.client.url,
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def native_value(self) -> Any:
        """Current value."""
        return self.entity_description.value_fn(self.coordinator.data)

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Extra details, where the sensor has any."""
        if self.entity_description.attrs_fn is None:
            return None
        return self.entity_description.attrs_fn(self.coordinator.data)
