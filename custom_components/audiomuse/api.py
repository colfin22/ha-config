"""Async client for the AudioMuse-AI HTTP API.

This module deliberately has no Home Assistant imports so it can be tested
on its own. Every method maps to one AudioMuse-AI endpoint.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import aiohttp

DEFAULT_TIMEOUT = 30
AI_TIMEOUT = 180
# The moods AudioMuse-AI accepts for a Song Path end (its /api/find_path).
PATH_MOODS = ("happy", "sad", "aggressive", "relaxed", "danceable")

_PLAYLIST_ID_RE = re.compile(r"with ID:\s*(\S+?)\.?\s*$")


class AudioMuseError(Exception):
    """Base error for the AudioMuse-AI client."""


class AudioMuseConnectionError(AudioMuseError):
    """AudioMuse-AI could not be reached or did not answer in time."""


class AudioMuseAuthError(AudioMuseError):
    """The API token was rejected."""


class AudioMuseResponseError(AudioMuseError):
    """AudioMuse-AI answered, but with an error or an unusable result."""

    def __init__(self, message: str, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


@dataclass(frozen=True)
class Track:
    """A song known to AudioMuse-AI and the music server."""

    item_id: str
    title: str
    artist: str
    album: str | None = None

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-friendly dict."""
        return {
            "item_id": self.item_id,
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
        }


@dataclass(frozen=True)
class Artist:
    """An artist match, optionally with a similarity divergence (lower = closer)."""

    name: str
    artist_id: str | None
    track_count: int | None = None
    divergence: float | None = None
    # (searched artist's song, this artist's song) from the closest component
    # match: the "why they're similar" example. Only filled when asked for.
    sounds_alike: tuple[str, str] | None = None

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-friendly dict."""
        return {
            "name": self.name,
            "artist_id": self.artist_id,
            "track_count": self.track_count,
            "divergence": self.divergence,
            "sounds_alike": (
                {"artist_song": self.sounds_alike[0], "similar_song": self.sounds_alike[1]}
                if self.sounds_alike
                else None
            ),
        }


@dataclass(frozen=True)
class AlchemyResult:
    """Song Alchemy songs, plus the blend needed to save it as an anchor.

    ``blend`` holds AudioMuse-AI's centroid and include/exclude points (lists of
    numbers). It is only sent back to AudioMuse-AI when saving an anchor.
    """

    tracks: list[Track]
    blend: dict[str, Any]
    # Songs AudioMuse-AI dropped for being too near an exclude ("filtered_out").
    removed: int = 0


@dataclass(frozen=True)
class MusicServer:
    """A music server configured in AudioMuse-AI (credentials are never kept)."""

    server_id: str
    name: str
    server_type: str
    is_default: bool


@dataclass(frozen=True)
class InstantPlaylist:
    """The result of an AI Instant Playlist request."""

    tracks: list[Track]
    message: str | None = None
    ai_provider: str | None = None
    ai_model: str | None = None
    executed_query: str | None = None


@dataclass(frozen=True)
class SavedPlaylist:
    """A playlist created on the music server."""

    playlist_id: str | None
    message: str


@dataclass(frozen=True)
class LyricsStats:
    """Whether AudioMuse-AI's lyrics analysis is enabled, and how many songs have it."""

    enabled: bool
    songs: int

    @property
    def available(self) -> bool:
        """Lyrics features are usable: enabled and at least one song analysed."""
        return self.enabled and self.songs > 0


# Text Search (CLAP) state has the same shape as the lyrics state.
ClapStats = LyricsStats


@dataclass(frozen=True)
class Album:
    """An Album Creation result: songs in album order, AudioMuse-AI's stats
    (tracks, minutes, artists, cohesion) and its suggested name."""

    tracks: list[Track]
    stats: dict[str, Any]
    name: str | None


@dataclass
class Summary:
    """The parts of the AudioMuse-AI dashboard summary we expose."""

    songs_analysed: int | None = None
    albums: int | None = None
    artists: int | None = None
    unanalysable: int | None = None
    busy_workers: int = 0
    workers: int = 0
    busy_task_types: list[str] = field(default_factory=list)
    queue_pending: int = 0
    queue_running: int = 0


def parse_version(value: str) -> tuple[int, ...]:
    """Parse 'v3.7.1' or '3.7.1-nvidia' into (3, 7, 1). Unknown parts are dropped."""
    parts: list[int] = []
    for piece in value.strip().lstrip("vV").split("."):
        match = re.match(r"\d+", piece)
        if not match:
            break
        parts.append(int(match.group()))
    return tuple(parts)


