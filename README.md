# apmd2

Utilities for reading public Apple Music playlist pages without an Apple Music developer token.

> This is an HTML scraper, not the official Apple Music API. Apple can change its page format or restrict access at any time. Do not use it for private playlists or user-library data.

## Install

```sh
npm install apmd2
```

## Import a public playlist

```ts
import { importAppleMusicPlaylist } from "apmd2";

const playlist = await importAppleMusicPlaylist(
  "https://music.apple.com/in/playlist/favourite-songs/pl.u-m6UNbABq39",
);

console.log(playlist.title);
console.log(playlist.tracks[0]);
// {
//   position: 1,
//   title: "We Are The People",
//   artist: "Empire Of The Sun",
//   album: "We Are The People (Reimagined) - EP",
//   durationMs: 272175,
//   appleId: "1803037506"
// }
```

The importer keeps the storefront from the URL (for example, `/in/` or `/us/`) but does not otherwise depend on a fixed country code. It removes query and fragment parameters before fetching.

## Get a public track

```ts
import { APMApi } from "apmd2";

const track = await new APMApi().getTrack(
  "https://music.apple.com/ru/song/on-on/1807345148",
);

console.log(track.title); // On & On
console.log(track.artists); // ["Chris Lake", "Yael Watchman"]
```

## Get a public album

```ts
import { APMApi } from "apmd2";

const album = await new APMApi().getAlbum(
  "https://music.apple.com/ru/album/chemistry/1807345147",
);

console.log(album.title); // Chemistry
console.log(album.tracks);
```

For tests or cached HTML, use `parseAppleMusicPlaylistHtml(html, sourceUrl)` directly. This avoids an HTTP request while returning the same `AppleMusicPlaylist` shape.

## Search tracks and artists

```ts
import { APMApi } from "apmd2";

const api = new APMApi();
const results = await api.search("Daft Punk", {
  storefront: "ru",
  limit: 10,
});

console.log(results.tracks);
console.log(results.artists);
```

`search` returns tracks and artists only. `storefront` defaults to `"ru"`; `limit` is independently applied to each result type and must be between 1 and 20.
