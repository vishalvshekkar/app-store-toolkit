import { ascRequest } from "./client.js";

export interface BuildSummary {
  id: string;
  build_number: string;
  version: string;
  processing_state: string;
  valid: boolean;
  expires_at: string | null;
}

export async function listBuilds(appId: string): Promise<BuildSummary[]> {
  const res = await ascRequest<{
    version: string;
    buildVersion: string;
    processingState: string;
    expirationDate: string | null;
  }>("/v1/builds", {
    params: { "filter[app]": appId, limit: "200" },
  });
  const data = Array.isArray(res.data) ? res.data : [res.data];
  return data.map((r) => ({
    id: (r as any).id,
    build_number: (r as any).attributes.version,
    version: (r as any).attributes.buildVersion,
    processing_state: (r as any).attributes.processingState,
    valid: (r as any).attributes.processingState === "VALID",
    expires_at: (r as any).attributes.expirationDate ?? null,
  }));
}

export async function attachBuildToVersion(
  versionId: string,
  buildId: string
): Promise<void> {
  await ascRequest(`/v1/appStoreVersions/${versionId}/relationships/build`, {
    method: "PATCH",
    body: { data: { type: "builds", id: buildId } },
  });
}