def parse_playlist_id(message: str) -> str | None:
    """Pull the playlist ID out of AudioMuse-AI's create-playlist message.

    AudioMuse-AI only returns the ID inside its message text, for example
    "Successfully created playlist 'X' on the media server with ID: abc123".
    """
    match = _PLAYLIST_ID_RE.search(message or "")
    return match.group(1) if match else None


def parse_summary(payload: dict[str, Any]) -> Summary:
    """Turn the /api/dashboard/summary payload into a Summary."""
    content = payload.get("content") or {}
    workers = payload.get("workers") or []
    busy = [w for w in workers if (w.get("state") or "").lower() == "busy"]
    backlog = payload.get("queue_backlog") or []
    return Summary(
        songs_analysed=content.get("total_songs"),
        albums=content.get("distinct_albums"),
        artists=content.get("distinct_artists"),
        unanalysable=content.get("unanalyzable_tracks"),
        busy_workers=len(busy),
        workers=len(workers),
        busy_task_types=sorted(
            {w["current_task_type"] for w in busy if w.get("current_task_type")}
        ),
        queue_pending=sum(int(q.get("pending_count") or 0) for q in backlog),
        queue_running=sum(int(q.get("running_count") or 0) for q in backlog),
    )


class AudioMuseClient:
    """Talk to one AudioMuse-AI server."""

    def __init__(
        self,
        session: aiohttp.ClientSession,
        url: str,
        token: str,
        *,
        request_timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self._session = session
        self._url = url.rstrip("/")
        self._token = token
        self._timeout = request_timeout

    @property
    def url(self) -> str:
        """The server URL, without a trailing slash."""
        return self._url

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        headers = {"Accept": "application/json"}
        if self._token:
            # Only needed when authentication is enabled in AudioMuse-AI.
            headers["Authorization"] = f"Bearer {self._token}"
        if params:
            params = {k: v for k, v in params.items() if v is not None}
        try:
            async with self._session.request(
                method,
                f"{self._url}{path}",
                params=params,
                json=json,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=timeout or self._timeout),
            ) as resp:
                if resp.status in (401, 403):
                    raise AudioMuseAuthError("AudioMuse-AI rejected the API token")
                try:
                    data = await resp.json(content_type=None)
                except (aiohttp.ContentTypeError, ValueError):
                    data = None
                if resp.status == 503:
                    raise AudioMuseResponseError(
                        "AudioMuse-AI isn't ready for this yet (it is still building its indexes after "
                        f"analysis): {_error_message(data, resp.status)}",
                        resp.status,
                    )
                if resp.status >= 400:
                    raise AudioMuseResponseError(_error_message(data, resp.status), resp.status)
                return data
        except AudioMuseError:
            raise
        except TimeoutError as err:
            raise AudioMuseConnectionError(f"AudioMuse-AI did not answer within the timeout ({path})") from err
        except aiohttp.ClientError as err:
            raise AudioMuseConnectionError(f"Cannot reach AudioMuse-AI: {err}") from err

    async def get_version(self) -> str:
        """Return the server version, e.g. 'v3.7.1'."""
        data = await self._request("GET", "/api/version")
        version = (data or {}).get("app_version")
        if not version:
            raise AudioMuseResponseError("AudioMuse-AI did not report a version")
        return str(version)

    async def get_summary(self) -> Summary:
        """Return library and worker statistics."""
        return parse_summary(await self._request("GET", "/api/dashboard/summary") or {})

    async def get_servers(self) -> list[MusicServer]:
        """Return the configured music servers (types only, never credentials)."""
        data = await self._request("GET", "/api/servers") or {}
        return [
            MusicServer(
                server_id=str(s.get("server_id", "")),
                name=str(s.get("name", "")),
                server_type=str(s.get("server_type", "")).lower(),
                is_default=bool(s.get("is_default")),
            )
            for s in data.get("servers") or []
        ]

    async def search_artists(self, query: str) -> list[Artist]:
        """Search the analysed library for artists by name."""
        data = await self._request("GET", "/api/search_artists", params={"query": query}) or []
        return [_artist(a) for a in data]

    async def similar_artists(
        self,
        artist: str | None = None,
        artist_id: str | None = None,
        count: int = 10,
        why: bool = False,
    ) -> list[Artist]:
        """Return artists that sound similar to the given one.

        With ``why`` AudioMuse-AI also returns which parts of their sound match,
        and each artist gets a ``sounds_alike`` pair of example songs.
        """
        if not artist and not artist_id:
            raise ValueError("artist or artist_id is required")
        params: dict[str, Any] = {"artist": artist, "artist_id": artist_id, "n": count}
        if why:
            params["include_component_matches"] = "true"
        data = await self._request("GET", "/api/similar_artists", params=params) or []
        return [_artist(a) for a in data]

    async def artist_tracks(
        self, artist: str | None = None, artist_id: str | None = None
    ) -> list[Track]:
        """Return the analysed tracks of one artist."""
        if not artist and not artist_id:
            raise ValueError("artist or artist_id is required")
        data = await self._request(
            "GET", "/api/artist_tracks", params={"artist": artist, "artist_id": artist_id}
        ) or []
        return [_track(t) for t in data]

    async def search_tracks(self, query: str) -> list[Track]:
        """Find songs in the analysed library by title, artist or album."""
        data = await self._request("GET", "/api/search_tracks", params={"search_query": query}) or []
        return [_track(t) for t in data] if isinstance(data, list) else []

    async def similar_tracks(
        self,
        item_id: str | None = None,
        anchor_id: int | None = None,
        count: int = 25,
        limit_per_artist: bool = True,
        radius_similarity: bool = True,
    ) -> list[Track]:
        """Songs that sound like one song, or like a saved anchor.

        ``limit_per_artist`` and ``radius_similarity`` are AudioMuse-AI's
        "Limit songs per artist" and "Radius Similarity" options (both on by
        default, as on its own page).
        """
        if not item_id and anchor_id is None:
            raise ValueError("item_id or anchor_id is required")
        params: dict[str, Any] = {
            "n": count,
            "eliminate_duplicates": "true" if limit_per_artist else "false",
            "radius_similarity": "true" if radius_similarity else "false",
        }
        if item_id:
            params["item_id"] = item_id
        else:
            params["anchor_id"] = anchor_id
        data = await self._request("GET", "/api/similar_tracks", params=params) or []
        return [_track(t) for t in data] if isinstance(data, list) else []

    async def find_path(
        self,
        start_song: str | None = None,
        start_mood: str | None = None,
        start_anchor: int | None = None,
        end_song: str | None = None,
        end_mood: str | None = None,
        end_anchor: int | None = None,
        count: int = 25,
        exact: bool = True,
        lyrics: bool = False,
    ) -> list[Track]:
        """Song Path: a playlist that moves gradually from a start to an end.

        Each end is a song, a mood or a saved anchor, with AudioMuse-AI's own
        rules: only one end may be a mood or an anchor, and a lyrics path
        (``lyrics``) needs a song at both ends.
        """
        starts = [x for x in (start_song, start_mood, start_anchor) if x not in (None, "")]
        ends = [x for x in (end_song, end_mood, end_anchor) if x not in (None, "")]
        if len(starts) != 1 or len(ends) != 1:
            raise ValueError("Pick one start and one end")
        if (start_mood or start_anchor is not None) and (end_mood or end_anchor is not None):
            raise ValueError("Only one end can be a mood or anchor; make the other a song")
        if lyrics and not (start_song and end_song):
            raise ValueError("A lyrics path needs a song at both ends")
        for mood in (start_mood, end_mood):
            if mood and mood not in PATH_MOODS:
                raise ValueError(f"Unknown mood {mood!r}; use one of {', '.join(PATH_MOODS)}")
        params: dict[str, Any] = {"max_steps": count, "path_fix_size": "true" if exact else "false"}
        for key, value in (
            ("start_song_id", start_song),
            ("start_mood", start_mood),
            ("start_anchor", start_anchor),
            ("end_song_id", end_song),
            ("end_mood", end_mood),
            ("end_anchor", end_anchor),
        ):
            if value not in (None, ""):
                params[key] = value
        if lyrics:
            params["path_space"] = "lyrics"
        data = await self._request("GET", "/api/find_path", params=params, timeout=AI_TIMEOUT) or {}
        return [_track(t) for t in data.get("path", [])] if isinstance(data, dict) else []

    async def alchemy(
        self,
        items: list[dict[str, Any]],
        count: int = 25,
        temperature: float = 1.0,
        subtract_distance: float | None = None,
    ) -> AlchemyResult:
        """Song Alchemy: blend songs and artists to include (op ADD) and exclude
        (op SUBTRACT) into a playlist. At least one include is required."""
        if not any(str(i.get("op", "")).upper() == "ADD" for i in items):
            raise ValueError("Add at least one song or artist to include")
        body: dict[str, Any] = {"items": items, "n": count, "temperature": temperature}
        if subtract_distance is not None:
            body["subtract_distance"] = subtract_distance
        data = await self._request("POST", "/api/alchemy", json=body, timeout=AI_TIMEOUT) or {}
        return AlchemyResult(
            tracks=[_track(t) for t in data.get("results") or []],
            blend={
                "centroid": data.get("add_centroid_vector"),
                "inclusions": data.get("inclusions") or [],
                "exclusions": data.get("exclusions") or [],
                "inclusions_embedding": data.get("inclusions_embedding"),
            },
            removed=len(data.get("filtered_out") or []),
        )

    async def save_anchor(self, name: str, blend: dict[str, Any]) -> dict[str, Any]:
        """Save a Song Alchemy blend as a named anchor; returns {"id", "name"}."""
        data = await self._request("POST", "/api/anchors", json={"name": name, **blend}) or {}
        anchor = data.get("anchor") or {}
        return {"id": anchor.get("id"), "name": anchor.get("name", name)}

    async def rename_anchor(self, anchor_id: int, name: str) -> None:
        """Rename a saved anchor."""
        await self._request("PUT", f"/api/anchors/{int(anchor_id)}", json={"name": name})

    async def delete_anchor(self, anchor_id: int) -> None:
        """Delete a saved anchor. AudioMuse-AI also deletes the Radio built on it."""
        await self._request("DELETE", f"/api/anchors/{int(anchor_id)}")

    async def add_radio(
        self, anchor_id: int, temperature: float = 1.0, songs: int = 50, enabled: bool = True
    ) -> None:
        """Make a Radio from an anchor (one Radio per anchor)."""
        await self._request(
            "POST",
            "/api/radios",
            json={"anchor_id": int(anchor_id), "temperature": temperature, "n_results": songs, "enabled": enabled},
        )

    async def update_radio(
        self,
        radio_id: int,
        temperature: float | None = None,
        songs: int | None = None,
        enabled: bool | None = None,
    ) -> None:
        """Change a Radio's temperature, number of songs or on/off state."""
        body: dict[str, Any] = {}
        if temperature is not None:
            body["temperature"] = temperature
        if songs is not None:
            body["n_results"] = songs
        if enabled is not None:
            body["enabled"] = enabled
        await self._request("PUT", f"/api/radios/{int(radio_id)}", json=body)

    async def delete_radio(self, radio_id: int) -> None:
        """Delete a Radio (its anchor is kept)."""
        await self._request("DELETE", f"/api/radios/{int(radio_id)}")

    async def lyrics_axes(self) -> list[dict[str, Any]]:
        """AudioMuse-AI's lyrics "axes" and their choices, with readable names.

        [{"id": "AXIS_3_EMOTIONAL_VALENCE", "name": "Emotional Valence",
          "description": ..., "labels": [{"id": "MELANCHOLIC", "name": "Melancholic",
          "description": ...}]}]
        """
        data = await self._request("GET", "/api/lyrics/axes") or {}
        axes = data.get("axes") or {}
        out = []
        for axis_id, axis in axes.items():
            if not isinstance(axis, dict):
                continue
            labels = axis.get("labels") or {}
            pairs = labels.items() if isinstance(labels, dict) else ((str(x), "") for x in labels)
            out.append(
                {
                    "id": axis_id,
                    "name": _axis_name(axis_id),
                    "description": str(axis.get("description") or ""),
                    "labels": [
                        {"id": str(k), "name": _readable(str(k)), "description": str(v or "")} for k, v in pairs
                    ],
                }
            )
        return out

    async def lyrics_by_axes(self, targets: dict[str, str], count: int = 25) -> list[Track]:
        """Songs whose lyrics match one chosen label on one or more axes."""
        targets = {k: v for k, v in targets.items() if v}
        if not targets:
            raise ValueError("Pick a value for at least one axis")
        data = await self._request(
            "POST", "/api/lyrics/search/axes", json={"targets": targets, "limit": count}, timeout=AI_TIMEOUT
        ) or {}
        return [_track(t) for t in data.get("results") or []]

    async def lyrics_by_text(self, query: str, count: int = 25) -> list[Track]:
        """Songs whose lyrics are about the description (by meaning, not exact words)."""
        data = await self._request(
            "POST", "/api/lyrics/search/text", json={"query": query, "limit": count}, timeout=AI_TIMEOUT
        ) or {}
        return [_track(t) for t in data.get("results") or []]

    async def lyrics_by_song(self, item_id: str, count: int = 25) -> list[Track]:
        """Songs with similar lyrics and a similar sound (the song itself comes first)."""
        data = await self._request(
            "POST", "/api/sem_grove/search", json={"item_id": item_id, "limit": count}, timeout=AI_TIMEOUT
        ) or {}
        return [_track(t) for t in data.get("results") or []]

    async def get_anchors(self) -> list[dict[str, Any]]:
        """Saved Song Alchemy anchors: [{"id": int, "name": str}]."""
        data = await self._request("GET", "/api/anchors") or {}
        return [
            {"id": a["id"], "name": str(a.get("name") or "")}
            for a in data.get("anchors", [])
            if isinstance(a, dict) and "id" in a
        ]

    async def playlist_ideas(self) -> list[str]:
        """Return AudioMuse-AI's suggested search prompts."""
        data = await self._request("GET", "/api/clap/top_queries") or {}
        return [str(q) for q in data.get("queries") or []]

    async def get_radios(self) -> list[dict[str, Any]]:
        """Return the saved Radios."""
        data = await self._request("GET", "/api/radios") or {}
        return list(data.get("radios") or [])

    async def run_radios(self) -> dict[str, Any]:
        """Create or refresh one music-server playlist per enabled Radio."""
        return await self._request("POST", "/api/radios/run", json={}, timeout=AI_TIMEOUT) or {}

    async def text_search(self, query: str, count: int) -> list[Track]:
        """Songs whose sound matches a text description (AudioMuse-AI text search, no AI)."""
        data = await self._request(
            "POST", "/api/clap/search", json={"query": query, "limit": count}, timeout=AI_TIMEOUT
        ) or {}
        tracks = [_track(t) for t in data.get("results") or [] if t.get("item_id")]
        if not tracks:
            raise AudioMuseResponseError("AudioMuse-AI found no songs for that description")
        return tracks

    async def get_lyrics_stats(self) -> LyricsStats:
        """Lyrics analysis state (/api/lyrics/stats)."""
        data = await self._request("GET", "/api/lyrics/stats") or {}
        return LyricsStats(
            enabled=bool(data.get("lyrics_enabled")),
            songs=int(data.get("song_count") or 0),
        )

    async def get_clap_stats(self) -> LyricsStats:
        """Text Search (CLAP) state (/api/clap/stats)."""
        data = await self._request("GET", "/api/clap/stats") or {}
        return LyricsStats(enabled=bool(data.get("clap_enabled")), songs=int(data.get("song_count") or 0))

    async def album_concepts(self) -> dict[str, Any]:
        """Concepts for Album Creation's "Refine with concepts", grouped by category."""
        data = await self._request("GET", "/api/clap/concepts") or {}
        return {
            "available": bool(data.get("available")),
            "steps": [float(x) for x in data.get("alpha_steps") or []],
            "default_weight": float(data.get("default_alpha") or 3.0),
            "max_terms": int(data.get("max_terms") or 10),
            "categories": [
                {
                    "id": str(c.get("category") or ""),
                    "label": str(c.get("label") or c.get("category") or ""),
                    "terms": [str(t["term"] if isinstance(t, dict) else t) for t in c.get("terms") or []],
                }
                for c in data.get("categories") or []
                if isinstance(c, dict)
            ],
        }

    async def create_album(
        self,
        item_id: str | None = None,
        query: str | None = None,
        steering: list[dict[str, Any]] | None = None,
    ) -> Album:
        """Album Creation from a song (``item_id``) or a description (``query``,
        optionally refined with concept ``steering``)."""
        if bool(item_id) == bool(query):
            raise ValueError("Start from either a song or a description")
        body: dict[str, Any] = (
            {"seed_type": "song", "item_id": item_id} if item_id else {"seed_type": "text", "query": query}
        )
        if query and steering:
            body["steering"] = steering
        data = await self._request("POST", "/api/album_creation/generate", json=body, timeout=AI_TIMEOUT) or {}
        stats = data.get("stats") or {}
        return Album(
            tracks=[_track(t) for t in data.get("tracks") or []],
            stats={k: stats.get(k) for k in ("tracks", "minutes", "artists", "cohesion")},
            name=data.get("suggested_name") or None,
        )

    async def get_ai_provider(self) -> str | None:
        """AudioMuse-AI's own default AI provider for Instant Playlist ('NONE' when not set up)."""
        data = await self._request("GET", "/chat/api/config_defaults") or {}
        provider = data.get("default_ai_provider")
        return str(provider).upper() if provider else None

    async def instant_playlist(
        self,
        prompt: str,
        count: int,
        *,
        ai_provider: str | None = None,
        ai_model: str | None = None,
        ai_server_url: str | None = None,
    ) -> InstantPlaylist:
        """Ask AudioMuse-AI's AI to pick songs for a natural-language request.

        Provider and model fall back to the AudioMuse-AI server's own settings
        when not given. The AI key always stays on the AudioMuse-AI server.
        """
        body: dict[str, Any] = {"userInput": prompt, "n": count}
        if ai_provider:
            body["ai_provider"] = ai_provider
        if ai_model:
            body["ai_model"] = ai_model
        if ai_server_url:
            body["openai_server_url"] = ai_server_url
        data = await self._request("POST", "/chat/api/chatPlaylist", json=body, timeout=AI_TIMEOUT) or {}
        result = data.get("response") or {}
        tracks = [_track(t) for t in result.get("query_results") or [] if t.get("item_id")]
        if not tracks:
            raise AudioMuseResponseError(
                result.get("message") or "AudioMuse-AI returned no songs for that request"
            )
        return InstantPlaylist(
            tracks=tracks,
            message=result.get("message"),
            ai_provider=result.get("ai_provider_used"),
            ai_model=result.get("ai_model_selected"),
            executed_query=result.get("executed_query"),
        )

    async def save_playlist(self, name: str, item_ids: list[str]) -> SavedPlaylist:
        """Create a playlist on the music server from song IDs."""
        if not item_ids:
            raise ValueError("item_ids must not be empty")
        data = await self._request(
            "POST",
            "/chat/api/create_playlist",
            json={"playlist_name": name, "item_ids": list(item_ids)},
        ) or {}
        message = str(data.get("message") or "")
        return SavedPlaylist(playlist_id=parse_playlist_id(message), message=message)


