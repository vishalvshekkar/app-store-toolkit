import { ascRequest, ascRequestAllPages } from "./client.js";
import type {
  InAppPurchaseAttributes,
  IAPLocalizationAttributes,
  Resource,
} from "./types.js";

/** List all in-app purchases for an app */
export async function getInAppPurchases(
  appId: string
): Promise<Resource<InAppPurchaseAttributes>[]> {
  const response = await ascRequestAllPages<InAppPurchaseAttributes>(
    `/v2/inAppPurchases`,
    {
      "filter[app]": appId,
      "fields[inAppPurchases]": "name,productId,inAppPurchaseType,state",
      limit: "200",
    }
  );

  return (
    Array.isArray(response.data) ? response.data : [response.data]
  ) as Resource<InAppPurchaseAttributes>[];
}

/** Get localizations for a specific IAP */
export async function getIAPLocalizations(
  iapId: string,
  locale?: string
): Promise<Resource<IAPLocalizationAttributes>[]> {
  const params: Record<string, string> = {
    "fields[inAppPurchaseLocalizations]": "locale,name,description",
    limit: "200",
  };
  if (locale) {
    params["filter[locale]"] = locale;
  }

  const response = await ascRequestAllPages<IAPLocalizationAttributes>(
    `/v2/inAppPurchases/${iapId}/inAppPurchaseLocalizations`,
    params
  );

  return (
    Array.isArray(response.data) ? response.data : [response.data]
  ) as Resource<IAPLocalizationAttributes>[];
}

/** Update an IAP localization */
export async function updateIAPLocalization(
  localizationId: string,
  updates: { name?: string; description?: string }
): Promise<Resource<IAPLocalizationAttributes>> {
  const response = await ascRequest<IAPLocalizationAttributes>(
    `/v1/inAppPurchaseLocalizations/${localizationId}`,
    {
      method: "PATCH",
      body: {
        data: {
          type: "inAppPurchaseLocalizations",
          id: localizationId,
          attributes: updates,
        },
      },
    }
  );

  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<IAPLocalizationAttributes>;
  }
  return response.data as Resource<IAPLocalizationAttributes>;
}
