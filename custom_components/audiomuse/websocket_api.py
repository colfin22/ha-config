"""Websocket commands used by the AudioMuse sidebar page.

They are thin wrappers around the same helpers as the actions, so the page and
automations behave the same way.
"""

from __future__ import annotations

import secrets
from collections import OrderedDict
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.media_player import MediaPlayerEntityFeature
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.translation import async_get_exception_message

from .api import AudioMuseError
from .const import (
    CONF_DEFAULT_PLAYER,
    DOMAIN,
    MA_MAPPING_BY_SERVER_TYPE,
    MAX_COUNT,
    MIN_COUNT,
    MUSIC_ASSISTANT_DOMAIN,
)
from .recent import get_recent
from .services import (
    ai_configured,
    async_make_artist_mix,
    async_make_instant,
    async_make_search,
    async_play_playlist,
    async_save_and_play,
    default_count,
    music_assistant_media_id,
)


@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register the page's websocket commands."""
    websocket_api.async_register_command(hass, ws_info)
    websocket_api.async_register_command(hass, ws_ideas)
    websocket_api.async_register_command(hass, ws_instant)
    websocket_api.async_register_command(hass, ws_save)
    websocket_api.async_register_command(hass, ws_play)
    websocket_api.async_register_command(hass, ws_search_artists)
    websocket_api.async_register_command(hass, ws_similar_artists)
    websocket_api.async_register_command(hass, ws_artist_mix)
    websocket_api.async_register_command(hass, ws_radios)
    websocket_api.async_register_command(hass, ws_run_radios)
    websocket_api.async_register_command(hass, ws_recent)
    websocket_api.async_register_command(hass, ws_recent_remove)
    websocket_api.async_register_command(hass, ws_search)
    websocket_api.async_register_command(hass, ws_search_tracks)
    websocket_api.async_register_command(hass, ws_similar_tracks)
    websocket_api.async_register_command(hass, ws_anchors)
    websocket_api.async_register_command(hass, ws_find_path)
    websocket_api.async_register_command(hass, ws_alchemy)
    websocket_api.async_register_command(hass, ws_save_anchor)
    websocket_api.async_register_command(hass, ws_rename_anchor)
    websocket_api.async_register_command(hass, ws_delete_anchor)
    websocket_api.async_register_command(hass, ws_add_radio)
    websocket_api.async_register_command(hass, ws_update_radio)
    websocket_api.async_register_command(hass, ws_delete_radio)
    websocket_api.async_register_command(hass, ws_lyrics_axes)
    websocket_api.async_register_command(hass, ws_lyrics_search)
    websocket_api.async_register_command(hass, ws_album_concepts)
    websocket_api.async_register_command(hass, ws_album)


def _loaded_entries(hass: HomeAssistant) -> list:
    return [e for e in hass.config_entries.async_entries(DOMAIN) if e.state is ConfigEntryState.LOADED]


def _entry(hass: HomeAssistant, entry_id: str):
    for entry in _loaded_entries(hass):
        if entry.entry_id == entry_id:
            return entry
    raise ServiceValidationError(translation_domain=DOMAIN, translation_key="entry_not_found")


def _error_text(err: HomeAssistantError) -> str:
    text = str(err)
    if not text and err.translation_key:
        text = async_get_exception_message(
            err.translation_domain or DOMAIN, err.translation_key, err.translation_placeholders
        )
    return text or "Something went wrong"


async def _run(connection, msg, coro) -> None:
    """Run a command and translate failures into readable websocket errors."""
    try:
        connection.send_result(msg["id"], await coro)
    except ServiceValidationError as err:
        connection.send_error(msg["id"], "invalid", _error_text(err))
    except (HomeAssistantError, AudioMuseError) as err:
        text = _error_text(err) if isinstance(err, HomeAssistantError) else str(err)
        connection.send_error(msg["id"], "failed", text)


