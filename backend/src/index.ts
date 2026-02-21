import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import { setCookie } from "hono/cookie";
import { serveStatic } from "hono/bun";
import { hasPrivyConfig } from "./env";
import {
  betterAuthMiddleware,
  auth,
  AUTH_COOKIE_PREFIX,
  type AuthVariables,
} from "./auth";
import { prisma } from "./prisma";
import { postsRouter } from "./routes/posts";
import { usersRouter } from "./routes/users";
import { adminRouter } from "./routes/admin";
import { notificationsRouter } from "./routes/notifications";
import { announcementsRouter } from "./routes/announcements";
import { leaderboardRouter } from "./routes/leaderboard";
import {
  getBearerToken,
  getPrimaryPrivyEmail,
  getPrimaryPrivyWallet,
  getPrivyUserById,
  verifyPrivyAccessToken,
} from "./lib/privy";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

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

// Alpha Protocol Backend - SocialFi platform with Better Auth
const app = new Hono<{
  Variables: AuthVariables & { requestId?: string; sanitizedBody?: unknown; sanitizedQuery?: Record<string, string[]> };
}>();

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SESSION_COOKIE_NAMES = [`${AUTH_COOKIE_PREFIX}.session_token`, "better-auth.session_token"] as const;

// =====================================================
// Middleware Stack (order matters!)
// =====================================================

// 1. Request ID - for tracing and debugging
app.use("*", requestId());

// 2. Security Headers - protect against common vulnerabilities
const isProduction = process.env.NODE_ENV === "production";

function getSessionTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;

  const pairs = cookieHeader.split(";").map((part) => part.trim());
  for (const cookieName of SESSION_COOKIE_NAMES) {
    const prefix = `${cookieName}=`;
    const match = pairs.find((pair) => pair.startsWith(prefix));
    if (match) {
      return match.slice(prefix.length);
    }
  }

  return null;
}

function setSessionCookies(c: Parameters<typeof setCookie>[0], token: string) {
  const sameSite = isProduction ? "None" : "Lax";
  for (const cookieName of SESSION_COOKIE_NAMES) {
    setCookie(c, cookieName, token, {
      path: "/",
      httpOnly: true,
      sameSite,
      secure: isProduction,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }
}

function clearSessionCookies(c: Parameters<typeof setCookie>[0]) {
  const sameSite = isProduction ? "None" : "Lax";
  for (const cookieName of SESSION_COOKIE_NAMES) {
    setCookie(c, cookieName, "", {
      path: "/",
      httpOnly: true,
      sameSite,
      secure: isProduction,
      maxAge: 0,
    });
  }
}

async function createSessionForUser(
  c: Parameters<typeof setCookie>[0],
  userId: string
): Promise<string> {
  const now = new Date();
  const sessionToken =
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 32),
      token: sessionToken,
      userId,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress:
        c.req.header("x-forwarded-for") ||
        c.req.header("x-real-ip") ||
        "unknown",
      userAgent: c.req.header("user-agent") || "unknown",
    },
  });

  setSessionCookies(c, sessionToken);
  return sessionToken;
}
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
  /^https:\/\/phew\.vibecode\.run$/,
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
// Skip CSRF for Better Auth routes (it handles its own security)
app.use("/api/*", async (c, next) => {
  // Skip CSRF check for Better Auth routes
  if (c.req.path.startsWith("/api/auth/")) {
    return next();
  }
  return csrfProtection()(c, next);
});

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

// 10. Better Auth middleware - populates user from session cookie
app.use("*", betterAuthMiddleware);

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
// Wallet Authentication Routes (BEFORE Better Auth to take priority)
// =====================================================

