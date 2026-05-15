import { ascRequest } from "./client.js";

export type ReleaseStrategy =
  | { type: "AFTER_APPROVAL" }
  | { type: "MANUAL" }
  | { type: "SCHEDULED"; earliestReleaseDate: string }
  | { type: "PHASED" };

export async function setReleaseStrategy(
  versionId: string,
  strategy: ReleaseStrategy
): Promise<void> {
  const attributes: Record<string, unknown> = { releaseType: strategy.type };
  if (strategy.type === "SCHEDULED") {
    attributes.earliestReleaseDate = strategy.earliestReleaseDate;
  }
  await ascRequest(`/v1/appStoreVersions/${versionId}`, {
    method: "PATCH",
    body: { data: { type: "appStoreVersions", id: versionId, attributes } },
  });
}

export interface CreateVersionInput {
  appId: string;
  versionString: string;
  platform: "IOS" | "MAC_OS" | "TV_OS";
}

export async function createVersion(input: CreateVersionInput): Promise<{ id: string; versionString: string }> {
  const res = await ascRequest<{ versionString: string }>("/v1/appStoreVersions", {
    method: "POST",
    body: {
      data: {
        type: "appStoreVersions",
        attributes: { versionString: input.versionString, platform: input.platform },
        relationships: { app: { data: { type: "apps", id: input.appId } } },
      },
    },
  });
  const resource = Array.isArray(res.data) ? res.data[0] : res.data;
  return {
    id: (resource as any).id,
    versionString: (resource as any).attributes.versionString,
  };
}