def _players(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Music Assistant players that can take a queue, found from the entity registry.

    Music Assistant also creates media players for its "dashboard display" casts
    (its UI shown on a screen); they share the device's name but cannot queue
    music, so only players supporting MEDIA_ENQUEUE are listed.
    """
    registry = er.async_get(hass)
    players = []
    for ent in registry.entities.values():
        if ent.platform != MUSIC_ASSISTANT_DOMAIN or ent.domain != "media_player" or ent.disabled:
            continue
        state = hass.states.get(ent.entity_id)
        features = int(
            (state.attributes.get("supported_features") if state else None) or ent.supported_features or 0
        )
        if not features & MediaPlayerEntityFeature.MEDIA_ENQUEUE:
            continue
        name = (state.attributes.get("friendly_name") if state else None) or ent.name or ent.original_name
        players.append(
            {"entity_id": ent.entity_id, "name": name or ent.entity_id, "state": state.state if state else None}
        )
    return sorted(players, key=lambda p: str(p["name"]).lower())


@websocket_api.websocket_command({vol.Required("type"): "audiomuse/info"})
@websocket_api.async_response
async def ws_info(hass: HomeAssistant, connection, msg) -> None:
    """Servers, their status and the speakers the page can play on."""
    entries = []
    unavailable = [
        {"entry_id": e.entry_id, "title": e.title, "state": e.state.value, "reason": e.reason}
        for e in hass.config_entries.async_entries(DOMAIN)
        if e.state is not ConfigEntryState.LOADED and not e.disabled_by
    ]
    for entry in _loaded_entries(hass):
        coordinator = entry.runtime_data.coordinator
        data = coordinator.data
        server = data.default_server if data else None
        mapping = MA_MAPPING_BY_SERVER_TYPE.get(server.server_type) if server else None
        entries.append(
            {
                "entry_id": entry.entry_id,
                "title": entry.title,
                "url": entry.runtime_data.client.url,
                "version": data.version if data else None,
                "music_server": server.name if server else None,
                "music_server_type": server.server_type if server else None,
                "playback": bool(music_assistant_media_id(entry, "x")),
                "playback_verified": bool(mapping and mapping.verified),
                "default_count": default_count(entry),
                "default_player": entry.options.get(CONF_DEFAULT_PLAYER),
                "songs_analysed": data.summary.songs_analysed if data else None,
                "albums": data.summary.albums if data else None,
                "busy_workers": data.summary.busy_workers if data else 0,
                "available": coordinator.last_update_success,
                "ai_configured": ai_configured(entry),
                "lyrics_available": bool(data and data.lyrics and data.lyrics.available),
                "lyrics_songs": data.lyrics.songs if data and data.lyrics else None,
                # Album Creation needs lyrics analysis and Text Search (CLAP).
                "album_available": bool(
                    data and data.lyrics and data.lyrics.available and data.clap and data.clap.available
                ),
            }
        )
    connection.send_result(
        msg["id"],
        {
            "entries": entries,
            "unavailable": unavailable,
            "players": _players(hass),
            "music_assistant": hass.services.has_service(MUSIC_ASSISTANT_DOMAIN, "play_media"),
            "min_count": MIN_COUNT,
            "max_count": MAX_COUNT,
        },
    )


@websocket_api.websocket_command({vol.Required("type"): "audiomuse/ideas", vol.Required("entry_id"): str})
@websocket_api.async_response
async def ws_ideas(hass: HomeAssistant, connection, msg) -> None:
    """AudioMuse-AI's suggested prompts."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            return {"ideas": await entry.runtime_data.client.playlist_ideas()}
        except AudioMuseError as err:
            raise HomeAssistantError(f"Could not load playlist ideas: {err}") from err

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/instant",
        vol.Required("entry_id"): str,
        vol.Required("prompt"): vol.All(cv.string, vol.Length(min=1, max=2000)),
        vol.Optional("count"): vol.All(vol.Coerce(int), vol.Range(min=MIN_COUNT, max=MAX_COUNT)),
    }
)
@websocket_api.async_response
async def ws_instant(hass: HomeAssistant, connection, msg) -> None:
    """Make an Instant Playlist (songs only; saving is a separate step on the page)."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        result = await async_make_instant(entry, msg["prompt"], msg.get("count"))
        return {
            "tracks": [t.as_dict() for t in result.tracks],
            "ai_provider": result.ai_provider,
            "ai_model": result.ai_model,
            "message": result.message,
        }

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/save",
        vol.Required("entry_id"): str,
        vol.Required("name"): vol.All(cv.string, vol.Length(min=1, max=200)),
        vol.Required("item_ids"): vol.All([cv.string], vol.Length(min=1)),
        vol.Optional("play_on"): cv.entity_id,
        vol.Optional("source", default="page"): vol.In(["page", "instant", "search", "artist", "song", "path", "alchemy", "lyrics", "album"]),
        vol.Optional("detail"): vol.All(cv.string, vol.Length(max=2000)),
    }
)
@websocket_api.async_response
async def ws_save(hass: HomeAssistant, connection, msg) -> None:
    """Save songs as a playlist, and optionally play it."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        return await async_save_and_play(
            hass, entry, msg["name"], msg["item_ids"], save=True, play_on=msg.get("play_on"),
            source=msg["source"], detail=msg.get("detail"),
        )

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/play",
        vol.Required("entry_id"): str,
        vol.Required("playlist_id"): str,
        vol.Required("entity_id"): cv.entity_id,
    }
)
@websocket_api.async_response
async def ws_play(hass: HomeAssistant, connection, msg) -> None:
    """Play a saved playlist on a speaker."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        await async_play_playlist(hass, entry, msg["playlist_id"], msg["entity_id"])
        return {"played_on": msg["entity_id"]}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/search_artists",
        vol.Required("entry_id"): str,
        vol.Required("query"): vol.All(cv.string, vol.Length(min=1, max=200)),
    }
)
@websocket_api.async_response
async def ws_search_artists(hass: HomeAssistant, connection, msg) -> None:
    """Find analysed artists by name."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            artists = await entry.runtime_data.client.search_artists(msg["query"])
        except AudioMuseError as err:
            raise HomeAssistantError(f"Artist search failed: {err}") from err
        return {"artists": [a.as_dict() for a in artists[:25]]}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/similar_artists",
        vol.Required("entry_id"): str,
        vol.Required("artist"): cv.string,
        vol.Optional("count", default=10): vol.All(vol.Coerce(int), vol.Range(min=1, max=50)),
        vol.Optional("why", default=False): cv.boolean,
    }
)
@websocket_api.async_response
async def ws_similar_artists(hass: HomeAssistant, connection, msg) -> None:
    """Artists that sound like the given one."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            artists = await entry.runtime_data.client.similar_artists(
                artist=msg["artist"], count=msg["count"], why=msg["why"]
            )
        except AudioMuseError as err:
            raise HomeAssistantError(f"Similar artists failed: {err}") from err
        return {"artists": [a.as_dict() for a in artists]}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/artist_mix",
        vol.Required("entry_id"): str,
        vol.Required("artist"): cv.string,
        vol.Optional("include_similar", default=4): vol.All(vol.Coerce(int), vol.Range(min=0, max=20)),
        vol.Optional("count"): vol.All(vol.Coerce(int), vol.Range(min=MIN_COUNT, max=MAX_COUNT)),
    }
)
@websocket_api.async_response
async def ws_artist_mix(hass: HomeAssistant, connection, msg) -> None:
    """An artist plus similar artists, as songs (saving is a separate step)."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        names, tracks = await async_make_artist_mix(
            entry, msg["artist"], msg["include_similar"], msg.get("count")
        )
        return {"artists": names, "tracks": [t.as_dict() for t in tracks]}

    await _run(connection, msg, go())


