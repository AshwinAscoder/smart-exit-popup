import "./env.server";
import mongoose from "mongoose";

const DEFAULT_DATABASE_NAME = "smart_popup";
const isProduction = process.env.NODE_ENV === "production";
const rawMongoUri = process.env.MONGODB_URI?.trim();

if (!rawMongoUri) {
  throw new Error(
    isProduction
      ? "[startup] Missing MONGODB_URI in production. Configure the Render environment variable before starting the app."
      : "MONGODB_URI is not loaded. Add MONGODB_URI to .env and restart the Shopify dev server.",
  );
}

if (
  isProduction &&
  /(^mongodb:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)|@(localhost|127\.0\.0\.1|0\.0\.0\.0))/i.test(
    rawMongoUri,
  )
) {
  throw new Error(
    "[startup] MONGODB_URI points to a local database host in production. Use a hosted MongoDB connection string.",
  );
}

function getMongoUriWithDatabase(uri) {
  const trimmedUri = uri.trim();
  const queryIndex = trimmedUri.indexOf("?");
  const baseUri =
    queryIndex === -1 ? trimmedUri : trimmedUri.slice(0, queryIndex);
  const queryString = queryIndex === -1 ? "" : trimmedUri.slice(queryIndex);
  const lastSlashIndex = baseUri.lastIndexOf("/");
  const databaseName =
    lastSlashIndex === -1 ? "" : baseUri.slice(lastSlashIndex + 1);

  if (databaseName) {
    return trimmedUri;
  }

  return `${baseUri}/${DEFAULT_DATABASE_NAME}${queryString}`;
}

const mongoUri = isProduction
  ? rawMongoUri
  : getMongoUriWithDatabase(rawMongoUri);

mongoose.set("strictQuery", false);

if (!global.mongooseConnectionCache) {
  global.mongooseConnectionCache = {
    connection: null,
    promise: null,
  };
}

const popupSettingsSchema = new mongoose.Schema(
  {
    shop: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    popupHeading: {
      type: String,
      required: true,
      trim: true,
    },
    discountCode: {
      type: String,
      required: true,
      trim: true,
    },
    buttonBackgroundColor: {
      type: String,
      required: true,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: "popupsettings",
    timestamps: true,
  },
);

export const Setting =
  mongoose.models.Setting || mongoose.model("Setting", popupSettingsSchema);

export const PopupSettings = Setting;

export default async function connectDB() {
  if (global.mongooseConnectionCache.connection) {
    return global.mongooseConnectionCache.connection;
  }

  if (!global.mongooseConnectionCache.promise) {
    global.mongooseConnectionCache.promise = mongoose
      .connect(mongoUri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .then((mongooseInstance) => {
        console.log("✅ MONGODB ATLAS CONNECTED SUCCESSFULLY", {
          database: mongooseInstance.connection.name,
          host: mongooseInstance.connection.host,
        });
        return mongooseInstance;
      })
      .catch((error) => {
        global.mongooseConnectionCache.promise = null;
        console.error("MongoDB Atlas connection failed:", error);
        throw error;
      });
  }

  global.mongooseConnectionCache.connection =
    await global.mongooseConnectionCache.promise;

  return global.mongooseConnectionCache.connection;
}
