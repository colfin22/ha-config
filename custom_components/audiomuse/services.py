"""Actions (services) for AudioMuse-AI.

Every action returns response data, so automations, scripts, voice and the
AudioMuse page can all use the same calls.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .api import AudioMuseError, InstantPlaylist, Track
from .const import (
    ATTR_ARTIST,
    ATTR_CONFIG_ENTRY_ID,
    ATTR_COUNT,
    ATTR_INCLUDE_SIMILAR,
    ATTR_MODE,
    ATTR_NAME,
    ATTR_PLAY_ON,
    ATTR_PLAYLIST_ID,
    ATTR_PROMPT,
    ATTR_SAVE,
    CONF_AI_MODEL,
    CONF_AI_PROVIDER,
    CONF_AI_SERVER_URL,
    CONF_DEFAULT_COUNT,
    CONF_DEFAULT_PLAYER,
    CONF_MA_PROVIDER,
    DEFAULT_COUNT,
    DOMAIN,
    MA_MAPPING_BY_SERVER_TYPE,
    MAX_COUNT,
    MIN_COUNT,
    MODE_AI,
    MODE_SEARCH,
    MUSIC_ASSISTANT_DOMAIN,
    SERVICE_ARTIST_PLAYLIST,
    SERVICE_INSTANT_PLAYLIST,
    SERVICE_PLAY_PLAYLIST,
    SERVICE_PLAYLIST_IDEAS,
    SERVICE_RUN_RADIOS,
    SERVICE_SIMILAR_ARTISTS,
)
from .playlist import mix_tracks, playlist_name_from, saved_playlist_name
from .recent import get_recent

if TYPE_CHECKING:
    from . import AudioMuseConfigEntry

_LOGGER = logging.getLogger(__name__)
_WARNED_UNVERIFIED: set[str] = set()

_COUNT = vol.All(vol.Coerce(int), vol.Range(min=MIN_COUNT, max=MAX_COUNT))
_ENTRY = {vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string}

INSTANT_SCHEMA = vol.Schema(
    {
        **_ENTRY,
        vol.Required(ATTR_PROMPT): vol.All(cv.string, vol.Length(min=1, max=2000)),
        vol.Optional(ATTR_MODE, default=MODE_AI): vol.In([MODE_AI, MODE_SEARCH]),
        vol.Optional(ATTR_COUNT): _COUNT,
        vol.Optional(ATTR_NAME): cv.string,
        vol.Optional(ATTR_SAVE, default=True): cv.boolean,
        vol.Optional(ATTR_PLAY_ON): cv.entity_id,
    }
)
SIMILAR_SCHEMA = vol.Schema(
    {
        **_ENTRY,
        vol.Required(ATTR_ARTIST): cv.string,
        vol.Optional(ATTR_COUNT, default=10): vol.All(vol.Coerce(int), vol.Range(min=1, max=50)),
    }
)
ARTIST_PLAYLIST_SCHEMA = vol.Schema(
    {
        **_ENTRY,
        vol.Required(ATTR_ARTIST): cv.string,
        vol.Optional(ATTR_INCLUDE_SIMILAR, default=4): vol.All(
            vol.Coerce(int), vol.Range(min=0, max=20)
        ),
        vol.Optional(ATTR_COUNT): _COUNT,
        vol.Optional(ATTR_NAME): cv.string,
        vol.Optional(ATTR_SAVE, default=True): cv.boolean,
        vol.Optional(ATTR_PLAY_ON): cv.entity_id,
    }
)
ENTRY_ONLY_SCHEMA = vol.Schema(_ENTRY)
PLAY_SCHEMA = vol.Schema(
    {
        **_ENTRY,
        vol.Required(ATTR_PLAYLIST_ID): cv.string,
        vol.Optional(ATTR_ENTITY_ID): cv.entity_id,
    }
)


@callback
def async_setup_services(hass: HomeAssistant) -> None:
    """Register all AudioMuse-AI actions."""

    async def instant_playlist(call: ServiceCall) -> ServiceResponse:
        entry = _get_entry(hass, call)
        prompt: str = call.data[ATTR_PROMPT]
        if call.data[ATTR_MODE] == MODE_SEARCH:
            result = await async_make_search(entry, prompt, call.data.get(ATTR_COUNT))
        else:
            result = await async_make_instant(entry, prompt, call.data.get(ATTR_COUNT))
        response: dict[str, Any] = {
            "tracks": [t.as_dict() for t in result.tracks],
            "ai_provider": result.ai_provider,
            "ai_model": result.ai_model,
            "message": result.message,
        }
        name = call.data.get(ATTR_NAME) or playlist_name_from(prompt)
        response.update(
            await async_save_and_play(
                hass, entry, name, [t.item_id for t in result.tracks],
                save=call.data.get(ATTR_SAVE, True), play_on=call.data.get(ATTR_PLAY_ON),
                source="instant", detail=prompt,
            )
        )
        return response

    async def similar_artists(call: ServiceCall) -> ServiceResponse:
        entry = _get_entry(hass, call)
        try:
            artists = await entry.runtime_data.client.similar_artists(
                artist=call.data[ATTR_ARTIST], count=call.data[ATTR_COUNT]
            )
        except AudioMuseError as err:
            raise HomeAssistantError(f"Similar artists failed: {err}") from err
        return {"artists": [a.as_dict() for a in artists]}

    async def artist_playlist(call: ServiceCall) -> ServiceResponse:
        entry = _get_entry(hass, call)
        artist: str = call.data[ATTR_ARTIST]
        names, tracks = await async_make_artist_mix(
            entry, artist, call.data[ATTR_INCLUDE_SIMILAR], call.data.get(ATTR_COUNT)
        )
        response: dict[str, Any] = {
            "artists": names,
            "tracks": [t.as_dict() for t in tracks],
        }
        name = call.data.get(ATTR_NAME) or f"{artist} and similar"
        response.update(
            await async_save_and_play(
                hass, entry, name, [t.item_id for t in tracks],
                save=call.data.get(ATTR_SAVE, True), play_on=call.data.get(ATTR_PLAY_ON),
                source="artist", detail=artist,
            )
        )
        return response

    async def playlist_ideas(call: ServiceCall) -> ServiceResponse:
        entry = _get_entry(hass, call)
        try:
            return {"ideas": await entry.runtime_data.client.playlist_ideas()}
        except AudioMuseError as err:
            raise HomeAssistantError(f"Could not load playlist ideas: {err}") from err

    async def run_radios(call: ServiceCall) -> ServiceResponse:
        entry = _get_entry(hass, call)
        try:
            return {"result": await entry.runtime_data.client.run_radios()}
        except AudioMuseError as err:
            raise HomeAssistantError(f"Could not refresh Radios: {err}") from err

    async def play_playlist(call: ServiceCall) -> ServiceResponse:
        entry = _get_entry(hass, call)
        player = call.data.get(ATTR_ENTITY_ID) or entry.options.get(CONF_DEFAULT_PLAYER)
        if not player:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="no_player"
            )
        await async_play_playlist(hass, entry, call.data[ATTR_PLAYLIST_ID], player)
        return {"played_on": player}

    hass.services.async_register(
        DOMAIN, SERVICE_INSTANT_PLAYLIST, instant_playlist, INSTANT_SCHEMA, SupportsResponse.OPTIONAL
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SIMILAR_ARTISTS, similar_artists, SIMILAR_SCHEMA, SupportsResponse.ONLY
    )
    hass.services.async_register(
        DOMAIN, SERVICE_ARTIST_PLAYLIST, artist_playlist, ARTIST_PLAYLIST_SCHEMA, SupportsResponse.OPTIONAL
    )
    hass.services.async_register(
        DOMAIN, SERVICE_PLAYLIST_IDEAS, playlist_ideas, ENTRY_ONLY_SCHEMA, SupportsResponse.ONLY
    )
    hass.services.async_register(
        DOMAIN, SERVICE_RUN_RADIOS, run_radios, ENTRY_ONLY_SCHEMA, SupportsResponse.OPTIONAL
    )
    hass.services.async_register(
        DOMAIN, SERVICE_PLAY_PLAYLIST, play_playlist, PLAY_SCHEMA, SupportsResponse.OPTIONAL
    )


def default_count(entry: AudioMuseConfigEntry) -> int:
    """Songs per playlist from the options."""
    return int(entry.options.get(CONF_DEFAULT_COUNT, DEFAULT_COUNT))


async def async_make_instant(
    entry: AudioMuseConfigEntry, prompt: str, count: int | None = None
) -> InstantPlaylist:
    """Ask AudioMuse-AI for an Instant Playlist using the entry's AI options."""
    opts = entry.options
    try:
        return await entry.runtime_data.client.instant_playlist(
            prompt,
            count or default_count(entry),
            ai_provider=opts.get(CONF_AI_PROVIDER),
            ai_model=opts.get(CONF_AI_MODEL),
            ai_server_url=opts.get(CONF_AI_SERVER_URL),
        )
    except AudioMuseError as err:
        raise HomeAssistantError(f"Instant Playlist failed: {err}") from err


