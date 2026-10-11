import { MongoClient, Db, ObjectId, Filter, Document } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "siddheshwar_jewelers";

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _inMemoryHistoryStore: Array<Record<string, unknown>> | undefined;
}

if (!global._inMemoryHistoryStore) {
  global._inMemoryHistoryStore = [];
}

export function getMongoClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Please configure it in your environment."
    );
  }

  const timeoutMs = process.env.NODE_ENV === "development" ? 2000 : 5000;

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: timeoutMs,
      });
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: timeoutMs,
      });
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

let indexesEnsured = false;

export async function getDatabase(): Promise<Db> {
  try {
    const connectedClient = await getMongoClientPromise();
    const db = connectedClient.db(dbName);

    if (!indexesEnsured) {
      try {
        const collection = db.collection("mortgage_calculation_history");
        await collection.createIndex({ createdAt: -1 });
        indexesEnsured = true;
      } catch (err) {
        console.warn("Could not ensure MongoDB index on createdAt:", err);
      }
    }

    return db;
  } catch (err) {
    // If running in development and local mongo isn't available, return in-memory proxy
    if (process.env.NODE_ENV === "development" && (!uri || uri.includes("localhost") || uri.includes("127.0.0.1"))) {
      return createInMemoryDbProxy();
    }
    throw err;
  }
}

function createInMemoryDbProxy(): Db {
  const store = global._inMemoryHistoryStore || [];

  const mockCollection = {
    find: (query: Filter<Document> = {}) => {
      let filtered = [...store];
      if (query._id && typeof query._id === "object" && "$lt" in query._id) {
        const targetId = (query._id as { $lt: ObjectId }).$lt.toString();
        const idx = filtered.findIndex((r) => (r._id as ObjectId).toString() === targetId);
        if (idx !== -1) {
          filtered = filtered.slice(idx + 1);
        }
      }
      return {
        sort: () => ({
          limit: (n: number) => ({
            toArray: async () => filtered.slice(0, n),
          }),
        }),
        toArray: async () => filtered,
      };
    },
    insertOne: async (doc: Record<string, unknown>) => {
      const docWithId = { ...doc, _id: new ObjectId() };
      store.unshift(docWithId);
      return { insertedId: docWithId._id, acknowledged: true };
    },
    deleteOne: async (query: { _id?: ObjectId | string }) => {
      const targetId = query._id?.toString();
      const initialLen = store.length;
      const remaining = store.filter((r) => (r._id as ObjectId).toString() !== targetId);
      global._inMemoryHistoryStore = remaining;
      return { deletedCount: initialLen - remaining.length, acknowledged: true };
    },
    createIndex: async () => "createdAt_-1",
  };

  return {
    collection: () => mockCollection,
  } as unknown as Db;
}
