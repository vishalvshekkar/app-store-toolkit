import { ascRequest } from "./client.js";
import type { AppAttributes, Resource } from "./types.js";

/** Find an app by bundle ID */
export async function getAppByBundleId(
  bundleId: string
): Promise<Resource<AppAttributes> | null> {
  const response = await ascRequest<AppAttributes>("/v1/apps", {
    params: {
      "filter[bundleId]": bundleId,
      "fields[apps]": "name,bundleId,sku,primaryLocale",
      limit: "1",
    },
  });

  const data = Array.isArray(response.data) ? response.data : [response.data];
  return data[0] ?? null;
}

/** Get app by its ASC ID */
export async function getApp(
  appId: string
): Promise<Resource<AppAttributes>> {
  const response = await ascRequest<AppAttributes>(`/v1/apps/${appId}`, {
    params: {
      "fields[apps]": "name,bundleId,sku,primaryLocale",
    },
  });

  if (Array.isArray(response.data)) {
    return response.data[0];
  }
  return response.data;
}
