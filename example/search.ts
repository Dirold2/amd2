import "dotenv/config";
import { APMApi } from "../src/index.js";

const api = new APMApi();

(async () => {
  const results = await api.search("Daft Punk", {
    storefront: "ru",
    limit: 10,
  });

  console.log(results);
})();
