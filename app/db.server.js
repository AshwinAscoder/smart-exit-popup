import "dotenv/config";
import mongoose from "mongoose";

const DEFAULT_DATABASE_NAME = "smart_popup";
const rawMongoUri = process.env.MONGODB_URI;

if (!rawMongoUri) {
  throw new Error(
    "MONGODB_URI is not loaded. Add MONGODB_URI to .env and restart the Shopify dev server.",
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

const mongoUri = getMongoUriWithDatabase(rawMongoUri);

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