def _error_message(data: Any, status: int) -> str:
    if isinstance(data, dict):
        for key in ("message", "error", "reason"):
            value = data.get(key)
            if isinstance(value, str) and value:
                return value
            if isinstance(value, dict) and value.get("message"):
                return str(value["message"])
    return f"AudioMuse-AI returned HTTP {status}"


def _track(raw: dict[str, Any]) -> Track:
    return Track(
        item_id=str(raw.get("item_id", "")),
        title=str(raw.get("title") or ""),
        artist=str(raw.get("artist") or raw.get("author") or ""),
        album=raw.get("album") or None,
    )


def _readable(code: str) -> str:
    """SURREAL_ABSTRACT -> Surreal Abstract."""
    return " ".join(w.capitalize() for w in code.replace("-", "_").split("_") if w)


def _axis_name(axis_id: str) -> str:
    """AXIS_3_EMOTIONAL_VALENCE -> Emotional Valence."""
    parts = axis_id.split("_")
    if len(parts) > 2 and parts[0] == "AXIS" and parts[1].isdigit():
        parts = parts[2:]
    return _readable("_".join(parts))


def _sounds_alike(matches: Any) -> tuple[str, str] | None:
    """The closest component match as (searched artist's song, similar artist's song)."""
    if not isinstance(matches, list):
        return None
    for match in sorted(
        (m for m in matches if isinstance(m, dict)),
        key=lambda m: m.get("distance") if isinstance(m.get("distance"), (int, float)) else float("inf"),
    ):
        ours = match.get("artist1_representative_songs") or []
        theirs = match.get("artist2_representative_songs") or []
        if ours and theirs and ours[0].get("title") and theirs[0].get("title"):
            return (str(ours[0]["title"]), str(theirs[0]["title"]))
    return None


def _artist(raw: dict[str, Any]) -> Artist:
    divergence = raw.get("divergence")
    track_count = raw.get("track_count")
    return Artist(
        name=str(raw.get("artist") or raw.get("name") or ""),
        artist_id=raw.get("artist_id"),
        track_count=int(track_count) if track_count is not None else None,
        divergence=float(divergence) if divergence is not None else None,
        sounds_alike=_sounds_alike(raw.get("component_matches")),
    )