@websocket_api.websocket_command({vol.Required("type"): "audiomuse/radios", vol.Required("entry_id"): str})
@websocket_api.async_response
async def ws_radios(hass: HomeAssistant, connection, msg) -> None:
    """Saved AudioMuse-AI Radios."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            radios = await entry.runtime_data.client.get_radios()
        except AudioMuseError as err:
            raise HomeAssistantError(f"Could not load Radios: {err}") from err
        return {
            "radios": [
                {
                    "id": r.get("id"),
                    "name": r.get("name"),
                    "songs": r.get("n_results"),
                    "enabled": bool(r.get("enabled")),
                    "anchor_id": r.get("anchor_id"),
                    "temperature": r.get("temperature"),
                }
                for r in radios
            ]
        }

    await _run(connection, msg, go())


@websocket_api.websocket_command({vol.Required("type"): "audiomuse/run_radios", vol.Required("entry_id"): str})
@websocket_api.async_response
async def ws_run_radios(hass: HomeAssistant, connection, msg) -> None:
    """Create or refresh one playlist per enabled Radio."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            result = await entry.runtime_data.client.run_radios()
        except AudioMuseError as err:
            raise HomeAssistantError(f"Could not refresh Radios: {err}") from err
        return {
            "message": result.get("message"),
            "radios_enabled": result.get("radios_enabled"),
            "playlists_created": result.get("playlists_created"),
            "failed": list(result.get("failed") or []),
        }

    await _run(connection, msg, go())


