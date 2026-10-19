import "dotenv/config";
import { APMApi } from "../src/index.js";

const api = new APMApi();

(async () => {
  const playlistUrl = "https://music.apple.com/in/playlist/favourite-songs/pl.u-m6UNbABq39";
  const playlist = await api.getPlaylist(playlistUrl);

  console.log(playlist);
})();
