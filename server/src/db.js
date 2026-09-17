const dns = require("dns");
const mongoose = require("mongoose");

dns.setDefaultResultOrder("ipv4first");

async function connectDb(uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lld_practice") {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = { connectDb };
