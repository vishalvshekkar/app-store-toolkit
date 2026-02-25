import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAppByBundleId, getApp } from "../api/apps.js";
import {
  getAppInfos,
  getAppInfoLocalizations,
  updateAppInfoLocalization,
} from "../api/app-info.js";
import {
  getAppStoreVersions,
  getEditableVersion,
  getVersionLocalizations,
  updateVersionLocalization,
} from "../api/versions.js";
import {
  getInAppPurchases,
  getIAPLocalizations,
  updateIAPLocalization,
} from "../api/iap.js";
import { getCustomerReviews, postReviewResponse } from "../api/reviews.js";
import { hasCredentials } from "../auth/jwt.js";

function noCredentialsError() {
  return {
    content: [
      {
        type: "text" as const,
        text: "No API credentials configured. Run /app-store-toolkit:setup to add your App Store Connect API key.",
      },
    ],
    isError: true,
  };
}

/** Register all App Store Connect API tools on the MCP server */
export function registerAscTools(server: McpServer): void {
  // --- asc_get_app ---
  server.tool(
    "asc_get_app",
    "Find an app in App Store Connect by bundle ID",
    { bundle_id: z.string().describe("The app's bundle identifier") },
    async ({ bundle_id }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const app = await getAppByBundleId(bundle_id);
        if (!app) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No app found with bundle ID: ${bundle_id}`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: app.id,
                  name: app.attributes.name,
                  bundleId: app.attributes.bundleId,
                  primaryLocale: app.attributes.primaryLocale,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_get_app_info ---
  server.tool(
    "asc_get_app_info",
    "Get app-level localizations (name, subtitle) from App Store Connect",
    {
      app_id: z.string().describe("The app's App Store Connect ID"),
      locale: z.string().optional().describe("Filter by locale"),
    },
    async ({ app_id, locale }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const appInfos = await getAppInfos(app_id);
        if (appInfos.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No app info records found." },
            ],
          };
        }

        // Use the first (most recent) app info
        const appInfoId = appInfos[0].id;
        const localizations = await getAppInfoLocalizations(appInfoId, locale);

        const result = localizations.map((l) => ({
          id: l.id,
          locale: l.attributes.locale,
          name: l.attributes.name,
          subtitle: l.attributes.subtitle,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ appInfoId, localizations: result }, null, 2),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_update_app_info ---
  server.tool(
    "asc_update_app_info",
    "Update app-level localization (name, subtitle) in App Store Connect",
    {
      localization_id: z.string().describe("The app info localization ID"),
      name: z.string().optional().describe("New app name"),
      subtitle: z.string().optional().describe("New app subtitle"),
    },
    async ({ localization_id, name, subtitle }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updates: Record<string, string> = {};
        if (name !== undefined) updates.name = name;
        if (subtitle !== undefined) updates.subtitle = subtitle;

        const updated = await updateAppInfoLocalization(localization_id, updates);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: updated.id,
                  name: updated.attributes.name,
                  subtitle: updated.attributes.subtitle,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_get_version ---
  server.tool(
    "asc_get_version",
    "Get the latest app store version for a platform",
    {
      app_id: z.string().describe("The app's App Store Connect ID"),
      platform: z.string().describe("Platform: IOS, MAC_OS, TV_OS, or VISION_OS"),
    },
    async ({ app_id, platform }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const version = await getEditableVersion(app_id, platform);
        if (!version) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No version found for platform: ${platform}`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: version.id,
                  platform: version.attributes.platform,
                  versionString: version.attributes.versionString,
                  state: version.attributes.appStoreState,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_get_version_localizations ---
  server.tool(
    "asc_get_version_localizations",
    "Get version localizations (description, keywords, promo, whatsNew) from App Store Connect",
    {
      version_id: z.string().describe("The app store version ID"),
      locale: z.string().optional().describe("Filter by locale"),
    },
    async ({ version_id, locale }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const localizations = await getVersionLocalizations(version_id, locale);

        const result = localizations.map((l) => ({
          id: l.id,
          locale: l.attributes.locale,
          description: l.attributes.description,
          keywords: l.attributes.keywords,
          promotionalText: l.attributes.promotionalText,
          whatsNew: l.attributes.whatsNew,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ versionId: version_id, localizations: result }, null, 2),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_update_version_localization ---
  server.tool(
    "asc_update_version_localization",
    "Update version localization (description, keywords, promo, whatsNew) in App Store Connect",
    {
      localization_id: z.string().describe("The version localization ID"),
      description: z.string().optional().describe("New description"),
      keywords: z.string().optional().describe("New keywords"),
      promotionalText: z.string().optional().describe("New promotional text"),
      whatsNew: z.string().optional().describe("New What's New text"),
    },
    async ({ localization_id, description, keywords, promotionalText, whatsNew }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updates: Record<string, string> = {};
        if (description !== undefined) updates.description = description;
        if (keywords !== undefined) updates.keywords = keywords;
        if (promotionalText !== undefined) updates.promotionalText = promotionalText;
        if (whatsNew !== undefined) updates.whatsNew = whatsNew;

        const updated = await updateVersionLocalization(localization_id, updates);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: updated.id,
                  locale: updated.attributes.locale,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_get_iaps ---
  server.tool(
    "asc_get_iaps",
    "List in-app purchases for an app from App Store Connect",
    {
      app_id: z.string().describe("The app's App Store Connect ID"),
    },
    async ({ app_id }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const iaps = await getInAppPurchases(app_id);
        const result = iaps.map((i) => ({
          id: i.id,
          name: i.attributes.name,
          productId: i.attributes.productId,
          type: i.attributes.inAppPurchaseType,
          state: i.attributes.state,
        }));
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ iaps: result }, null, 2) },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_get_iap_localizations ---
  server.tool(
    "asc_get_iap_localizations",
    "Get localizations for a specific in-app purchase",
    {
      iap_id: z.string().describe("The IAP resource ID"),
      locale: z.string().optional().describe("Filter by locale"),
    },
    async ({ iap_id, locale }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const localizations = await getIAPLocalizations(iap_id, locale);
        const result = localizations.map((l) => ({
          id: l.id,
          locale: l.attributes.locale,
          name: l.attributes.name,
          description: l.attributes.description,
        }));
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ localizations: result }, null, 2) },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_update_iap_localization ---
  server.tool(
    "asc_update_iap_localization",
    "Update an in-app purchase localization (name, description)",
    {
      localization_id: z.string().describe("The IAP localization ID"),
      name: z.string().optional().describe("New display name"),
      description: z.string().optional().describe("New description"),
    },
    async ({ localization_id, name, description }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updates: Record<string, string> = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;

        const updated = await updateIAPLocalization(localization_id, updates);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: updated.id,
                  name: updated.attributes.name,
                  description: updated.attributes.description,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_get_reviews ---
  server.tool(
    "asc_get_reviews",
    "Get customer reviews for an app from App Store Connect",
    {
      app_id: z.string().describe("The app's App Store Connect ID"),
      sort: z
        .string()
        .optional()
        .describe("Sort order: -createdDate (newest), createdDate (oldest), -rating, rating"),
      limit: z.number().optional().describe("Max reviews to return (default 20)"),
    },
    async ({ app_id, sort, limit }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const reviews = await getCustomerReviews(app_id, { sort, limit });
        const result = reviews.map((r) => ({
          id: r.id,
          rating: r.attributes.rating,
          title: r.attributes.title,
          body: r.attributes.body,
          reviewer: r.attributes.reviewerNickname,
          date: r.attributes.createdDate,
          territory: r.attributes.territory,
        }));
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ reviews: result }, null, 2) },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_post_review_response ---
  server.tool(
    "asc_post_review_response",
    "Post a response to a customer review",
    {
      review_id: z.string().describe("The customer review ID"),
      response_body: z.string().describe("The response text"),
    },
    async ({ review_id, response_body }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const response = await postReviewResponse(review_id, response_body);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: response.id,
                  responseBody: response.attributes.responseBody,
                  state: response.attributes.state,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
}
