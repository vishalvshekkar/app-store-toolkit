import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";

export interface CategoriesUpdate {
  primary: string;
  secondary?: string;
}

interface AppInfoCategoriesAttributes {
  primaryCategory: string;
  secondaryCategory?: string;
}

/** Set the primary (and optional secondary) category on an editable appInfo */
export async function setCategories(
  appInfoId: string,
  update: CategoriesUpdate
): Promise<Resource<AppInfoCategoriesAttributes>> {
  const attributes: AppInfoCategoriesAttributes = { primaryCategory: update.primary };
  if (update.secondary !== undefined) {
    attributes.secondaryCategory = update.secondary;
  }
  const response = await ascRequest<AppInfoCategoriesAttributes>(`/v1/appInfos/${appInfoId}`, {
    method: "PATCH",
    body: {
      data: {
        type: "appInfos",
        id: appInfoId,
        attributes,
      },
    },
  });
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<AppInfoCategoriesAttributes>;
  }
  return response.data as Resource<AppInfoCategoriesAttributes>;
}
