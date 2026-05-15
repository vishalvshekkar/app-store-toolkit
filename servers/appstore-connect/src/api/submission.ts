import { ascRequest } from "./client.js";

export async function submitForReview(versionId: string): Promise<{ submission_id: string; submitted_at: string }> {
  const res = await ascRequest<{ submittedDate: string }>("/v1/appStoreVersionSubmissions", {
    method: "POST",
    body: {
      data: {
        type: "appStoreVersionSubmissions",
        relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: versionId } } },
      },
    },
  });
  const resource = Array.isArray(res.data) ? res.data[0] : res.data;
  return {
    submission_id: (resource as any).id,
    submitted_at: (resource as any).attributes.submittedDate,
  };
}

export async function getSubmissionState(versionId: string): Promise<string> {
  const res = await ascRequest<{ appStoreState: string }>(`/v1/appStoreVersions/${versionId}`, {
    params: { "fields[appStoreVersions]": "appStoreState" },
  });
  const resource = Array.isArray(res.data) ? res.data[0] : res.data;
  return (resource as any).attributes.appStoreState;
}
