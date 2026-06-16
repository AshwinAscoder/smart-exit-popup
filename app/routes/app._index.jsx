import { useEffect, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import {
  AppProvider as PolarisAppProvider,
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  Form,
  FormLayout,
  InlineStack,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import connectDB, { PopupSettings } from "../db.server";
import { authenticate } from "../shopify.server";

const defaultSettings = {
  popupHeading: "Wait! Don't Go! Get 10% Off Now!",
  discountCode: "SAVE10",
  buttonBackgroundColor: "#008060",
  isEnabled: true,
};

function serializeSettings(settings) {
  return {
    popupHeading: settings?.popupHeading || defaultSettings.popupHeading,
    discountCode: settings?.discountCode || defaultSettings.discountCode,
    buttonBackgroundColor:
      settings?.buttonBackgroundColor || defaultSettings.buttonBackgroundColor,
    isEnabled: settings?.isEnabled ?? defaultSettings.isEnabled,
  };
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // Billing is disabled during local/private app development because Shopify
  // only allows Billing API calls for publicly distributed apps.
  // await billing.require({
  //   plans: ["Premium Plan"],
  //   onFailure: async () => billing.request({ plan: "Premium Plan" }),
  // });

  const shop = session.shop;

  await connectDB();

  const savedSettings = await PopupSettings.findOne({ shop }).lean();

  return {
    shop,
    settings: serializeSettings(savedSettings),
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const shop = session?.shop || formData.get("shop");

  const payload = {
    popupHeading: formData.get("popupHeading") || defaultSettings.popupHeading,
    discountCode: formData.get("discountCode") || defaultSettings.discountCode,
    buttonBackgroundColor:
      formData.get("buttonBackgroundColor") ||
      defaultSettings.buttonBackgroundColor,
    isEnabled: formData.get("isEnabled") === "true",
  };

  console.log("Action Received Data:", payload);
  console.log("Action Resolved Shop:", shop);

  if (!shop) {
    console.error("Popup settings save blocked: missing shop domain.");

    return {
      ok: false,
      message: "Unable to save settings because the shop domain is missing.",
      settings: payload,
    };
  }

  try {
    await connectDB();

    const savedSettings = await PopupSettings.findOneAndUpdate(
      { shop },
      {
        $set: {
          shop,
          ...payload,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    console.log("Popup settings persisted:", {
      id: savedSettings._id.toString(),
      shop: savedSettings.shop,
      collection: PopupSettings.collection.name,
    });

    return {
      ok: true,
      message: "Smart Exit Popup settings saved successfully.",
      settings: serializeSettings(savedSettings),
    };
  } catch (error) {
    console.error("Failed to save Smart Exit Popup settings:", error);

    return {
      ok: false,
      message: "Unable to save settings. Please check the server logs.",
      settings: payload,
    };
  }
};

export default function Index() {
  const { shop, settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();

  const [popupHeading, setPopupHeading] = useState(settings.popupHeading);
  const [discountCode, setDiscountCode] = useState(settings.discountCode);
  const [buttonBackgroundColor, setButtonBackgroundColor] = useState(
    settings.buttonBackgroundColor,
  );
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled);

  const isSaving = navigation.state === "submitting";

  useEffect(() => {
    if (!actionData?.message) return;

    if (actionData.ok && shopify?.toast?.show) {
      shopify.toast.show(actionData.message);
    } else {
      window.alert(actionData.message);
    }
  }, [actionData, shopify]);

  const handleSave = (event) => {
    event?.preventDefault?.();

    const formData = new FormData();

    formData.append("popupHeading", popupHeading);
    formData.append("discountCode", discountCode);
    formData.append("buttonBackgroundColor", buttonBackgroundColor);
    formData.append("isEnabled", String(isEnabled));
    formData.append("shop", shop);

    submit(formData, { method: "POST", action: "?index" });
  };

  return (
    <PolarisAppProvider i18n={enTranslations}>
      <Page
        title="Smart Exit Popup Config ⚙️"
        subtitle={`Configure the exit popup experience for ${shop}`}
        primaryAction={{
          content: "Save Settings",
          loading: isSaving,
          onAction: handleSave,
        }}
      >
        <BlockStack gap="500">
          {actionData?.ok && (
            <Banner tone="success" title="Settings saved">
              <p>{actionData.message}</p>
            </Banner>
          )}

          {actionData?.ok === false && (
            <Banner tone="critical" title="Settings were not saved">
              <p>{actionData.message}</p>
            </Banner>
          )}

          <Card>
            <Form onSubmit={handleSave}>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Popup Settings
                  </Text>
                  <Text as="p" tone="subdued">
                    These settings are saved in MongoDB and loaded by the
                    storefront popup through your Shopify app proxy.
                  </Text>
                </BlockStack>

                <FormLayout>
                  <TextField
                    label="Popup Heading Text"
                    value={popupHeading}
                    onChange={setPopupHeading}
                    autoComplete="off"
                    helpText="This headline appears at the top of the exit popup."
                  />

                  <TextField
                    label="Discount Code to Display"
                    value={discountCode}
                    onChange={setDiscountCode}
                    autoComplete="off"
                    helpText="This discount code is shown to shoppers before they leave."
                  />

                  <TextField
                    label="Button Background Color"
                    value={buttonBackgroundColor}
                    onChange={setButtonBackgroundColor}
                    autoComplete="off"
                    placeholder="#008060 or green"
                    helpText="Enter a hex code or valid CSS color name."
                  />

                  <Checkbox
                    label="Enable popup on live store"
                    checked={isEnabled}
                    onChange={setIsEnabled}
                    helpText="When enabled, the theme app extension can display this popup to store visitors."
                  />

                  <InlineStack align="end">
                    <Button variant="primary" loading={isSaving} submit>
                      Save Settings
                    </Button>
                  </InlineStack>
                </FormLayout>
              </BlockStack>
            </Form>
          </Card>
        </BlockStack>
      </Page>
    </PolarisAppProvider>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
