import "dotenv/config";
import { APMApi } from "../src/index.js";

const api = new APMApi();

(async () => {
  const trackUrl = "https://music.apple.com/ru/song/on-on/1807345148";
  const track = await api.getTrack(trackUrl);

  console.log(track);
})();
