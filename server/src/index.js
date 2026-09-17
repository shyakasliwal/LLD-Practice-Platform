const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { createApp } = require("./app");
const { connectDb } = require("./db");

const port = Number(process.env.PORT || 5000);

async function main() {
  try {
    await connectDb();
  } catch (err) {
    console.warn(`Atlas/Mongo connection failed (${err.message}). Starting in-memory Mongo for local demo.`);
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mem = await MongoMemoryServer.create();
    await connectDb(mem.getUri("lld_practice"));
  }
  const app = createApp();
  app.listen(port, () => {
    console.log(`LLD Practice API listening on http://127.0.0.1:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
