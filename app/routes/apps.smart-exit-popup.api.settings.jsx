import connectDB, { Setting } from "../db.server";
import { authenticate } from "../shopify.server";

const defaultSettings = {
  popupHeading: "Wait! Don't Go! Get 10% Off Now!",
  discountCode: "SAVE10",
  buttonBackgroundColor: "#008060",
  isEnabled: false,
};

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...init.headers,
    },
  });
}

function normalizeShop(shop) {
  if (!shop || typeof shop !== "string") return null;

  const normalizedShop = shop.trim().toLowerCase();
  const isValidShopDomain = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(
    normalizedShop,
  );

  return isValidShopDomain ? normalizedShop : null;
}

function serializeSettings(shop, settings) {
  return {
    ok: true,
    shop,
    popupHeading: settings?.popupHeading || defaultSettings.popupHeading,
    discountCode: settings?.discountCode || defaultSettings.discountCode,
    buttonBackgroundColor:
      settings?.buttonBackgroundColor ||
      defaultSettings.buttonBackgroundColor,
    isEnabled: settings?.isEnabled ?? defaultSettings.isEnabled,
  };
}

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const { session } = await authenticate.public.appProxy(request);
    const shop = normalizeShop(session?.shop || url.searchParams.get("shop"));

    if (!shop) {
      return jsonResponse(
        {
          ok: false,
          isEnabled: false,
          message: "Missing or invalid shop domain.",
        },
        { status: 400 },
      );
    }

    await connectDB();

    const settings = await Setting.findOne({ shop }).lean();

    return jsonResponse(serializeSettings(shop, settings));
  } catch (error) {
    console.error("Failed to load app proxy popup settings:", error);

    return jsonResponse(
      {
        ok: false,
        isEnabled: false,
        message: "Unable to load popup settings.",
      },
      { status: 500 },
    );
  }
};
