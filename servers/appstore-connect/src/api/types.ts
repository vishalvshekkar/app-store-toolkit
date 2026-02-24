/** JSON:API resource identifier */
export interface ResourceId {
  type: string;
  id: string;
}

/** JSON:API relationship */
export interface Relationship {
  data: ResourceId | ResourceId[] | null;
  links?: { self?: string; related?: string };
}

/** JSON:API resource */
export interface Resource<T = Record<string, unknown>> {
  type: string;
  id: string;
  attributes: T;
  relationships?: Record<string, Relationship>;
  links?: Record<string, string>;
}

/** JSON:API response envelope */
export interface ApiResponse<T = Record<string, unknown>> {
  data: Resource<T> | Resource<T>[];
  included?: Resource[];
  links?: { self?: string; next?: string };
  meta?: Record<string, unknown>;
}

// --- App Store Connect specific types ---

export interface AppAttributes {
  name: string;
  bundleId: string;
  sku: string;
  primaryLocale: string;
}

export interface AppInfoLocalizationAttributes {
  locale: string;
  name: string | null;
  subtitle: string | null;
  privacyPolicyUrl: string | null;
  privacyChoicesUrl: string | null;
  privacyPolicyText: string | null;
}

export interface AppStoreVersionAttributes {
  platform: string;
  versionString: string;
  appStoreState: string;
  releaseType: string | null;
  createdDate: string;
}

export interface VersionLocalizationAttributes {
  locale: string;
  description: string | null;
  keywords: string | null;
  promotionalText: string | null;
  whatsNew: string | null;
  marketingUrl: string | null;
  supportUrl: string | null;
}

export interface InAppPurchaseAttributes {
  name: string;
  productId: string;
  inAppPurchaseType: string;
  state: string;
}

export interface IAPLocalizationAttributes {
  locale: string;
  name: string | null;
  description: string | null;
}

export interface CustomerReviewAttributes {
  rating: number;
  title: string | null;
  body: string | null;
  reviewerNickname: string;
  createdDate: string;
  territory: string;
}

export interface CustomerReviewResponseAttributes {
  responseBody: string;
  lastModifiedDate: string;
  state: string;
}