@websocket_api.websocket_command({vol.Required("type"): "audiomuse/recent", vol.Optional("entry_id"): str})
@callback
def ws_recent(hass: HomeAssistant, connection, msg) -> None:
    """Playlists saved from Home Assistant, newest first."""
    recent = get_recent(hass)
    connection.send_result(msg["id"], {"items": recent.items(msg.get("entry_id")) if recent else []})


@websocket_api.websocket_command({vol.Required("type"): "audiomuse/recent_remove", vol.Required("item_id"): str})
@callback
def ws_recent_remove(hass: HomeAssistant, connection, msg) -> None:
    """Forget one recent item (the playlist stays on the music server)."""
    recent = get_recent(hass)
    connection.send_result(msg["id"], {"removed": bool(recent and recent.remove(msg["item_id"]))})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/search",
        vol.Required("entry_id"): str,
        vol.Required("query"): vol.All(cv.string, vol.Length(min=1, max=2000)),
        vol.Optional("count"): vol.All(vol.Coerce(int), vol.Range(min=MIN_COUNT, max=MAX_COUNT)),
    }
)
@websocket_api.async_response
async def ws_search(hass: HomeAssistant, connection, msg) -> None:
    """Songs for a description via text search (no AI; saving is a separate step)."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        result = await async_make_search(entry, msg["query"], msg.get("count"))
        return {"tracks": [t.as_dict() for t in result.tracks]}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/search_tracks",
        vol.Required("entry_id"): str,
        vol.Required("query"): vol.All(cv.string, vol.Length(min=1, max=200)),
    }
)
@websocket_api.async_response
async def ws_search_tracks(hass: HomeAssistant, connection, msg) -> None:
    """Songs in the analysed library matching a title, artist or album."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            tracks = await entry.runtime_data.client.search_tracks(msg["query"])
        except AudioMuseError as err:
            raise HomeAssistantError(f"Song search failed: {err}") from err
        return {"tracks": [t.as_dict() for t in tracks]}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/similar_tracks",
        vol.Required("entry_id"): str,
        vol.Exclusive("item_id", "seed"): cv.string,
        vol.Exclusive("anchor_id", "seed"): vol.Coerce(int),
        vol.Optional("count", default=25): vol.All(vol.Coerce(int), vol.Range(min=MIN_COUNT, max=MAX_COUNT)),
        vol.Optional("limit_per_artist", default=True): cv.boolean,
        vol.Optional("radius_similarity", default=True): cv.boolean,
    }
)
@websocket_api.async_response
async def ws_similar_tracks(hass: HomeAssistant, connection, msg) -> None:
    """Playlist from Similar Song: songs like one song or a saved anchor."""

    async def go():
        if not msg.get("item_id") and msg.get("anchor_id") is None:
            raise HomeAssistantError("Pick a song or an anchor first")
        entry = _entry(hass, msg["entry_id"])
        try:
            tracks = await entry.runtime_data.client.similar_tracks(
                item_id=msg.get("item_id"),
                anchor_id=msg.get("anchor_id"),
                count=msg["count"],
                limit_per_artist=msg["limit_per_artist"],
                radius_similarity=msg["radius_similarity"],
            )
        except AudioMuseError as err:
            raise HomeAssistantError(f"Similar songs failed: {err}") from err
        return {"tracks": [t.as_dict() for t in tracks]}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/anchors",
        vol.Required("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_anchors(hass: HomeAssistant, connection, msg) -> None:
    """Saved Song Alchemy anchors (id and name)."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            anchors = await entry.runtime_data.client.get_anchors()
        except AudioMuseError as err:
            raise HomeAssistantError(f"Loading anchors failed: {err}") from err
        return {"anchors": anchors}

    await _run(connection, msg, go())


_PATH_END = vol.Schema(
    {
        vol.Required("type"): vol.In(["song", "mood", "anchor"]),
        vol.Required("id"): vol.Any(cv.string, vol.Coerce(int)),
    }
)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/find_path",
        vol.Required("entry_id"): str,
        vol.Required("start"): _PATH_END,
        vol.Required("end"): _PATH_END,
        vol.Optional("count", default=25): vol.All(vol.Coerce(int), vol.Range(min=MIN_COUNT, max=MAX_COUNT)),
        vol.Optional("exact", default=True): cv.boolean,
        vol.Optional("lyrics", default=False): cv.boolean,
    }
)
@websocket_api.async_response
async def ws_find_path(hass: HomeAssistant, connection, msg) -> None:
    """Song Path: songs moving gradually from a start (song, mood or anchor) to an end."""

    def side(end: dict[str, Any], kind: str) -> Any:
        if end["type"] != kind:
            return None
        return int(end["id"]) if kind == "anchor" else str(end["id"])

    async def go():
        entry = _entry(hass, msg["entry_id"])
        start, end = msg["start"], msg["end"]
        try:
            tracks = await entry.runtime_data.client.find_path(
                start_song=side(start, "song"),
                start_mood=side(start, "mood"),
                start_anchor=side(start, "anchor"),
                end_song=side(end, "song"),
                end_mood=side(end, "mood"),
                end_anchor=side(end, "anchor"),
                count=msg["count"],
                exact=msg["exact"],
                lyrics=msg["lyrics"],
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err
        except AudioMuseError as err:
            raise HomeAssistantError(f"Song Path failed: {err}") from err
        return {"tracks": [t.as_dict() for t in tracks]}

    await _run(connection, msg, go())


# Song Alchemy blends kept in memory so "Save Anchor" can send AudioMuse-AI the
# full blend without the page holding hundreds of numbers. Last few only.
_BLENDS = "audiomuse_alchemy_blends"
_MAX_BLENDS = 10


def _keep_blend(hass: HomeAssistant, entry_id: str, blend: dict[str, Any]) -> str:
    blends: OrderedDict[str, tuple[str, dict[str, Any]]] = hass.data.setdefault(_BLENDS, OrderedDict())
    blend_id = secrets.token_hex(8)
    blends[blend_id] = (entry_id, blend)
    while len(blends) > _MAX_BLENDS:
        blends.popitem(last=False)
    return blend_id


_ALCHEMY_ITEM = vol.Schema(
    {
        vol.Required("type"): vol.In(["song", "artist"]),
        vol.Required("id"): cv.string,
        vol.Required("op"): vol.In(["include", "exclude"]),
    }
)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/alchemy",
        vol.Required("entry_id"): str,
        vol.Required("items"): vol.All([_ALCHEMY_ITEM], vol.Length(min=1, max=50)),
        vol.Optional("count", default=25): vol.All(vol.Coerce(int), vol.Range(min=MIN_COUNT, max=MAX_COUNT)),
        vol.Optional("temperature", default=1.0): vol.All(vol.Coerce(float), vol.Range(min=0, max=10)),
        vol.Optional("subtract_distance"): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=0))),
    }
)
@websocket_api.async_response
async def ws_alchemy(hass: HomeAssistant, connection, msg) -> None:
    """Song Alchemy: blend songs/artists to include and exclude into a playlist."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        items = [
            {"type": i["type"], "id": i["id"], "op": "ADD" if i["op"] == "include" else "SUBTRACT"}
            for i in msg["items"]
        ]
        try:
            result = await entry.runtime_data.client.alchemy(
                items,
                count=msg["count"],
                temperature=msg["temperature"],
                subtract_distance=msg.get("subtract_distance"),
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err
        except AudioMuseError as err:
            raise HomeAssistantError(f"Song Alchemy failed: {err}") from err
        blend_id = _keep_blend(hass, entry.entry_id, result.blend) if result.blend.get("centroid") else None
        return {"tracks": [t.as_dict() for t in result.tracks], "blend_id": blend_id, "removed": result.removed}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/save_anchor",
        vol.Required("entry_id"): str,
        vol.Required("blend_id"): str,
        vol.Required("name"): vol.All(cv.string, vol.Length(min=1, max=100)),
    }
)
@websocket_api.async_response
async def ws_save_anchor(hass: HomeAssistant, connection, msg) -> None:
    """Save the blend from a Song Alchemy run as a named anchor."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        kept = hass.data.get(_BLENDS, {}).get(msg["blend_id"])
        if not kept or kept[0] != entry.entry_id:
            raise HomeAssistantError("That Alchemy result has expired. Run Alchemy again, then save the anchor.")
        try:
            anchor = await entry.runtime_data.client.save_anchor(msg["name"].strip(), kept[1])
        except AudioMuseError as err:
            raise HomeAssistantError(f"Saving the anchor failed: {err}") from err
        return {"anchor": anchor}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/rename_anchor",
        vol.Required("entry_id"): str,
        vol.Required("anchor_id"): vol.Coerce(int),
        vol.Required("name"): vol.All(cv.string, vol.Length(min=1, max=100)),
    }
)
@websocket_api.async_response
async def ws_rename_anchor(hass: HomeAssistant, connection, msg) -> None:
    """Rename a saved anchor."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            await entry.runtime_data.client.rename_anchor(msg["anchor_id"], msg["name"].strip())
        except AudioMuseError as err:
            raise HomeAssistantError(f"Renaming the anchor failed: {err}") from err
        return {}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/delete_anchor",
        vol.Required("entry_id"): str,
        vol.Required("anchor_id"): vol.Coerce(int),
    }
)
@websocket_api.async_response
async def ws_delete_anchor(hass: HomeAssistant, connection, msg) -> None:
    """Delete a saved anchor (AudioMuse-AI also deletes its Radio)."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            await entry.runtime_data.client.delete_anchor(msg["anchor_id"])
        except AudioMuseError as err:
            raise HomeAssistantError(f"Deleting the anchor failed: {err}") from err
        return {}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/add_radio",
        vol.Required("entry_id"): str,
        vol.Required("anchor_id"): vol.Coerce(int),
        vol.Optional("temperature", default=1.0): vol.All(vol.Coerce(float), vol.Range(min=0, max=10)),
        vol.Optional("songs", default=50): vol.All(vol.Coerce(int), vol.Range(min=1, max=MAX_COUNT)),
        vol.Optional("enabled", default=True): cv.boolean,
    }
)
@websocket_api.async_response
async def ws_add_radio(hass: HomeAssistant, connection, msg) -> None:
    """Make a Radio from a saved anchor."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            await entry.runtime_data.client.add_radio(
                msg["anchor_id"], temperature=msg["temperature"], songs=msg["songs"], enabled=msg["enabled"]
            )
        except AudioMuseError as err:
            raise HomeAssistantError(f"Adding the Radio failed: {err}") from err
        return {}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/update_radio",
        vol.Required("entry_id"): str,
        vol.Required("radio_id"): vol.Coerce(int),
        vol.Optional("temperature"): vol.All(vol.Coerce(float), vol.Range(min=0, max=10)),
        vol.Optional("songs"): vol.All(vol.Coerce(int), vol.Range(min=1, max=MAX_COUNT)),
        vol.Optional("enabled"): cv.boolean,
    }
)
@websocket_api.async_response
async def ws_update_radio(hass: HomeAssistant, connection, msg) -> None:
    """Change a Radio's temperature, number of songs or on/off state."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            await entry.runtime_data.client.update_radio(
                msg["radio_id"],
                temperature=msg.get("temperature"),
                songs=msg.get("songs"),
                enabled=msg.get("enabled"),
            )
        except AudioMuseError as err:
            raise HomeAssistantError(f"Changing the Radio failed: {err}") from err
        return {}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/delete_radio",
        vol.Required("entry_id"): str,
        vol.Required("radio_id"): vol.Coerce(int),
    }
)
@websocket_api.async_response
async def ws_delete_radio(hass: HomeAssistant, connection, msg) -> None:
    """Delete a Radio (its anchor is kept)."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            await entry.runtime_data.client.delete_radio(msg["radio_id"])
        except AudioMuseError as err:
            raise HomeAssistantError(f"Deleting the Radio failed: {err}") from err
        return {}

    await _run(connection, msg, go())