def ai_configured(entry: AudioMuseConfigEntry) -> bool:
    """Whether Instant Playlist has an AI provider (integration option or AudioMuse-AI's own)."""
    if entry.options.get(CONF_AI_PROVIDER):
        return True
    data = entry.runtime_data.coordinator.data
    provider = data.ai_provider if data else None
    # Unknown (older server) counts as configured: let AudioMuse-AI answer for itself.
    return provider is None or provider != "NONE"


async def async_make_search(
    entry: AudioMuseConfigEntry, query: str, count: int | None = None
) -> InstantPlaylist:
    """Songs for a description via AudioMuse-AI's text search (fast, no AI)."""
    try:
        tracks = await entry.runtime_data.client.text_search(query, count or default_count(entry))
    except AudioMuseError as err:
        raise HomeAssistantError(f"Text search failed: {err}") from err
    return InstantPlaylist(tracks=tracks, message=None, ai_provider=None, ai_model=None)


async def async_make_artist_mix(
    entry: AudioMuseConfigEntry, artist: str, include_similar: int, count: int | None = None
) -> tuple[list[str], list[Track]]:
    """Tracks from an artist plus the artists that sound most like them, interleaved."""
    client = entry.runtime_data.client
    try:
        names = [artist]
        if include_similar:
            similar = await client.similar_artists(artist=artist, count=include_similar)
            names += [a.name for a in similar if a.name and a.name.lower() != artist.lower()]
        pools = [await client.artist_tracks(artist=n) for n in names]
    except AudioMuseError as err:
        raise HomeAssistantError(f"Artist playlist failed: {err}") from err
    tracks = mix_tracks(pools, count or default_count(entry))
    if not tracks:
        raise HomeAssistantError(f"No analysed tracks found for {artist}")
    return names, tracks


