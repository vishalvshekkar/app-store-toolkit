import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  StoreReadMetadataSchema,
  StoreWriteMetadataSchema,
  StoreValidateSchema,
  StoreListSchema,
  StoreReadConfigSchema,
  StoreWriteConfigSchema,
  StoreWriteLocalConfigSchema,
} from "./schemas.js";
import {
  readMetadataField,
  writeMetadataField,
  getLatestContent,
  readAppInfo,
  readVersionField,
  listIAPs,
  readIAP,
  listReleaseNoteVersions,
} from "../store/metadata.js";
import {
  readConfig,
  writeConfig,
  readLocalConfig,
  writeLocalConfig,
  readLocales,
  writeLocales,
  ensureAppstoreDir,
} from "../store/config.js";
import { validateField, CHAR_LIMITS, formatValidationResults } from "../validation/limits.js";
import type { MetadataField, ValidationResult, AppConfig } from "../store/types.js";

/** Register all local store tools on the MCP server */
export function registerStoreTools(server: McpServer): void {
  // --- store_read_metadata ---
  server.tool(
    "store_read_metadata",
    "Read a metadata field from the local store with full iteration history",
    StoreReadMetadataSchema.shape,
    async (params) => {
      try {
        const field = await readMetadataField({
          locale: params.locale,
          field: params.field as any,
          platform: params.platform,
          version: params.version,
          product_id: params.product_id,
        });
        const latest = getLatestContent(field);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { latest_content: latest, history: field },
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

  // --- store_write_metadata ---
  server.tool(
    "store_write_metadata",
    "Write content to a metadata field, appending a new iteration to the history",
    StoreWriteMetadataSchema.shape,
    async (params) => {
      try {
        const updated = await writeMetadataField({
          locale: params.locale,
          field: params.field as any,
          platform: params.platform,
          version: params.version,
          product_id: params.product_id,
          content: params.content,
          source: params.source as any,
          context: params.context,
        });
        const latest = getLatestContent(updated);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  iteration_id: updated.latest,
                  content: latest,
                  total_iterations: updated.iterations.length,
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

  // --- store_validate ---
  server.tool(
    "store_validate",
    "Validate metadata fields against Apple character limits",
    StoreValidateSchema.shape,
    async (params) => {
      try {
        const config = await readConfig();
        if (!config) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No config found. Run /appcraft:setup first.",
              },
            ],
            isError: true,
          };
        }

        const localesToCheck = params.locale
          ? [params.locale]
          : config.locales;
        const platformsToCheck = params.platform
          ? [params.platform]
          : config.platforms;

        const results: ValidationResult[] = [];

        for (const locale of localesToCheck) {
          // App-level fields
          const appInfo = await readAppInfo(locale);
          const appFields: { key: "name" | "subtitle" | "keywords"; metaKey: MetadataField }[] = [
            { key: "name", metaKey: "name" },
            { key: "subtitle", metaKey: "subtitle" },
            { key: "keywords", metaKey: "keywords" },
          ];

          for (const { key, metaKey } of appFields) {
            const content = getLatestContent(appInfo[key]);
            if (content) {
              results.push(validateField(metaKey, content, locale));
            }
          }

          // Version-level fields per platform
          for (const platform of platformsToCheck) {
            const versionFields: ("description" | "promotional_text")[] = [
              "description",
              "promotional_text",
            ];
            for (const vf of versionFields) {
              const field = await readVersionField(locale, platform, vf);
              const content = getLatestContent(field);
              if (content) {
                results.push(
                  validateField(vf as MetadataField, content, locale, platform)
                );
              }
            }
          }

          // IAP fields
          const iapIds = await listIAPs(locale);
          for (const pid of iapIds) {
            const iap = await readIAP(locale, pid);
            if (iap) {
              const dn = getLatestContent(iap.display_name);
              if (dn) {
                results.push(
                  validateField("iap_display_name", dn, locale)
                );
              }
              const desc = getLatestContent(iap.description);
              if (desc) {
                results.push(
                  validateField("iap_description", desc, locale)
                );
              }
            }
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: formatValidationResults(results),
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

  // --- store_list ---
  server.tool(
    "store_list",
    "List metadata, locales, history, IAPs, or release notes from the local store",
    StoreListSchema.shape,
    async (params) => {
      try {
        const config = await readConfig();
        if (!config) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No config found. Run /appcraft:setup first.",
              },
            ],
            isError: true,
          };
        }

        const locale = params.locale ?? config.primary_locale;
        const platform = params.platform ?? config.platforms[0]?.toLowerCase();

        switch (params.type) {
          case "locales": {
            const locales = await readLocales();
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    { configured: config.locales, stored: locales },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "metadata": {
            const appInfo = await readAppInfo(locale);
            const desc = platform
              ? await readVersionField(locale, platform, "description")
              : null;
            const promo = platform
              ? await readVersionField(locale, platform, "promotional_text")
              : null;

            const summary: Record<string, { content: string | null; length: number; limit: number }> = {};
            const fields: { key: string; data: any; metaKey: MetadataField }[] = [
              { key: "name", data: appInfo.name, metaKey: "name" },
              { key: "subtitle", data: appInfo.subtitle, metaKey: "subtitle" },
              { key: "keywords", data: appInfo.keywords, metaKey: "keywords" },
            ];
            if (desc) fields.push({ key: "description", data: desc, metaKey: "description" });
            if (promo) fields.push({ key: "promotional_text", data: promo, metaKey: "promotional_text" });

            for (const { key, data, metaKey } of fields) {
              const content = getLatestContent(data);
              summary[key] = {
                content,
                length: content?.length ?? 0,
                limit: CHAR_LIMITS[metaKey],
              };
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({ locale, platform, fields: summary }, null, 2),
                },
              ],
            };
          }

          case "history": {
            if (!params.field) {
              return {
                content: [
                  { type: "text" as const, text: "Error: field is required for history listing" },
                ],
                isError: true,
              };
            }
            const field = await readMetadataField({
              locale,
              field: params.field as any,
              platform,
              version: params.version,
              product_id: params.product_id,
            });
            return {
              content: [
                { type: "text" as const, text: JSON.stringify(field, null, 2) },
              ],
            };
          }

          case "iap": {
            const iapIds = await listIAPs(locale);
            const iaps = [];
            for (const pid of iapIds) {
              const iap = await readIAP(locale, pid);
              if (iap) {
                iaps.push({
                  product_id: pid,
                  display_name: getLatestContent(iap.display_name),
                  description: getLatestContent(iap.description),
                });
              }
            }
            return {
              content: [
                { type: "text" as const, text: JSON.stringify({ locale, iaps }, null, 2) },
              ],
            };
          }

          case "release_notes": {
            if (!platform) {
              return {
                content: [
                  { type: "text" as const, text: "Error: platform is required for release_notes listing" },
                ],
                isError: true,
              };
            }
            const versions = await listReleaseNoteVersions(locale, platform);
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({ locale, platform, versions }, null, 2),
                },
              ],
            };
          }

          default:
            return {
              content: [
                { type: "text" as const, text: `Unknown list type: ${params.type}` },
              ],
              isError: true,
            };
        }
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- store_read_config ---
  server.tool(
    "store_read_config",
    "Read the current appcraft configuration",
    StoreReadConfigSchema.shape,
    async () => {
      try {
        const config = await readConfig();
        if (!config) {
          return {
            content: [
              { type: "text" as const, text: "No config found. Run /appcraft:setup first." },
            ],
          };
        }
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(config, null, 2) },
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

  // --- store_write_config ---
  server.tool(
    "store_write_config",
    "Write or update the appcraft configuration (config.json)",
    StoreWriteConfigSchema.shape,
    async (params) => {
      try {
        await ensureAppstoreDir();
        const existing = (await readConfig()) ?? ({} as Partial<AppConfig>);
        const updated: AppConfig = {
          bundle_id: params.bundle_id ?? existing.bundle_id ?? "",
          app_id: params.app_id ?? existing.app_id,
          platforms: params.platforms ?? existing.platforms ?? [],
          primary_locale: params.primary_locale ?? existing.primary_locale ?? "en-US",
          locales: params.locales ?? existing.locales ?? ["en-US"],
          voice: params.voice ?? existing.voice ?? { tone: "professional" },
          changelog: params.changelog ?? existing.changelog,
        };
        await writeConfig(updated);

        // Also update _locales.json
        if (updated.locales) {
          await writeLocales(updated.locales);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, config: updated }, null, 2),
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

  // --- store_write_local_config ---
  server.tool(
    "store_write_local_config",
    "Write the local (gitignored) config with API credentials",
    StoreWriteLocalConfigSchema.shape,
    async (params) => {
      try {
        await ensureAppstoreDir();
        await writeLocalConfig({
          key_id: params.key_id,
          issuer_id: params.issuer_id,
          p8_key_path: params.p8_key_path,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                message: "Local config saved (gitignored).",
              }),
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
