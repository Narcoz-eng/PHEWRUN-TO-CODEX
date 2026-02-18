// In deployed environments, prefer same-origin to keep auth cookies first-party.
const API_BASE_URL = (() => {
  const explicit = import.meta.env.VITE_BACKEND_URL?.trim();

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";

    if (!isLocal) {
      if (explicit && explicit.length > 0) {
        try {
          const explicitUrl = new URL(explicit);
          const currentOrigin = window.location.origin;
          if (explicitUrl.origin !== currentOrigin) {
            console.warn(
              `[API] VITE_BACKEND_URL (${explicitUrl.origin}) differs from frontend origin (${currentOrigin}). ` +
              "This can break cookie auth. Prefer same-origin deploys."
            );
          }
        } catch {
          console.warn("[API] VITE_BACKEND_URL is not a valid URL, falling back to same origin.");
        }
      }
      return explicit && explicit.length > 0 ? explicit : window.location.origin;
    }
  }

  if (explicit && explicit.length > 0) {
    return explicit;
  }

  return "http://localhost:3000";
})();

// Default timeout for requests (30 seconds)
const DEFAULT_TIMEOUT = 30000;

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

// Response envelope type - all app routes return { data: T }
interface ApiResponse<T> {
  data: T;
}

// Extended request options with timeout
interface RequestOptions extends RequestInit {
  timeout?: number;
}

// Token getter - used as a fallback when cookies are unavailable.
let getAuthToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  getAuthToken = getter;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

  // Get auth token if available
  const token = getAuthToken ? await getAuthToken() : null;

  const hasBody = fetchOptions.body !== undefined && fetchOptions.body !== null;
  const isFormData = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;
  const headers: HeadersInit = {
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...fetchOptions.headers,
  };

  const config: RequestInit = {
    ...fetchOptions,
    headers,
    credentials: "include",
  };

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let response: Response;
  try {
    response = await fetch(url, { ...config, signal: controller.signal });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new TimeoutError(`Request to ${endpoint} timed out after ${timeout}ms`);
      }
      throw new NetworkError(`Network error: ${error.message}`);
    }
    throw new NetworkError("An unknown network error occurred");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new ApiError(
      // Try app-route format first, fallback to generic message (Better Auth uses this)
      json?.error?.message || json?.message || `Request failed with status ${response.status}`,
      response.status,
      json?.error || json
    );
  }

  // 1. Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // 2. JSON responses: unwrap app envelope ({ data }) when present,
  // while also supporting raw JSON responses (Better Auth routes).
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json = await response.json();
    if (json && typeof json === "object" && "data" in (json as Record<string, unknown>)) {
      return (json as ApiResponse<T>).data;
    }
    return json as T;
  }

  // 3. Non-JSON: return undefined (caller should use api.raw() for these)
  return undefined as T;
}

// Raw request for non-JSON endpoints (uploads, downloads, streams)
async function rawRequest(endpoint: string, options: RequestOptions = {}): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

  // Get auth token if available
  const token = getAuthToken ? await getAuthToken() : null;

  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
    credentials: "include",
  };

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...config, signal: controller.signal });
    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new TimeoutError(`Request to ${endpoint} timed out after ${timeout}ms`);
      }
      throw new NetworkError(`Network error: ${error.message}`);
    }
    throw new NetworkError("An unknown network error occurred");
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),

  // Escape hatch for non-JSON endpoints
  raw: rawRequest,
};

// Sample endpoint types (extend as needed)
export interface SampleResponse {
  message: string;
  timestamp: string;
}

// Sample API functions
export const sampleApi = {
  getSample: () => api.get<SampleResponse>("/api/sample"),
};
