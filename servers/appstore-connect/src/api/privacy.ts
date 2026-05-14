import { ascRequest } from "./client.js";
import type { PrivacyResponses, DeclaredDataType } from "../store/types.js";
import type { Purpose } from "../data/privacy-taxonomy.js";

interface UsagePost {
  type: "appDataUsages";
  attributes: {
    dataProtection: string;
  };
  relationships: {
    app: { data: { type: "apps"; id: string } };
    category?: { data: { type: "appDataUsageCategories"; id: string } };
    purpose?: { data: { type: "appDataUsagePurposes"; id: string } };
  };
}

function postBodyFor(
  appId: string,
  dt: DeclaredDataType,
  purpose: Purpose
): UsagePost {
  const dataProtection = dt.usedForTracking
    ? "DATA_USED_TO_TRACK_YOU"
    : dt.linkedToUser
      ? "DATA_LINKED_TO_YOU"
      : "DATA_NOT_LINKED_TO_YOU";

  return {
    type: "appDataUsages",
    attributes: { dataProtection },
    relationships: {
      app: { data: { type: "apps", id: appId } },
      category: { data: { type: "appDataUsageCategories", id: dt.type } },
      purpose: { data: { type: "appDataUsagePurposes", id: purpose } },
    },
  };
}

function trackingDomainPost(appId: string, domain: string): UsagePost {
  return {
    type: "appDataUsages",
    attributes: { dataProtection: "DATA_USED_TO_TRACK_YOU" },
    relationships: {
      app: { data: { type: "apps", id: appId } },
      category: { data: { type: "appDataUsageCategories", id: `TRACKING_DOMAIN_${domain}` } },
    },
  };
}

/** Replace all appDataUsages for an app with the supplied PrivacyResponses */
export async function replaceAppDataUsages(
  appId: string,
  cfg: PrivacyResponses
): Promise<void> {
  const existing = await ascRequest<{ id: string }>(
    `/v1/apps/${appId}/dataUsages`,
    { params: { limit: "200" } }
  );
  const existingArr = Array.isArray(existing.data) ? existing.data : [existing.data];

  for (const usage of existingArr) {
    if (!usage?.id) continue;
    await ascRequest(`/v1/appDataUsages/${usage.id}`, { method: "DELETE" });
  }

  for (const dt of cfg.dataTypes) {
    for (const purpose of dt.purposes) {
      await ascRequest(`/v1/appDataUsages`, {
        method: "POST",
        body: { data: postBodyFor(appId, dt, purpose) },
      });
    }
  }
  if (cfg.tracking.enabled) {
    for (const domain of cfg.tracking.domains) {
      await ascRequest(`/v1/appDataUsages`, {
        method: "POST",
        body: { data: trackingDomainPost(appId, domain) },
      });
    }
  }
}