// Verify Solana wallet signature
function verifySolanaSignature(
  message: string,
  signature: string,
  publicKeyStr: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKey = new PublicKey(publicKeyStr);
    const publicKeyBytes = publicKey.toBytes();

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

app.post("/api/auth/sync", async (c) => {
  try {
    if (!hasPrivyConfig) {
      return c.json(
        {
          error: {
            message: "Privy server auth is not configured",
            code: "PRIVY_NOT_CONFIGURED",
          },
        },
        500
      );
    }

    const privyToken = getBearerToken(c.req.header("Authorization"));
    if (!privyToken) {
      return c.json(
        {
          error: {
            message: "Missing Privy bearer token",
            code: "UNAUTHORIZED",
          },
        },
        401
      );
    }

    const claims = await verifyPrivyAccessToken(privyToken);
    if (!claims?.userId) {
      return c.json(
        {
          error: {
            message: "Invalid Privy token",
            code: "UNAUTHORIZED",
          },
        },
        401
      );
    }

    const now = new Date();
    const privyUser = await getPrivyUserById(claims.userId);
    const privyEmail = getPrimaryPrivyEmail(privyUser);
    const privyWallet = getPrimaryPrivyWallet(privyUser);

    let user = await prisma.user.findFirst({
      where: {
        accounts: {
          some: {
            providerId: "privy",
            accountId: claims.userId,
          },
        },
      },
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: claims.userId },
      });
    }

    if (!user && privyWallet) {
      user = await prisma.user.findFirst({
        where: { walletAddress: privyWallet },
      });
    }

    if (!user && privyEmail) {
      user = await prisma.user.findUnique({
        where: { email: privyEmail },
      });
    }

    if (!user) {
      const fallbackEmail = `${crypto
        .randomUUID()
        .replace(/-/g, "")}@privy.local`;
      const nameFromEmail = privyEmail?.split("@")[0];
      const defaultName = nameFromEmail
        ? nameFromEmail
        : privyWallet
          ? `${privyWallet.slice(0, 6)}...${privyWallet.slice(-4)}`
          : `user_${claims.userId.slice(-6)}`;

      user = await prisma.user.create({
        data: {
          id: claims.userId,
          email: privyEmail || fallbackEmail,
          name: defaultName,
          emailVerified: !!privyEmail,
          walletAddress: privyWallet || null,
          walletProvider: privyWallet ? "privy" : null,
          walletConnectedAt: privyWallet ? now : null,
          level: 0,
          xp: 0,
          isAdmin: false,
          isBanned: false,
          createdAt: now,
          updatedAt: now,
        },
      });
    } else {
      const updateData: {
        email?: string;
        emailVerified?: boolean;
        walletAddress?: string;
        walletProvider?: string;
        walletConnectedAt?: Date;
        updatedAt?: Date;
      } = {};

      if (privyEmail && user.email !== privyEmail) {
        const emailOwner = await prisma.user.findUnique({
          where: { email: privyEmail },
          select: { id: true },
        });
        if (!emailOwner || emailOwner.id === user.id) {
          updateData.email = privyEmail;
          updateData.emailVerified = true;
        }
      }

      if (privyWallet && user.walletAddress !== privyWallet) {
        const walletOwner = await prisma.user.findFirst({
          where: { walletAddress: privyWallet },
          select: { id: true },
        });
        if (!walletOwner || walletOwner.id === user.id) {
          updateData.walletAddress = privyWallet;
          updateData.walletProvider = "privy";
          updateData.walletConnectedAt = now;
        }
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = now;
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    const existingPrivyAccount = await prisma.account.findUnique({
      where: {
        providerId_accountId: {
          providerId: "privy",
          accountId: claims.userId,
        },
      },
    });

    if (!existingPrivyAccount) {
      await prisma.account.create({
        data: {
          id: crypto.randomUUID().replace(/-/g, "").slice(0, 32),
          accountId: claims.userId,
          providerId: "privy",
          userId: user.id,
          createdAt: now,
          updatedAt: now,
        },
      });
    } else if (existingPrivyAccount.userId !== user.id) {
      await prisma.account.update({
        where: { id: existingPrivyAccount.id },
        data: {
          userId: user.id,
          updatedAt: now,
        },
      });
    }

    const sessionToken = await createSessionForUser(c, user.id);

    return c.json({
      data: {
        token: sessionToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          walletAddress: user.walletAddress,
          walletProvider: user.walletProvider,
          level: user.level,
          xp: user.xp,
        },
      },
    });
  } catch (error) {
    console.error("Privy sync error:", error);
    return c.json(
      {
        error: {
          message: "Failed to sync authenticated user",
          code: "INTERNAL_ERROR",
        },
      },
      500
    );
  }
});

