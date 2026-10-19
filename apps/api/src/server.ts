import { app } from "./app.js";

const PORT = Number(process.env.PORT) || 4000;
const NODE_ENV = process.env.NODE_ENV ?? "development";

app.listen(PORT, () => {
  console.log(`[setu-api] Server running on http://localhost:${PORT} (${NODE_ENV})`);
});
