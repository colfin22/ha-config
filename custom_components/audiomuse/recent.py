"""Remember the playlists saved from Home Assistant (page and actions alike)."""

from __future__ import annotations

import uuid
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .playlist import display_name

STORAGE_KEY = f"{DOMAIN}.recent"
STORAGE_VERSION = 1
RECENT_MAX = 20
DATA_RECENT = f"{DOMAIN}_recent"


class RecentPlaylists:
    """A short, newest-first list of saved playlists, kept in HA storage."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._items: list[dict[str, Any]] = []

    async def async_load(self) -> None:
        """Load the list from storage."""
        data = await self._store.async_load()
        self._items = list((data or {}).get("items", []))[:RECENT_MAX]

    @callback
    def items(self, entry_id: str | None = None) -> list[dict[str, Any]]:
        """Newest first, optionally only for one AudioMuse-AI server."""
        return [
            {**i, "display_name": display_name(i.get("playlist_name") or "")}
            for i in self._items
            if entry_id is None or i.get("entry_id") == entry_id
        ]

    @callback
    def add(
        self,
        *,
        entry_id: str,
        playlist_id: str | None,
        playlist_name: str,
        source: str,
        detail: str | None,
        track_count: int,
    ) -> dict[str, Any]:
        """Record a saved playlist."""
        item = {
            "id": uuid.uuid4().hex,
            "entry_id": entry_id,
            "playlist_id": playlist_id,
            "playlist_name": playlist_name,
            "source": source,
            "detail": detail,
            "track_count": track_count,
            "created": dt_util.utcnow().isoformat(),
        }
        self._items = [item, *self._items][:RECENT_MAX]
        self._save()
        return item

    @callback
    def remove(self, item_id: str) -> bool:
        """Forget one item (the playlist itself stays on the music server)."""
        before = len(self._items)
        self._items = [i for i in self._items if i["id"] != item_id]
        if len(self._items) != before:
            self._save()
            return True
        return False

    @callback
    def _save(self) -> None:
        self._store.async_delay_save(lambda: {"items": self._items}, 1)


async def async_setup_recent(hass: HomeAssistant) -> RecentPlaylists:
    """Create and load the shared list once."""
    recent = RecentPlaylists(hass)
    await recent.async_load()
    hass.data[DATA_RECENT] = recent
    return recent


@callback
def get_recent(hass: HomeAssistant) -> RecentPlaylists | None:
    """The shared list, if set up."""
    return hass.data.get(DATA_RECENT)