// Sign up / Sign in with wallet address
// This creates a user account using wallet address as identifier
app.post("/api/auth/wallet", async (c) => {
  try {
    const body = await c.req.json();
    const { walletAddress, walletProvider, signature, message } = body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return c.json(
        { error: { message: "Wallet address is required", code: "INVALID_INPUT" } },
        400
      );
    }

    // Validate wallet address format (Solana or EVM)
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;

    if (!solanaRegex.test(walletAddress) && !evmRegex.test(walletAddress)) {
      return c.json(
        { error: { message: "Invalid wallet address format", code: "INVALID_INPUT" } },
        400
      );
    }

    // For Solana wallets, verify the signature
    if (solanaRegex.test(walletAddress)) {
      if (!signature || !message) {
        return c.json(
          { error: { message: "Signature and message are required for wallet authentication", code: "INVALID_INPUT" } },
          400
        );
      }

      // Verify the signature
      const isValid = verifySolanaSignature(message, signature, walletAddress);
      if (!isValid) {
        return c.json(
          { error: { message: "Invalid signature. Please try again.", code: "INVALID_SIGNATURE" } },
          401
        );
      }

      // Verify the message contains the correct wallet address
      if (!message.includes(walletAddress)) {
        return c.json(
          { error: { message: "Message does not match wallet address", code: "INVALID_MESSAGE" } },
          401
        );
      }
    }

    // Check if user exists with this wallet
    let user = await prisma.user.findFirst({
      where: { walletAddress },
    });

    const now = new Date();

    if (!user) {
      // Create new user with wallet
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID().replace(/-/g, "").slice(0, 32),
          email: `${walletAddress.slice(0, 8).toLowerCase()}@wallet.local`,
          name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          walletAddress,
          walletProvider: walletProvider || "unknown",
          walletConnectedAt: now,
          emailVerified: false,
          level: 0,
          xp: 0,
          isAdmin: false,
          isBanned: false,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Create account record for Better Auth
      await prisma.account.create({
        data: {
          id: crypto.randomUUID().replace(/-/g, "").slice(0, 32),
          accountId: walletAddress,
          providerId: "wallet",
          userId: user.id,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    const sessionToken = await createSessionForUser(c, user.id);

    return c.json({
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        walletAddress: user.walletAddress,
        walletProvider: user.walletProvider,
        level: user.level,
        xp: user.xp,
      },
    });
  } catch (error) {
    console.error("Wallet auth error:", error);
    return c.json(
      { error: { message: "Failed to authenticate with wallet", code: "INTERNAL_ERROR" } },
      500
    );
  }
});

app.post("/api/auth/logout", async (c) => {
  try {
    const sessionToken =
      getSessionTokenFromCookie(c.req.header("Cookie")) ||
      getBearerToken(c.req.header("Authorization"));

    if (sessionToken) {
      await prisma.session.deleteMany({
        where: { token: sessionToken },
      });
    }

    clearSessionCookies(c);
    return c.json({ data: { success: true } });
  } catch (error) {
    console.error("Logout error:", error);
    return c.json(
      { error: { message: "Failed to log out", code: "INTERNAL_ERROR" } },
      500
    );
  }
});

// =====================================================
// Better Auth Routes
// =====================================================

// Mount Better Auth handler at /api/auth/*
// This handles: sign-up, sign-in, sign-out, session, etc.
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// =====================================================
// User Profile Routes (require auth)
// =====================================================

// Get current user - returns full user data from database
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
      isAdmin: true,
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

// Get current user stats - returns accuracy score and performance data
app.get("/api/me/stats", async (c) => {
  const user = c.get("user");
  if (!user) return c.body(null, 401);

  // Get all posts for total count
  const totalPosts = await prisma.post.count({
    where: { authorId: user.id },
  });

  // Get all settled posts with their settlement data
  const settledPosts = await prisma.post.findMany({
    where: {
      authorId: user.id,
      settled: true,
    },
    select: {
      id: true,
      isWin: true,
      isWin1h: true,
      isWin6h: true,
      percentChange1h: true,
      percentChange6h: true,
      settled: true,
      settled6h: true,
      settledAt: true,
      createdAt: true,
    },
    orderBy: { settledAt: "asc" },
  });

  // Calculate wins: A "win" is when isWin1h = true OR isWin6h = true
  const wins = settledPosts.filter(
    (post) => post.isWin1h === true || post.isWin6h === true
  ).length;
  const losses = settledPosts.length - wins;

  // Calculate accuracy score
  const accuracyScore =
    settledPosts.length > 0
      ? Math.round((wins / settledPosts.length) * 100 * 10) / 10
      : 0;

  // Calculate average percent change
  let totalPercentChange = 0;
  let validPercentChanges = 0;
  for (const post of settledPosts) {
    const percentChange = post.percentChange6h ?? post.percentChange1h;
    if (percentChange !== null) {
      totalPercentChange += percentChange;
      validPercentChanges++;
    }
  }
  const avgPercentChange =
    validPercentChanges > 0
      ? Math.round((totalPercentChange / validPercentChanges) * 100) / 100
      : null;

  // Calculate streaks
  let currentStreak = 0;
  let bestWinStreak = 0;
  let tempWinStreak = 0;

  const sortedPosts = [...settledPosts].sort((a, b) => {
    const dateA = a.settledAt ? new Date(a.settledAt).getTime() : 0;
    const dateB = b.settledAt ? new Date(b.settledAt).getTime() : 0;
    return dateA - dateB;
  });

  for (const post of sortedPosts) {
    const isWin = post.isWin1h === true || post.isWin6h === true;
    if (isWin) {
      tempWinStreak++;
      if (tempWinStreak > bestWinStreak) {
        bestWinStreak = tempWinStreak;
      }
    } else {
      tempWinStreak = 0;
    }
  }

  if (sortedPosts.length > 0) {
    const lastPost = sortedPosts[sortedPosts.length - 1];
    if (lastPost) {
      const lastWasWin = lastPost.isWin1h === true || lastPost.isWin6h === true;

      if (lastWasWin) {
        for (let i = sortedPosts.length - 1; i >= 0; i--) {
          const post = sortedPosts[i];
          if (post) {
            const isWin = post.isWin1h === true || post.isWin6h === true;
            if (isWin) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      } else {
        for (let i = sortedPosts.length - 1; i >= 0; i--) {
          const post = sortedPosts[i];
          if (post) {
            const isWin = post.isWin1h === true || post.isWin6h === true;
            if (!isWin) {
              currentStreak--;
            } else {
              break;
            }
          }
        }
      }
    }
  }

  // Calculate monthly change
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const currentMonthPosts = settledPosts.filter((post) => {
    const settledDate = post.settledAt ? new Date(post.settledAt) : null;
    return settledDate && settledDate >= currentMonthStart;
  });

  const lastMonthPosts = settledPosts.filter((post) => {
    const settledDate = post.settledAt ? new Date(post.settledAt) : null;
    return settledDate && settledDate >= lastMonthStart && settledDate <= lastMonthEnd;
  });

  const currentMonthWins = currentMonthPosts.filter(
    (post) => post.isWin1h === true || post.isWin6h === true
  ).length;
  const currentMonthAccuracy =
    currentMonthPosts.length > 0
      ? (currentMonthWins / currentMonthPosts.length) * 100
      : 0;

  const lastMonthWins = lastMonthPosts.filter(
    (post) => post.isWin1h === true || post.isWin6h === true
  ).length;
  const lastMonthAccuracy =
    lastMonthPosts.length > 0
      ? (lastMonthWins / lastMonthPosts.length) * 100
      : 0;

  const monthlyChange =
    lastMonthPosts.length > 0
      ? Math.round((currentMonthAccuracy - lastMonthAccuracy) * 10) / 10
      : null;

  // Calculate weekly stats (last 7 days)
  const weeklyStats: { date: string; dayLabel: string; wins: number; losses: number; total: number }[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayPosts = settledPosts.filter((post) => {
      const settledDate = post.settledAt ? new Date(post.settledAt) : null;
      return settledDate && settledDate >= date && settledDate < nextDate;
    });

    const dayWins = dayPosts.filter(
      (post) => post.isWin1h === true || post.isWin6h === true
    ).length;
    const dayLosses = dayPosts.length - dayWins;

    weeklyStats.push({
      date: date.toISOString().split("T")[0] ?? "",
      dayLabel: dayNames[date.getDay()] ?? "",
      wins: dayWins,
      losses: dayLosses,
      total: dayPosts.length,
    });
  }

  return c.json({
    data: {
      accuracyScore,
      totalPosts,
      settledPosts: settledPosts.length,
      wins,
      losses,
      avgPercentChange,
      streakCurrent: currentStreak,
      streakBest: bestWinStreak,
      monthlyChange,
      weeklyStats,
    },
  });
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
// Static File Serving (Production Only)
// =====================================================
// In production, serve the frontend build from ../webapp/dist
if (process.env.NODE_ENV === "production") {
  // Serve static assets (JS, CSS, images, etc.)
  app.use("/assets/*", serveStatic({ root: "../webapp/dist" }));
  app.use("/favicon.ico", serveStatic({ root: "../webapp/dist", path: "favicon.ico" }));
  app.use("/robots.txt", serveStatic({ root: "../webapp/dist", path: "robots.txt" }));
  app.use("/og-base.png", serveStatic({ root: "../webapp/dist", path: "og-base.png" }));
  app.use("/placeholder.svg", serveStatic({ root: "../webapp/dist", path: "placeholder.svg" }));

  // Fallback to index.html for client-side routing (SPA)
  // This must come after API routes and static assets
  app.get("*", serveStatic({ root: "../webapp/dist", path: "index.html" }));
}

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
  Auth: Better Auth (email/password)
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
//
// IMPLEMENTED:
// - [x] Structured logging with JSON format in production
// - [x] Input sanitization middleware
// - [x] CSRF protection with Origin/Referer validation
// - [x] Endpoint-specific rate limits
// - [x] Security headers (HSTS, CSP, etc.)
// - [x] Slow query logging in Prisma
// - [x] Environment validation on startup
// - [x] Better Auth for email/password authentication
// =====================================================

export default {
  port,
  fetch: app.fetch,
};
