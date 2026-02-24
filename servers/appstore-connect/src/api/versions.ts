import { ascRequest, ascRequestAllPages } from "./client.js";
import type {
  AppStoreVersionAttributes,
  VersionLocalizationAttributes,
  Resource,
} from "./types.js";

/** Get app store versions for an app, optionally filtered by platform */
export async function getAppStoreVersions(
  appId: string,
  platform?: string
): Promise<Resource<AppStoreVersionAttributes>[]> {
  const params: Record<string, string> = {
    "fields[appStoreVersions]":
      "platform,versionString,appStoreState,releaseType,createdDate",
    limit: "10",
  };
  if (platform) {
    params["filter[platform]"] = platform;
  }

  const response = await ascRequestAllPages<AppStoreVersionAttributes>(
    `/v1/apps/${appId}/appStoreVersions`,
    params
  );

  return (
    Array.isArray(response.data) ? response.data : [response.data]
  ) as Resource<AppStoreVersionAttributes>[];
}

/** Get the latest editable version for a platform */
export async function getEditableVersion(
  appId: string,
  platform: string
): Promise<Resource<AppStoreVersionAttributes> | null> {
  const versions = await getAppStoreVersions(appId, platform);

  // Find the editable version (PREPARE_FOR_SUBMISSION, IN_REVIEW, etc. — not READY_FOR_DISTRIBUTION)
  const editable = versions.find(
    (v) =>
      v.attributes.appStoreState !== "READY_FOR_DISTRIBUTION" &&
      v.attributes.appStoreState !== "REMOVED_FROM_SALE"
  );

  return editable ?? versions[0] ?? null;
}

/** Get version localizations for a specific version */
export async function getVersionLocalizations(
  versionId: string,
  locale?: string
): Promise<Resource<VersionLocalizationAttributes>[]> {
  const params: Record<string, string> = {
    "fields[appStoreVersionLocalizations]":
      "locale,description,keywords,promotionalText,whatsNew,marketingUrl,supportUrl",
    limit: "200",
  };
  if (locale) {
    params["filter[locale]"] = locale;
  }

  const response = await ascRequestAllPages<VersionLocalizationAttributes>(
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
    params
  );

  return (
    Array.isArray(response.data) ? response.data : [response.data]
  ) as Resource<VersionLocalizationAttributes>[];
}

/** Update a version localization */
export async function updateVersionLocalization(
  localizationId: string,
  updates: {
    description?: string;
    keywords?: string;
    promotionalText?: string;
    whatsNew?: string;
  }
): Promise<Resource<VersionLocalizationAttributes>> {
  const response = await ascRequest<VersionLocalizationAttributes>(
    `/v1/appStoreVersionLocalizations/${localizationId}`,
    {
      method: "PATCH",
      body: {
        data: {
          type: "appStoreVersionLocalizations",
          id: localizationId,
          attributes: updates,
        },
      },
    }
  );

  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<VersionLocalizationAttributes>;
  }
  return response.data as Resource<VersionLocalizationAttributes>;
}
