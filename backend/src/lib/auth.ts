import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import * as nodemailer from "nodemailer";
import { betterAuthUrl, env, hasGoogleOAuth, hasSmtpConfig } from "../env";
import { prisma } from "../prisma";

/**
 * Better Auth configuration
 *
 * This replaces Privy authentication with Better Auth's email/password flow.
 * Better Auth handles sessions automatically via cookies.
 */
export const AUTH_COOKIE_PREFIX = "auth";

const smtpPort = Number.parseInt(env.SMTP_PORT, 10);
const smtpTransporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number.isFinite(smtpPort) ? smtpPort : 587,
      secure: env.SMTP_SECURE === "true",
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

async function sendResetPasswordEmail(email: string, url: string) {
  if (!smtpTransporter) {
    // Development fallback when SMTP is not configured
    console.warn(`[Auth] SMTP not configured. Password reset requested for ${email}`);
    console.warn(`[Auth] Reset URL: ${url}`);
    return;
  }

  await smtpTransporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Reset your Just a Phew password",
    text: `You requested a password reset for your Just a Phew account.\n\nReset your password: ${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">Reset your password</h2>
        <p>You requested a password reset for your Just a Phew account.</p>
        <p style="margin: 20px 0;">
          <a href="${url}" style="background:#111; color:#fff; text-decoration:none; padding:12px 16px; border-radius:6px; display:inline-block;">
            Reset Password
          </a>
        </p>
        <p>If the button does not work, copy this URL into your browser:</p>
        <p style="word-break: break-all;">${url}</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

if (!hasGoogleOAuth) {
  console.warn("[Auth] Google OAuth is disabled. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),

  // Base URL for Better Auth endpoints and OAuth callbacks
  baseURL: betterAuthUrl,

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    // Require email verification before login
    requireEmailVerification: false,
    // Password requirements
    minPasswordLength: 8,
    // Password reset configuration
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },

  ...(hasGoogleOAuth
    ? {
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            // Force account selection on each login
            prompt: "select_account",
            // Must match the URI configured in Google Cloud Console
            redirectURI: `${betterAuthUrl}/api/auth/callback/google`,
          },
        },
      }
    : {}),

  // Session configuration
  session: {
    // Cookie-based sessions
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },

  // Better Auth trusted origins for callbacks and auth actions
  trustedOrigins: Array.from(new Set([
    env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "https://preview-vzniiddqqxtf.dev.vibecode.run",
    "https://qkopfoiaakof.dev.vibecode.run",
    "https://phew.vibecode.run",
    "https://phew.run",
    "https://www.phew.run",
    // Wildcard patterns for Vibecode domains
    "https://*.dev.vibecode.run",
    "https://*.vibecode.run",
    "https://*.vibecodeapp.com",
  ])),

  // Advanced options
  advanced: {
    // Use less restrictive cookie settings for development
    cookiePrefix: AUTH_COOKIE_PREFIX,
    useSecureCookies: env.NODE_ENV === "production",
  },

  // User configuration - map to existing User model
  user: {
    // Additional fields to store on user
    additionalFields: {
      walletAddress: {
        type: "string",
        required: false,
      },
      walletProvider: {
        type: "string",
        required: false,
      },
      walletConnectedAt: {
        type: "date",
        required: false,
      },
      username: {
        type: "string",
        required: false,
      },
      level: {
        type: "number",
        required: false,
        defaultValue: 0,
      },
      xp: {
        type: "number",
        required: false,
        defaultValue: 0,
      },
      bio: {
        type: "string",
        required: false,
      },
      isAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      isBanned: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      lastUsernameUpdate: {
        type: "date",
        required: false,
      },
      lastPhotoUpdate: {
        type: "date",
        required: false,
      },
    },
  },
});

// Export auth types
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
