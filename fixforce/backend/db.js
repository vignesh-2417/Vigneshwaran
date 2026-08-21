const { MongoClient } = require("mongodb");
const logger = require("./logger");

let client = null;
let db = null;

async function connect() {
  if (db) return db;

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fixforce";
  const dbName = process.env.MONGODB_DB_NAME || "fixforce";

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  await client.connect();
  db = client.db(dbName);

  // Create indexes
  await db.collection("analyses").createIndex({ createdAt: -1 });
  await db.collection("analyses").createIndex({ category: 1 });
  await db.collection("analyses").createIndex({ object: 1 });

  logger.info("MongoDB connected", { db: dbName });
  return db;
}

async function getDb() {
  if (!db) await connect();
  return db;
}

async function disconnect() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info("MongoDB disconnected");
  }
}

module.exports = { connect, getDb, disconnect };