async def async_save_and_play(
    hass: HomeAssistant,
    entry: AudioMuseConfigEntry,
    name: str,
    item_ids: list[str],
    *,
    save: bool = True,
    play_on: str | None = None,
    source: str = "page",
    detail: str | None = None,
) -> dict[str, Any]:
    """Save songs as a music-server playlist and optionally start it on a player.

    Playing needs a saved playlist, so play_on implies saving.
    """
    out: dict[str, Any] = {"playlist_id": None, "playlist_name": None, "played_on": None}
    if not save and not play_on:
        return out
    try:
        saved = await entry.runtime_data.client.save_playlist(name, item_ids)
    except AudioMuseError as err:
        raise HomeAssistantError(f"Saving the playlist failed: {err}") from err
    out["playlist_id"] = saved.playlist_id
    out["playlist_name"] = saved_playlist_name(name)
    if (recent := get_recent(hass)) is not None:
        recent.add(
            entry_id=entry.entry_id,
            playlist_id=saved.playlist_id,
            playlist_name=out["playlist_name"],
            source=source,
            detail=detail,
            track_count=len(item_ids),
        )
    if play_on:
        if not saved.playlist_id:
            raise HomeAssistantError(
                "The playlist was saved, but AudioMuse-AI did not report its ID, so it cannot be played yet"
            )
        await async_play_playlist(hass, entry, saved.playlist_id, play_on)
        out["played_on"] = play_on
    return out


async def async_play_playlist(
    hass: HomeAssistant, entry: AudioMuseConfigEntry, playlist_id: str, player: str
) -> None:
    """Play a music-server playlist on a Music Assistant player.

    Uses the provider address ("<provider>://playlist/<item id>") so a playlist
    created seconds ago plays without waiting for a Music Assistant library sync.
    """
    if not hass.services.has_service(MUSIC_ASSISTANT_DOMAIN, "play_media"):
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="no_music_assistant")
    media_id = music_assistant_media_id(entry, playlist_id)
    if not media_id:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="no_ma_provider")
    await hass.services.async_call(
        MUSIC_ASSISTANT_DOMAIN,
        "play_media",
        {
            ATTR_ENTITY_ID: player,
            "media_id": media_id,
            "media_type": "playlist",
            "enqueue": "replace",
        },
        blocking=True,
    )


def music_assistant_media_id(entry: AudioMuseConfigEntry, playlist_id: str) -> str | None:
    """The Music Assistant address of a music-server playlist, or None if unknown.

    The "Music Assistant provider" option replaces only the provider part (for
    example a specific provider instance); the item-id format still follows the
    music-server type AudioMuse-AI reports.
    """
    data = entry.runtime_data.coordinator.data
    server = data.default_server if data else None
    mapping = MA_MAPPING_BY_SERVER_TYPE.get(server.server_type) if server else None
    override = (entry.options.get(CONF_MA_PROVIDER) or "").strip()
    provider = override or (mapping.provider if mapping else None)
    if not provider:
        return None
    if mapping and not mapping.verified and server.server_type not in _WARNED_UNVERIFIED:
        _WARNED_UNVERIFIED.add(server.server_type)
        _LOGGER.warning(
            "Playback for %s music servers is built from the Music Assistant source but has not "
            "been tested end to end yet. If it fails, please report it (and set the "
            "'Music Assistant provider' option if your provider instance differs)",
            server.server_type,
        )
    item_id = (mapping.item_id_format if mapping else "{id}").format(id=playlist_id)
    return f"{provider}://playlist/{item_id}"


def _get_entry(hass: HomeAssistant, call: ServiceCall) -> AudioMuseConfigEntry:
    """Pick the config entry for a call: the one named, or the only one loaded."""
    entry_id = call.data.get(ATTR_CONFIG_ENTRY_ID)
    loaded = [
        e for e in hass.config_entries.async_entries(DOMAIN) if e.state is ConfigEntryState.LOADED
    ]
    if entry_id:
        for entry in loaded:
            if entry.entry_id == entry_id:
                return entry
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="entry_not_found")
    if len(loaded) == 1:
        return loaded[0]
    if not loaded:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="not_loaded")
    raise ServiceValidationError(translation_domain=DOMAIN, translation_key="entry_required")
