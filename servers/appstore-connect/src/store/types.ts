/** Source of a content iteration */
export type IterationSource =
  | "ai_generated"
  | "user_edited"
  | "pulled_from_asc"
  | "translated";

/** A single iteration of a content field */
export interface Iteration {
  id: number;
  timestamp: string;
  content: string;
  source: IterationSource;
  context: string;
}

/** A content field with full iteration history */
export interface FieldWithHistory {
  latest: number;
  iterations: Iteration[];
}

/** App-level info (shared across platforms) */
export interface AppInfoData {
  name: FieldWithHistory;
  subtitle: FieldWithHistory;
  keywords: FieldWithHistory;
}

/** Version-level content (per-platform per-locale) */
export interface VersionData {
  description: FieldWithHistory;
  promotional_text: FieldWithHistory;
}

/** Release notes for a specific version */
export interface ReleaseNotesData {
  version: string;
  notes: FieldWithHistory;
}

/** In-app purchase metadata */
export interface IAPData {
  product_id: string;
  display_name: FieldWithHistory;
  description: FieldWithHistory;
}

/** Voice/tone configuration */
export interface VoiceConfig {
  tone:
    | "professional"
    | "casual"
    | "playful"
    | "technical"
    | "minimal"
    | "witty"
    | "custom";
  style_notes?: string;
  target_audience?: string;
}

/** Changelog configuration */
export interface ChangelogConfig {
  source: "git" | "manual" | "both";
  conventional_commits: boolean;
}

/** Main config (committed to git) */
export interface AppConfig {
  bundle_id: string;
  app_id?: string;
  platforms: string[];
  primary_locale: string;
  locales: string[];
  voice: VoiceConfig;
  changelog?: ChangelogConfig;
}

/** Local config (gitignored) */
export interface LocalConfig {
  key_id: string;
  issuer_id: string;
  p8_key_path: string;
}

/** Validation result for a single field */
export interface ValidationResult {
  field: string;
  locale: string;
  platform?: string;
  content: string;
  length: number;
  limit: number;
  valid: boolean;
}

/** Metadata field names that map to character limits */
export type MetadataField =
  | "name"
  | "subtitle"
  | "keywords"
  | "promotional_text"
  | "description"
  | "release_notes"
  | "iap_display_name"
  | "iap_description";
