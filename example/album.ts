import "dotenv/config";
import { APMApi } from "../src/index.js";

const api = new APMApi();

(async () => {
  const albumUrl = "https://music.apple.com/ru/album/chemistry/1807345147";
  const album = await api.getAlbum(albumUrl);

  console.log(album);
})();
