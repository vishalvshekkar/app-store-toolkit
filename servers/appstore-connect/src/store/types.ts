import type { DataField, Purpose } from "../data/privacy-taxonomy.js";

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

/** ASC primary category enum subset — extend as needed */
export type AppCategory =
  | "BUSINESS"
  | "DEVELOPER_TOOLS"
  | "EDUCATION"
  | "ENTERTAINMENT"
  | "FINANCE"
  | "FOOD_AND_DRINK"
  | "GAMES"
  | "GRAPHICS_AND_DESIGN"
  | "HEALTH_AND_FITNESS"
  | "LIFESTYLE"
  | "MAGAZINES_AND_NEWSPAPERS"
  | "MEDICAL"
  | "MUSIC"
  | "NAVIGATION"
  | "NEWS"
  | "PHOTO_AND_VIDEO"
  | "PRODUCTIVITY"
  | "REFERENCE"
  | "SHOPPING"
  | "SOCIAL_NETWORKING"
  | "SPORTS"
  | "STICKERS"
  | "TRAVEL"
  | "UTILITIES"
  | "WEATHER";

/** A single age-rating answer keyed by Apple's question id (e.g., "VIOLENCE_CARTOON_OR_FANTASY") */
export interface AgeRatingAnswer {
  questionId: string;
  /** "NONE" | "INFREQUENT_OR_MILD" | "FREQUENT_OR_INTENSE" — exact set varies per question */
  level: string;
}

/** Price point per territory. Apple price points are integer tier ids. */
export interface PriceTierEntry {
  territory: string; // ISO 3166-1 alpha-2
  priceTier: number;
}

/** A territory the app is available in */
export type Territory = string; // ISO 3166-1 alpha-2

/** Top-level listing config */
export interface ListingConfig {
  categories: {
    primary: AppCategory;
    secondary?: AppCategory;
  };
  ageRating: {
    answers: AgeRatingAnswer[];
    /** Optional: derived rating Apple computes from answers, cached for diffing */
    derivedRating?: string;
  };
  pricing: {
    /** When all territories share one tier, set this and leave perTerritory empty */
    defaultTier?: number;
    perTerritory: PriceTierEntry[];
  };
  availability: {
    territories: Territory[];
  };
  encryption: {
    /** Default encryption answer used when attaching builds; overridable per-build */
    usesEncryption: boolean;
    /** Optional list of exemption codes when usesEncryption=true */
    exemptions: string[];
  };
}

/** A single declared data type with its handling attributes */
export interface DeclaredDataType {
  type: DataField;
  /** Whether the data is linked to the user's identity */
  linkedToUser: boolean;
  /** Whether the data is used for tracking across apps/sites */
  usedForTracking: boolean;
  /** Why the data is collected */
  purposes: Purpose[];
}

/** App Review contact information */
export interface ReviewContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** Optional demo account credentials when the app requires sign-in */
export interface DemoAccount {
  required: boolean;
  username?: string;
  password?: string;
}

/** App Review information (per-version, single source of truth) */
export interface ReviewInfo {
  contact: ReviewContact;
  demo: DemoAccount;
  notes: string;
}

/** Top-level App Privacy answers */
export interface PrivacyResponses {
  /** Top-level "Do you collect data?" — when false, dataTypes must be empty */
  collectsData: boolean;
  tracking: {
    /** Does the app use ATT tracking? */
    enabled: boolean;
    /** Tracking domains, when enabled */
    domains: string[];
  };
  dataTypes: DeclaredDataType[];
}
