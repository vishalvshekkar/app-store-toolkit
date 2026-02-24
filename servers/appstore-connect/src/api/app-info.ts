import { ascRequest, ascRequestAllPages } from "./client.js";
import type {
  AppInfoLocalizationAttributes,
  Resource,
} from "./types.js";

/** Get app info records for an app */
export async function getAppInfos(appId: string): Promise<Resource[]> {
  const response = await ascRequest(`/v1/apps/${appId}/appInfos`, {
    params: {
      "include": "appInfoLocalizations",
      limit: "10",
    },
  });
  const data = Array.isArray(response.data) ? response.data : [response.data];
  return data;
}

/** Get app info localizations (name, subtitle) for an app info record */
export async function getAppInfoLocalizations(
  appInfoId: string,
  locale?: string
): Promise<Resource<AppInfoLocalizationAttributes>[]> {
  const params: Record<string, string> = {
    "fields[appInfoLocalizations]":
      "locale,name,subtitle,privacyPolicyUrl,privacyChoicesUrl,privacyPolicyText",
    limit: "200",
  };
  if (locale) {
    params["filter[locale]"] = locale;
  }

  const response = await ascRequestAllPages<AppInfoLocalizationAttributes>(
    `/v1/appInfos/${appInfoId}/appInfoLocalizations`,
    params
  );

  return (
    Array.isArray(response.data) ? response.data : [response.data]
  ) as Resource<AppInfoLocalizationAttributes>[];
}

/** Update an app info localization (name, subtitle) */
export async function updateAppInfoLocalization(
  localizationId: string,
  updates: { name?: string; subtitle?: string }
): Promise<Resource<AppInfoLocalizationAttributes>> {
  const response = await ascRequest<AppInfoLocalizationAttributes>(
    `/v1/appInfoLocalizations/${localizationId}`,
    {
      method: "PATCH",
      body: {
        data: {
          type: "appInfoLocalizations",
          id: localizationId,
          attributes: updates,
        },
      },
    }
  );

  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<AppInfoLocalizationAttributes>;
  }
  return response.data as Resource<AppInfoLocalizationAttributes>;
}
