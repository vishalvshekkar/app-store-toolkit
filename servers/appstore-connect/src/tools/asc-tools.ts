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
import { setCategories } from "../api/categories.js";
import { setAgeRatingDeclaration } from "../api/age-rating.js";
import { setAppPriceSchedule } from "../api/pricing.js";
import { setAppAvailability } from "../api/availability.js";
import { replaceAppDataUsages } from "../api/privacy.js";
import { setAppStoreReviewDetail } from "../api/review-info.js";
import { setBuildEncryption } from "../api/encryption.js";
import { appendHistoryEntry } from "../store/history.js";
import {
  AscSetCategoriesSchema,
  AscSetAgeRatingSchema,
  AscSetPricingSchema,
  AscSetAvailabilitySchema,
  AscSetPrivacyResponsesSchema,
  AscSetReviewInfoSchema,
  AscSetEncryptionComplianceSchema,
} from "./schemas.js";
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

  // --- asc_set_categories ---
  server.tool(
    "asc_set_categories",
    "Set primary and optional secondary App Store category",
    AscSetCategoriesSchema.shape,
    async ({ app_info_id, primary, secondary }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setCategories(app_info_id, { primary, secondary });
        await appendHistoryEntry("pushes", {
          tool: "asc_set_categories",
          target: { app_info_id },
          payload: { primary, secondary },
          result: "success",
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: updated.id,
                  primaryCategory: updated.attributes.primaryCategory,
                  secondaryCategory: updated.attributes.secondaryCategory,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_categories",
          target: { app_info_id },
          payload: { primary, secondary },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_set_age_rating ---
  server.tool(
    "asc_set_age_rating",
    "Set age rating answers on the editable appInfo's age rating declaration",
    AscSetAgeRatingSchema.shape,
    async ({ declaration_id, answers }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setAgeRatingDeclaration(declaration_id, answers);
        await appendHistoryEntry("pushes", {
          tool: "asc_set_age_rating",
          target: { declaration_id },
          payload: { answers },
          result: "success",
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, id: updated.id }, null, 2),
            },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_age_rating",
          target: { declaration_id },
          payload: { answers },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_set_pricing ---
  server.tool(
    "asc_set_pricing",
    "Set the app's price schedule (USA base tier + optional per-territory overrides)",
    AscSetPricingSchema.shape,
    async ({ app_id, default_tier, per_territory }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setAppPriceSchedule(app_id, {
          defaultTier: default_tier,
          perTerritory: per_territory.map((p) => ({
            territory: p.territory,
            priceTier: p.price_tier,
          })),
        });
        await appendHistoryEntry("pushes", {
          tool: "asc_set_pricing",
          target: { app_id },
          payload: { default_tier, per_territory },
          result: "success",
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, id: updated.id }, null, 2) },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_pricing",
          target: { app_id },
          payload: { default_tier, per_territory },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_set_privacy_responses ---
  server.tool(
    "asc_set_privacy_responses",
    "Replace the app's App Privacy declarations with the supplied responses",
    AscSetPrivacyResponsesSchema.shape,
    async ({ app_id, responses }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        await replaceAppDataUsages(app_id, responses as any);
        await appendHistoryEntry("pushes", {
          tool: "asc_set_privacy_responses",
          target: { app_id },
          payload: { responses },
          result: "success",
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, app_id, replaced: true }, null, 2),
            },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_privacy_responses",
          target: { app_id },
          payload: { responses },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_set_review_info ---
  server.tool(
    "asc_set_review_info",
    "Set App Review information (contact, demo credentials, notes)",
    AscSetReviewInfoSchema.shape,
    async ({ review_detail_id, contact, demo, notes }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setAppStoreReviewDetail(review_detail_id, {
          contact,
          demo,
          notes,
        });
        await appendHistoryEntry("pushes", {
          tool: "asc_set_review_info",
          target: { review_detail_id },
          // Don't log the password
          payload: {
            contact,
            demo: { required: demo.required, username: demo.username, password: demo.password ? "<redacted>" : undefined },
            notes,
          },
          result: "success",
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, id: updated.id }, null, 2) },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_review_info",
          target: { review_detail_id },
          payload: { contact, demo: { required: demo.required }, notes },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_set_encryption_compliance ---
  server.tool(
    "asc_set_encryption_compliance",
    "Set encryption compliance answer on a build",
    AscSetEncryptionComplianceSchema.shape,
    async ({ build_id, uses_encryption, exemptions }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setBuildEncryption(build_id, {
          usesEncryption: uses_encryption,
          exemptions,
        });
        await appendHistoryEntry("pushes", {
          tool: "asc_set_encryption_compliance",
          target: { build_id },
          payload: { uses_encryption, exemptions },
          result: "success",
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, id: updated.id }, null, 2) },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_encryption_compliance",
          target: { build_id },
          payload: { uses_encryption, exemptions },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- asc_set_availability ---
  server.tool(
    "asc_set_availability",
    "Set the territories the app is available in",
    AscSetAvailabilitySchema.shape,
    async ({ app_id, territories }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setAppAvailability(app_id, territories);
        await appendHistoryEntry("pushes", {
          tool: "asc_set_availability",
          target: { app_id },
          payload: { territories },
          result: "success",
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, id: updated.id }, null, 2) },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_availability",
          target: { app_id },
          payload: { territories },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
}
