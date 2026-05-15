import { ascRequest } from "./client.js";

export interface UploadOperation {
  method: string;
  url: string;
  length: number;
  offset: number;
  requestHeaders: { name: string; value: string }[];
}

export interface ReservedScreenshot {
  id: string;
  fileName: string;
  uploadOperations: UploadOperation[];
}

export interface ReserveScreenshotInput {
  setId: string;
  fileName: string;
  fileSize: number;
}

export async function reserveScreenshot(
  input: ReserveScreenshotInput
): Promise<ReservedScreenshot> {
  const res = await ascRequest<{
    fileName: string;
    uploadOperations: UploadOperation[];
  }>("/v1/appScreenshots", {
    method: "POST",
    body: {
      data: {
        type: "appScreenshots",
        attributes: { fileName: input.fileName, fileSize: input.fileSize },
        relationships: {
          appScreenshotSet: {
            data: { type: "appScreenshotSets", id: input.setId },
          },
        },
      },
    },
  });
  const resource = Array.isArray(res.data) ? res.data[0] : res.data;
  return {
    id: (resource as any).id,
    fileName: (resource as any).attributes.fileName,
    uploadOperations: (resource as any).attributes.uploadOperations,
  };
}

export async function putScreenshotBytes(
  op: UploadOperation,
  bytes: Buffer
): Promise<void> {
  const headers: Record<string, string> = {};
  for (const h of op.requestHeaders) {
    headers[h.name] = h.value;
  }
  const response = await fetch(op.url, {
    method: op.method,
    headers,
    body: bytes.subarray(op.offset, op.offset + op.length),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} uploading bytes: ${response.statusText}`);
  }
}

export async function commitScreenshot(
  screenshotId: string,
  sourceFileChecksum: string
): Promise<void> {
  await ascRequest(`/v1/appScreenshots/${screenshotId}`, {
    method: "PATCH",
    body: {
      data: {
        type: "appScreenshots",
        id: screenshotId,
        attributes: { uploaded: true, sourceFileChecksum },
      },
    },
  });
}

export async function listScreenshots(setId: string): Promise<
  { id: string; fileName: string; sourceFileChecksum: string; width: number; height: number }[]
> {
  const res = await ascRequest<{
    fileName: string;
    sourceFileChecksum: string;
    imageAsset: { width: number; height: number };
  }>(`/v1/appScreenshotSets/${setId}/appScreenshots`);
  const data = Array.isArray(res.data) ? res.data : [res.data];
  return data.map((r) => ({
    id: (r as any).id,
    fileName: (r as any).attributes.fileName,
    sourceFileChecksum: (r as any).attributes.sourceFileChecksum,
    width: (r as any).attributes.imageAsset?.width ?? 0,
    height: (r as any).attributes.imageAsset?.height ?? 0,
  }));
}

export async function deleteScreenshot(screenshotId: string): Promise<void> {
  await ascRequest(`/v1/appScreenshots/${screenshotId}`, { method: "DELETE" });
}
