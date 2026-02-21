/**
 * Centralized allowed-origin logic shared by CORS and CSRF middleware.
 * `ALLOWED_ORIGINS` should be a comma-separated list of exact origins.
 */
const DEFAULT_ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/i,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/i,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^https:\/\/phew\.run$/i,
  /^https:\/\/www\.phew\.run$/i,
  /^https:\/\/[a-z0-9-]+\.phew\.run$/i,
];

function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getEnvAllowedOrigins(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS ?? "";
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(toOrigin)
    .filter((value): value is string => value !== null);
  return new Set(values);
}

function getRuntimeAllowedOrigins(): Set<string> {
  const candidates = [
    process.env.BACKEND_URL,
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ]
    .filter(Boolean)
    .map((value) => toOrigin(String(value)))
    .filter((value): value is string => value !== null);

  return new Set(candidates);
}

const envAllowedOrigins = getEnvAllowedOrigins();
const runtimeAllowedOrigins = getRuntimeAllowedOrigins();

export function isOriginAllowed(origin: string): boolean {
  if (envAllowedOrigins.has(origin) || runtimeAllowedOrigins.has(origin)) {
    return true;
  }
  return DEFAULT_ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

export function getAllowedOriginsForLogs(): string[] {
  return [
    ...Array.from(envAllowedOrigins.values()),
    ...Array.from(runtimeAllowedOrigins.values()),
  ];
}