@websocket_api.websocket_command({vol.Required("type"): "audiomuse/lyrics_axes", vol.Required("entry_id"): str})
@websocket_api.async_response
async def ws_lyrics_axes(hass: HomeAssistant, connection, msg) -> None:
    """Lyrics Search "By Axis" choices."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            axes = await entry.runtime_data.client.lyrics_axes()
        except AudioMuseError as err:
            raise HomeAssistantError(f"Could not load lyrics choices: {err}") from err
        return {"axes": axes}

    await _run(connection, msg, go())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/lyrics_search",
        vol.Required("entry_id"): str,
        vol.Exclusive("targets", "way"): {cv.string: cv.string},
        vol.Exclusive("query", "way"): vol.All(cv.string, vol.Length(min=1, max=2000)),
        vol.Exclusive("item_id", "way"): cv.string,
        vol.Optional("count", default=25): vol.All(vol.Coerce(int), vol.Range(min=MIN_COUNT, max=MAX_COUNT)),
    }
)
@websocket_api.async_response
async def ws_lyrics_search(hass: HomeAssistant, connection, msg) -> None:
    """Lyrics Search: by axis choices, by a description, or from a song."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        client = entry.runtime_data.client
        try:
            if "targets" in msg:
                tracks = await client.lyrics_by_axes(msg["targets"], count=msg["count"])
            elif "query" in msg:
                tracks = await client.lyrics_by_text(msg["query"], count=msg["count"])
            elif "item_id" in msg:
                tracks = await client.lyrics_by_song(msg["item_id"], count=msg["count"])
            else:
                raise HomeAssistantError("Pick axis values, type a description, or pick a song")
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err
        except AudioMuseError as err:
            raise HomeAssistantError(f"Lyrics search failed: {err}") from err
        return {"tracks": [t.as_dict() for t in tracks]}

    await _run(connection, msg, go())


