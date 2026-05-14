import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";

interface BuildEncryptionAttributes {
  usesNonExemptEncryption: boolean;
  exportComplianceCode?: string;
}

export interface EncryptionUpdate {
  usesEncryption: boolean;
  exemptions: string[];
}

export async function setBuildEncryption(
  buildId: string,
  update: EncryptionUpdate
): Promise<Resource<BuildEncryptionAttributes>> {
  const attributes: BuildEncryptionAttributes = {
    usesNonExemptEncryption: update.usesEncryption,
  };
  if (update.usesEncryption && update.exemptions.length > 0) {
    attributes.exportComplianceCode = update.exemptions[0];
  }
  const response = await ascRequest<BuildEncryptionAttributes>(
    `/v1/builds/${buildId}`,
    {
      method: "PATCH",
      body: {
        data: { type: "builds", id: buildId, attributes },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<BuildEncryptionAttributes>;
  }
  return response.data as Resource<BuildEncryptionAttributes>;
}
