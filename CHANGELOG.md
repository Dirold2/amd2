# Changelog

## [1.0.2] (2026-10-29)

### Added

- `APMApi` client for reading public Apple Music pages without a developer token.
- Playlist support via `APMApi.getPlaylist(url)`.
- Album support via `APMApi.getAlbum(url)`.
- Track support via `APMApi.getTrack(url)`.
- Public Apple Music search via `APMApi.search(query, options)`, returning tracks and artists.
- URL normalization and HTML parsing helpers for playlists, albums, tracks, and search pages.
- Short-lived response caches and in-flight request deduplication for API methods.
- TypeScript models for playlists, albums, tracks, and search results.
- Runnable examples for tracks, albums, playlists, and search in `example/`.
