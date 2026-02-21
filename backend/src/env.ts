import { z } from "zod";

/**
 * Environment variable schema using Zod
 * This ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().optional().default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
  BACKEND_URL: z.string().url("BACKEND_URL must be a valid URL").default("http://localhost:3000"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL").optional(),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").optional().default("http://localhost:5173"),

  // Database
  DATABASE_URL: z.string().default("file:./dev.db"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),

  // SMTP (forgot password emails)
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.string().optional().default("587"),
  SMTP_SECURE: z.enum(["true", "false"]).optional().default("false"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default(""),

  // Optional: Debug mode
  DEBUG: z.enum(["true", "false"]).optional().default("false"),

  // Optional: Log level
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional().default("info"),
});

/**
 * Additional production-specific validations
 */
function validateProductionConfig(parsed: z.infer<typeof envSchema>): string[] {
  const warnings: string[] = [];
  const hasGoogleClientId = parsed.GOOGLE_CLIENT_ID.length > 0;
  const hasGoogleClientSecret = parsed.GOOGLE_CLIENT_SECRET.length > 0;
  const hasAnySmtpField =
    parsed.SMTP_HOST.length > 0 ||
    parsed.SMTP_USER.length > 0 ||
    parsed.SMTP_PASS.length > 0 ||
    parsed.SMTP_FROM.length > 0;
  const hasFullSmtpConfig =
    parsed.SMTP_HOST.length > 0 &&
    parsed.SMTP_USER.length > 0 &&
    parsed.SMTP_PASS.length > 0 &&
    parsed.SMTP_FROM.length > 0;

  if (parsed.NODE_ENV === "production") {
    // Check for secure database URL
    if (parsed.DATABASE_URL.includes("file:") || parsed.DATABASE_URL.includes("dev.db")) {
      warnings.push("Using file-based SQLite in production. Consider using a managed database.");
    }

    // Check for HTTPS in BACKEND_URL
    if (parsed.BACKEND_URL.startsWith("http://") && !parsed.BACKEND_URL.includes("localhost")) {
      warnings.push("BACKEND_URL is using HTTP instead of HTTPS in production");
    }

    // Check debug mode
    if (parsed.DEBUG === "true") {
      warnings.push("DEBUG mode is enabled in production");
    }

    if (!hasFullSmtpConfig) {
      warnings.push("SMTP is not fully configured. Forgot-password emails will not be sent.");
    }
  }

  if (hasGoogleClientId !== hasGoogleClientSecret) {
    warnings.push("Google OAuth is partially configured. Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
  }

  if (hasAnySmtpField && !hasFullSmtpConfig) {
    warnings.push("SMTP is partially configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
  }

  return warnings;
}

/**
 * Get safe configuration for logging (no secrets)
 */
function getSafeConfig(parsed: z.infer<typeof envSchema>): Record<string, string> {
  return {
    PORT: parsed.PORT,
    NODE_ENV: parsed.NODE_ENV,
    BACKEND_URL: parsed.BACKEND_URL,
    DATABASE_URL: parsed.DATABASE_URL.includes("file:")
      ? "SQLite (file-based)"
      : "External database",
    BETTER_AUTH_URL: parsed.BETTER_AUTH_URL || "(uses BACKEND_URL)",
    FRONTEND_URL: parsed.FRONTEND_URL,
    GOOGLE_OAUTH: parsed.GOOGLE_CLIENT_ID && parsed.GOOGLE_CLIENT_SECRET ? "enabled" : "disabled",
    SMTP: parsed.SMTP_HOST && parsed.SMTP_USER && parsed.SMTP_PASS && parsed.SMTP_FROM ? "enabled" : "disabled",
    DEBUG: parsed.DEBUG,
    LOG_LEVEL: parsed.LOG_LEVEL,
  };
}

/**
 * Validate and parse environment variables
 */
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    const warnings = validateProductionConfig(parsed);

    // Log configuration on startup (without secrets)
    console.log("\n=== Environment Configuration ===");
    const safeConfig = getSafeConfig(parsed);
    for (const [key, value] of Object.entries(safeConfig)) {
      console.log(`  ${key}: ${value}`);
    }
    console.log("=================================\n");

    // Log warnings
    if (warnings.length > 0) {
      console.warn("Environment Warnings:");
      warnings.forEach((warn) => {
        console.warn(`  - ${warn}`);
      });
      console.warn("");
    }

    if (parsed.NODE_ENV === "production") {
      console.log("Running in PRODUCTION mode");
    } else {
      console.log("Environment variables validated successfully");
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Environment variable validation failed:");
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      console.error("\nPlease check your .env file and ensure all required variables are set.");
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Validated and typed environment variables
 */
export const env = validateEnv();

/**
 * Type of the validated environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Helper to check if we're in production
 */
export const isProduction = env.NODE_ENV === "production";

/**
 * Helper to check if debug mode is enabled
 */
export const isDebug = env.DEBUG === "true";

/**
 * Better Auth base URL - supports BETTER_AUTH_URL override
 */
export const betterAuthUrl = env.BETTER_AUTH_URL || env.BACKEND_URL;

/**
 * Whether Google OAuth is configured
 */
export const hasGoogleOAuth =
  env.GOOGLE_CLIENT_ID.length > 0 &&
  env.GOOGLE_CLIENT_SECRET.length > 0;

/**
 * Whether SMTP email delivery is configured
 */
export const hasSmtpConfig =
  env.SMTP_HOST.length > 0 &&
  env.SMTP_USER.length > 0 &&
  env.SMTP_PASS.length > 0 &&
  env.SMTP_FROM.length > 0;
