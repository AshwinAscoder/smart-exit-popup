import "dotenv/config";

const REQUIRED_PRODUCTION_ENV_VARS = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_APP_URL",
  "MONGODB_URI",
];

function isBlank(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

export function validateProductionEnv() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing = REQUIRED_PRODUCTION_ENV_VARS.filter((key) =>
    isBlank(process.env[key]),
  );

  if (missing.length > 0) {
    throw new Error(
      `[startup] Missing required production environment variable(s): ${missing.join(
        ", ",
      )}. Configure them before starting the Shopify app.`,
    );
  }
}

validateProductionEnv();
