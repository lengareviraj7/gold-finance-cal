import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "siddheshwar_jewelers";

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Please configure it in your environment."
    );
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!clientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

let indexesEnsured = false;

export async function getDatabase(): Promise<Db> {
  const connectedClient = await getMongoClientPromise();
  const db = connectedClient.db(dbName);

  if (!indexesEnsured) {
    try {
      const collection = db.collection("mortgage_calculation_history");
      await collection.createIndex({ createdAt: -1 });
      indexesEnsured = true;
    } catch (err) {
      // Non-fatal if index already exists or background index in progress
      console.warn("Could not ensure MongoDB index on createdAt:", err);
    }
  }

  return db;
}
