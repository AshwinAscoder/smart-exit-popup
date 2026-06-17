import "@shopify/shopify-app-react-router/adapters/node";
import "./env.server";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./prisma.server";

export const PREMIUM_PLAN = "Premium Plan";
const AUTH_PATH_PREFIX = "/auth";
const PRODUCTION_APP_URL = "https://smart-exit-popup.onrender.com";

function normalizeAppUrl(url) {
  const appUrl = new URL(url);

  appUrl.pathname = "";
  appUrl.search = "";
  appUrl.hash = "";

  return appUrl.toString().replace(/\/$/, "");
}

function resolveAppUrl() {
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_APP_URL;
  }

  const configuredAppUrl = process.env.SHOPIFY_APP_URL?.trim();

  if (!configuredAppUrl) {
    return "";
  }

  return normalizeAppUrl(configuredAppUrl);
}

function normalizeShopDomain(domain) {
  const trimmedDomain = domain?.trim();

  if (!trimmedDomain) {
    return null;
  }

  if (!trimmedDomain.includes("://")) {
    return trimmedDomain.replace(/\/+$/, "");
  }

  return new URL(trimmedDomain).hostname;
}

const appUrl = resolveAppUrl();
const customShopDomain = normalizeShopDomain(process.env.SHOP_CUSTOM_DOMAIN);

export function shouldEnforceBilling() {
  return process.env.NODE_ENV === "production";
}

export function getFreePopupLimit() {
  const freePopupLimit = Number.parseInt(
    process.env.FREE_POPUP_LIMIT || "0",
    10,
  );

  return Number.isFinite(freePopupLimit) ? freePopupLimit : 0;
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl,
  authPathPrefix: AUTH_PATH_PREFIX,
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: {
    "Premium Plan": {
      lineItems: [
        {
          amount: 9.99,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
  },
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(customShopDomain ? { customShopDomains: [customShopDomain] } : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
