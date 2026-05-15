import { ascRequest } from "./client.js";
import type { UploadOperation } from "./screenshots.js";

export interface ReservedAppPreview {
  id: string;
  fileName: string;
  uploadOperations: UploadOperation[];
}

export interface ReserveAppPreviewInput {
  setId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export async function reserveAppPreview(
  input: ReserveAppPreviewInput
): Promise<ReservedAppPreview> {
  const res = await ascRequest<{
    fileName: string;
    uploadOperations: UploadOperation[];
  }>("/v1/appPreviews", {
    method: "POST",
    body: {
      data: {
        type: "appPreviews",
        attributes: {
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
        },
        relationships: {
          appPreviewSet: { data: { type: "appPreviewSets", id: input.setId } },
        },
      },
    },
  });
  const resource = Array.isArray(res.data) ? res.data[0] : res.data;
  return {
    id: (resource as any).id,
    fileName: (resource as any).attributes.fileName,
    uploadOperations: (resource as any).attributes.uploadOperations ?? [],
  };
}

export async function commitAppPreview(
  previewId: string,
  sourceFileChecksum: string,
  previewFrameTimeCode?: string
): Promise<void> {
  const attributes: Record<string, unknown> = {
    uploaded: true,
    sourceFileChecksum,
  };
  if (previewFrameTimeCode !== undefined) {
    attributes.previewFrameTimeCode = previewFrameTimeCode;
  }
  await ascRequest(`/v1/appPreviews/${previewId}`, {
    method: "PATCH",
    body: {
      data: { type: "appPreviews", id: previewId, attributes },
    },
  });
}

export async function listAppPreviews(setId: string): Promise<
  { id: string; fileName: string; sourceFileChecksum: string; previewFrameTimeCode: string | null }[]
> {
  const res = await ascRequest(`/v1/appPreviewSets/${setId}/appPreviews`);
  const data = Array.isArray(res.data) ? res.data : [res.data];
  return data.map((r) => ({
    id: (r as any).id,
    fileName: (r as any).attributes.fileName,
    sourceFileChecksum: (r as any).attributes.sourceFileChecksum,
    previewFrameTimeCode: (r as any).attributes.previewFrameTimeCode ?? null,
  }));
}

export async function deleteAppPreview(previewId: string): Promise<void> {
  await ascRequest(`/v1/appPreviews/${previewId}`, { method: "DELETE" });
}

/** Convert seconds (e.g., 2.5) to ASC's HH:MM:SS.sss timecode string. */
export function secondsToTimeCode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const sInt = Math.floor(s);
  const ms = Math.round((s - sInt) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sInt).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
