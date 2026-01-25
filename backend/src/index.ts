import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import {
  privyAuth,
  type AuthVariables,
} from "./auth";
import { prisma } from "./prisma";
import { postsRouter } from "./routes/posts";
import { usersRouter } from "./routes/users";
import { adminRouter } from "./routes/admin";
import { notificationsRouter } from "./routes/notifications";
import { announcementsRouter } from "./routes/announcements";
import { leaderboardRouter } from "./routes/leaderboard";

// Security middleware imports
import {
  securityHeaders,
  requestId,
  logProductionStatus,
  createErrorHandler,
  apiRateLimit,
  authRateLimit,
  adminRateLimit,
  leaderboardRateLimit,
  postCreationRateLimit,
  commentRateLimit,
  startRateLimitCleanup,
  sanitizeBody,
  sanitizeQuery,
  csrfProtection,
  structuredLogger,
} from "./middleware";

// =====================================================
// Production Environment Validation
// =====================================================
// Log security status on startup
logProductionStatus();

// Start rate limit cleanup (cleans expired entries every minute)
startRateLimitCleanup(60000);

// =====================================================
// App Configuration
// =====================================================

// Alpha Protocol Backend - SocialFi platform with Privy Auth
const app = new Hono<{
  Variables: AuthVariables & { requestId?: string; sanitizedBody?: unknown; sanitizedQuery?: Record<string, string[]> };
}>();

// =====================================================
// Middleware Stack (order matters!)
// =====================================================

// 1. Request ID - for tracing and debugging
app.use("*", requestId());

// 2. Security Headers - protect against common vulnerabilities
const isProduction = process.env.NODE_ENV === "production";
app.use(
  "*",
  securityHeaders({
    hsts: isProduction, // Only enable HSTS in production
  })
);

// 3. CORS - Production-ready, validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/phew\.run$/,
  /^https:\/\/www\.phew\.run$/,
  /^https:\/\/[a-z0-9-]+\.phew\.run$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

// 4. Input Sanitization - sanitize request bodies and query params
app.use("/api/*", sanitizeBody());
app.use("/api/*", sanitizeQuery());

// 5. CSRF Protection - validate origin for state-changing requests
app.use("/api/*", csrfProtection());

// 6. Global API Rate Limit - 100 requests per minute per client
// Protects against abuse and DoS
app.use("/api/*", apiRateLimit);

// 7. Endpoint-specific rate limits (more restrictive, applied before general limit)
// Auth endpoints - 10 req/5min (brute force protection)
app.use("/api/auth/*", authRateLimit);
// Admin endpoints - 50 req/min
app.use("/api/admin/*", adminRateLimit);
// Leaderboard endpoints - 60 req/min (expensive queries)
app.use("/api/leaderboard/*", leaderboardRateLimit);

// 8. Structured Logging
app.use("*", structuredLogger({
  level: isProduction ? "slow" : "all",
  slowThreshold: 1000,
  skipPaths: ["/health"],
}));

// 9. Global error handler - doesn't leak stack traces in production
app.onError(createErrorHandler());

// 10. Privy Auth middleware - populates user from JWT token
app.use("*", privyAuth);

// =====================================================
// Health Check
// =====================================================
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    // Don't expose version in production for security
    ...(isProduction ? {} : { version: "1.0.0" }),
  });
});

// =====================================================
// Auth Routes
// =====================================================

// Auth sync endpoint - creates or updates user in database from Privy token
app.post("/api/auth/sync", async (c) => {
  const user = c.get("user");
  const privyToken = c.get("privyToken");

  if (!user || !privyToken) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  // Get user info from request body (passed from frontend which has the data)
  let email: string | null = null;
  let walletAddress: string | null = null;

  try {
    const body = await c.req.json();
    email = body.email || null;
    walletAddress = body.walletAddress || null;
  } catch {
    // Body might be empty, that's fine
  }

  try {
    // Check if user exists by Privy ID
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (dbUser) {
      // Only update fields that won't cause unique constraint issues
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      // Only update walletAddress if provided and different
      if (walletAddress && walletAddress !== dbUser.walletAddress) {
        updateData.walletAddress = walletAddress;
      }

      // Only update email if it's different AND not already taken by another user
      if (email && email !== dbUser.email) {
        const existingEmailUser = await prisma.user.findUnique({
          where: { email },
        });
        if (!existingEmailUser || existingEmailUser.id === user.id) {
          updateData.email = email;
        }
      }

      if (Object.keys(updateData).length > 1) {
        // More than just updatedAt
        dbUser = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    } else {
      // Create new user
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          name: email?.split("@")[0] || `User ${user.id.slice(-6)}`,
          email: email || `${user.id}@privy.io`,
          emailVerified: email ? true : false,
          walletAddress: walletAddress,
          level: 0,
          xp: 0,
        },
      });
    }

    return c.json({
      data: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.image,
        walletAddress: dbUser.walletAddress,
        username: dbUser.username,
        level: dbUser.level,
        xp: dbUser.xp,
        bio: dbUser.bio,
        isAdmin: dbUser.isAdmin,
        createdAt: dbUser.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return c.json(
      { error: { message: "Failed to sync user", code: "SYNC_FAILED" } },
      500
    );
  }
});

// Get current user
app.get("/api/me", async (c) => {
  const user = c.get("user");
  if (!user) return c.body(null, 401);

  // Fetch full user data from database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      walletAddress: true,
      username: true,
      level: true,
      xp: true,
      bio: true,
      createdAt: true,
    },
  });

  if (!dbUser) {
    return c.json(
      { error: { message: "User not found", code: "NOT_FOUND" } },
      404
    );
  }

  return c.json({ data: dbUser });
});

// =====================================================
// API Routes
// =====================================================

// Apply method-specific rate limits for posts and comments
// POST /api/posts - 10 posts/hour
app.post("/api/posts", postCreationRateLimit);
// POST /api/posts/:id/comments - 30 comments/hour
app.post("/api/posts/:id/comments", commentRateLimit);

app.route("/api/posts", postsRouter);
app.route("/api/users", usersRouter);
app.route("/api/admin", adminRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/announcements", announcementsRouter);
app.route("/api/leaderboard", leaderboardRouter);

// =====================================================
// Server Configuration
// =====================================================
const port = Number(process.env.PORT) || 3000;

// Log startup info
console.log(`
====================================
  Alpha Protocol Backend
====================================
  Port: ${port}
  Environment: ${process.env.NODE_ENV || "development"}
  Database: ${process.env.DATABASE_URL?.includes("file:") ? "SQLite (file)" : "External DB"}
====================================
`);

// =====================================================
// TODO: Production Improvements
// =====================================================
// - [ ] Use Redis for rate limiting in production (distributed)
// - [ ] Add APM integration (DataDog, New Relic, etc.)
// - [ ] Set up health check improvements (database connectivity, external services)
// - [ ] Add request body size limits
// - [ ] Implement IP allowlisting for admin endpoints
// - [ ] Add webhook signature verification for Privy events
//
// IMPLEMENTED:
// - [x] Structured logging with JSON format in production
// - [x] Input sanitization middleware
// - [x] CSRF protection with Origin/Referer validation
// - [x] Endpoint-specific rate limits
// - [x] Security headers (HSTS, CSP, etc.)
// - [x] Slow query logging in Prisma
// - [x] Environment validation on startup
// =====================================================

export default {
  port,
  fetch: app.fetch,
};
