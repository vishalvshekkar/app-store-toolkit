import { getToken } from "../auth/jwt.js";
import type { ApiResponse } from "./types.js";

const BASE_URL = "https://api.appstoreconnect.apple.com";

/** Default retry configuration */
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string>;
}

/**
 * Make an authenticated request to the App Store Connect API.
 * Handles JWT auth, rate limiting (429), and retries.
 */
export async function ascRequest<T = Record<string, unknown>>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, params } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const token = await getToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === "POST" || method === "PATCH")) {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      // Rate limited — back off and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(waitMs);
        continue;
      }

      // No content (successful DELETE)
      if (response.status === 204) {
        return { data: [] } as unknown as ApiResponse<T>;
      }

      const json = await response.json();

      if (!response.ok) {
        const errors = (json as any).errors;
        const errorMsg = errors
          ? errors.map((e: any) => `${e.title}: ${e.detail}`).join("; ")
          : `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      return json as ApiResponse<T>;
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx errors (except 429 handled above)
      if (error.message?.includes("HTTP 4")) {
        throw error;
      }

      // Retry on network errors
      if (attempt < MAX_RETRIES) {
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}

/**
 * Fetch all pages of a paginated response.
 */
export async function ascRequestAllPages<T = Record<string, unknown>>(
  path: string,
  params?: Record<string, string>
): Promise<ApiResponse<T>> {
  const allData: any[] = [];
  const allIncluded: any[] = [];
  let currentPath = path;
  let currentParams = params;

  while (true) {
    const response = await ascRequest<T>(currentPath, { params: currentParams });
    const data = Array.isArray(response.data) ? response.data : [response.data];
    allData.push(...data);

    if (response.included) {
      allIncluded.push(...response.included);
    }

    // Check for next page
    if (response.links?.next) {
      const nextUrl = new URL(response.links.next);
      currentPath = nextUrl.pathname;
      currentParams = Object.fromEntries(nextUrl.searchParams.entries());
    } else {
      break;
    }
  }

  return {
    data: allData,
    included: allIncluded.length > 0 ? allIncluded : undefined,
  } as unknown as ApiResponse<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