@websocket_api.websocket_command({vol.Required("type"): "audiomuse/album_concepts", vol.Required("entry_id"): str})
@websocket_api.async_response
async def ws_album_concepts(hass: HomeAssistant, connection, msg) -> None:
    """Concepts for Album Creation's "Refine with concepts"."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            return await entry.runtime_data.client.album_concepts()
        except AudioMuseError as err:
            raise HomeAssistantError(f"Could not load concepts: {err}") from err

    await _run(connection, msg, go())


_STEER = vol.Schema(
    {
        vol.Required("term"): cv.string,
        vol.Optional("direction", default="more"): vol.In(["more", "less"]),
        vol.Optional("weight", default=3.0): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
    }
)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "audiomuse/album",
        vol.Required("entry_id"): str,
        vol.Exclusive("item_id", "seed"): cv.string,
        vol.Exclusive("query", "seed"): vol.All(cv.string, vol.Length(min=1, max=500)),
        vol.Optional("steering"): vol.All([_STEER], vol.Length(max=20)),
    }
)
@websocket_api.async_response
async def ws_album(hass: HomeAssistant, connection, msg) -> None:
    """Album Creation: an album-length playlist in album order, from a song or a description."""

    async def go():
        entry = _entry(hass, msg["entry_id"])
        try:
            album = await entry.runtime_data.client.create_album(
                item_id=msg.get("item_id"), query=msg.get("query"), steering=msg.get("steering")
            )
        except ValueError as err:
            raise HomeAssistantError(str(err)) from err
        except AudioMuseError as err:
            raise HomeAssistantError(f"Album Creation failed: {err}") from err
        return {"tracks": [t.as_dict() for t in album.tracks], "stats": album.stats, "name": album.name}

    await _run(connection, msg, go())
