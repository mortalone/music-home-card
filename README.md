# Music Home 0.2.0

A Spotify-inspired, cover-first Lovelace card for the family's everyday music view. Independent of Party Mode, Party Guest and AI DJ. Keeps the official Music Assistant and uses the signed-in HA connection: the basic library/search/player requires no MA URL, token, new add-on or frontend build tools. The optional AI DJ and MA recommendation feeds use server-side HA REST commands.

- Home: eight compact shortcuts plus cover rails for playlists, albums, favorite tracks and favorite radio stations.
- Search: debounced global MA search across the connected providers, with covers and track rows.
- Library: playlist / album / artist / favorites / radio / podcast / audiobook tabs; list or cover grid and pagination.
- Collections: inspect tracks without starting playback. **Spil** replaces the queue with the selected collection, **Som næste** inserts next, and **Tilføj til kø** appends. Tapping an individual track starts it via MA's `play` queue option; the adjacent + appends it.
- Mini player: previous / pause / next, selected MA speaker state and optional volume slider.
- Optional **Åbn Spotify-app** link for Kiosk Satellite's `app://com.spotify.music` scheme. Requires a host version supporting app links and an installed/allowed Spotify app. It launches Spotify; it does not select an output or log in. In ordinary browsers keep this option off.

This reproduces a familiar layout, not Spotify's private recommendation data, daily mixes, personal account selector or playlist editor. Content is the library and search exposed by MA. It does not manufacture recommendations or change playback on startup.

## Install with HACS

1. In **HACS → menu → Custom repositories**, add `https://github.com/mortalone/music-home-card` with type **Dashboard** (older HACS: **Lovelace**).
2. Find **Music Home** in HACS and download it. Reload the browser. For a normal storage-mode dashboard, HACS manages the JavaScript resource. If you manage resources in YAML, add `{url: /hacsfiles/music-home-card/music-home-card.js, type: module}`. If you previously installed the manual `/local/music-home-card.js` resource, remove that resource to avoid loading the card twice.
3. Reload the dashboard. Add **Music Home** from the card picker. Choose **Music Assistant's** media_player for Stueetagen, not the original Sonos entity. The visual editor supplies a filtered entity picker. No exact entity ID is assumed.
4. For the full-screen version, create a new dashboard/view and use `dashboard.yaml` as a starting point. Replace the example `media_player.stueetagen` with the actual MA entity. This is an example, not a claim that this entity exists.
5. Open the new view on the tablet and set that view's URL as the Kiosk start/home page. Keep the existing dashboard and Party Mode available separately. Selecting this dashboard as the HA user's default is also possible; this download does not change either setting automatically.

```yaml
type: custom:music-home-card
entity: media_player.stueetagen  # example: replace with your MA entity
name: Musik i huset
start_view: home               # home, library or search
spotify_app: false             # enable only in Kiosk Satellite
height: calc(100dvh - 64px)     # use e.g. 850px for a card in a regular view
```

The HA **Music Assistant integration** must expose `music_assistant.get_library`, `music_assistant.search` and `music_assistant.play_media`. Verified against Home Assistant 2026.10.0 source. Installing only the MA add-on does not add these HA actions. The card resolves the integration config entry from the selected entity; optional `config_entry_id` can be supplied explicitly for unusual setups. Normal HA permissions still apply.

## Behavior and performance

The player follows HA push updates. Library results are bounded, cached for 60 seconds and refreshed with the refresh button; there is no periodic background library polling. Covers load lazily, missing artwork falls back to a colored tile, and HA push updates do not replace the search field or interrupt scrolling. The full-screen panel has one vertical content scroll surface plus horizontal cover rails. No iframe, embedded MA application, animation loop or AI processing is used.

Cover URLs come from MA. On the local HTTP dashboard they can load directly; on a remote HTTPS dashboard, HTTP-only MA image URLs may be blocked as mixed content. A secure reachable MA image endpoint is required there. The miniplayer can use HA's own player image proxy.

## Verification

Playwright checks authenticated request shapes, read-only startup, navigation, next/add/replace queue placement, artist metadata with null lists, search debounce and stale replies, HTML escaping, pause/volume, reconfiguration, error recovery and portrait / landscape / phone layouts. The tests use mock HA and MA and do not verify the user's live library, Android app launch or speakers. Preview covers and music metadata are demonstration fixtures, not the user's library.

Primary API references: [HA MA services](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/music_assistant/services.py), [response schemas](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/music_assistant/schemas.py), [browse implementation](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/music_assistant/media_browser.py).

## Manual installation

Copy `music-home-card.js` to `/config/www/` and register `/local/music-home-card.js?v=0.2.0` as a JavaScript module. Use either the manual resource or the HACS resource, not both.

## Development

`music-home-card.js` is the source and the deployable single-file card. Browser fixtures are in `tests/`. GitHub Actions checks syntax and runs the browser tests before publishing `v0.2.0`. Future card versions are released separately from Party Mode.

## AI DJ and Music Assistant recommendations (optional)

1. Copy `music_home_bridge.yaml` into `/config/packages/` (create the folder). If packages are not enabled, merge `packages: !include_dir_named packages` into the existing `homeassistant:` section in `configuration.yaml`. Do not create a second `homeassistant:` key. Alternatively merge the `rest_command:` entries into your existing configuration.
2. Add the entries from `secrets.example.yaml` to `/config/secrets.yaml`. `music_home_ai_authorization` is `Bearer ` followed by Party AI DJ's **api_token**, not its Music Assistant token. The MA authorization entry uses an MA API token with library read permission. The hostname in the package is Jacob's internal add-on hostname; other installations must change it. This is an API URL, never an HA `/app/` ingress page. HA Core must be able to reach that address.
3. Validate HA configuration and restart HA (or reload REST commands after the first installation). Remove the AI commands if you only want MA recommendations, or the recommendation commands if you only want AI. Neither feature requires the other.
4. In the card editor enable **AI DJ-søgning**, or add `ai_dj: true` to the card YAML. The search page offers **Søg musik** and **AI DJ**. AI requires an explicit press on **Find med AI DJ** or Enter; typing does not generate requests. Results are matched by the existing AI DJ add-on and are only suggestions. Selecting or adding a track uses the card's chosen MA speaker. No AI queue change occurs automatically.

The card calls HA's authenticated websocket connection; tokens remain in HA secrets. No browser CORS or local HTTP API access is needed, including on a remote HTTPS HA dashboard. The existing cover URL limitations still apply. AI needs the installed and configured Party AI DJ; no add-on update is required for this card release. Leaving the search page stops polling stale jobs; the already started server job may finish.

Home adds recently added playlists/albums, favorite artists and a changing selection from favorite tracks using the MA library. With the optional MA bridge it also shows **Senest spillet** and up to eight real MA/provider recommendation rows (set `recommendation_rows: 1`–`16`). Titles/content come from MA and depend on provider support, history and permissions. Spotify's private app home feed is not reproduced or fabricated. A row can be absent or empty. Two recommendation requests run concurrently; results are cached for 60 seconds and refresh clears the cache. Cover rails show up to 20 items and **Se alle** shows up to 120 returned by that provider row.

**Favoritter** on Home opens all favorite categories, including albums, artists, playlists, tracks, radio, podcasts and audiobooks. Each overview rail has **Vis alle**; category pages filter favorite=true and support pagination.

The volume button at the top always shows the selected player's current percentage; tap it for a slider. The volume button beside the miniplayer opens the same control. Keep `height: 100dvh` for a kiosk with no HA header.
