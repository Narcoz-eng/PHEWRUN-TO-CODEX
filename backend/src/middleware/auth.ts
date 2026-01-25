import { createMiddleware } from "hono/factory";
import { PrivyClient, type AuthTokenClaims, type User as PrivyApiUser } from "@privy-io/server-auth";

// Define the user type that will be available in context
export interface PrivyUser {
  id: string; // Privy user ID (from token.userId)
  privyId: string; // Same as id, kept for clarity
  email: string | null;
  walletAddress: string | null;
}

// Type for the Hono context variables
export type AuthVariables = {
  user: PrivyUser | null;
  privyToken: AuthTokenClaims | null;
};

// Initialize Privy client - created fresh each time to pick up env changes
function getPrivyClient(): PrivyClient {
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be set");
  }

  return new PrivyClient(appId, appSecret);
}

/**
 * Extract email from Privy user's linked accounts
 */
function extractEmail(privyUser: PrivyApiUser): string | null {
  if (!privyUser.linkedAccounts) return null;

  for (const account of privyUser.linkedAccounts) {
    if (account.type === "email" && "address" in account) {
      return (account as { address: string }).address;
    }
  }
  return null;
}

/**
 * Extract wallet address from Privy user's linked accounts
 */
function extractWalletAddress(privyUser: PrivyApiUser): string | null {
  if (!privyUser.linkedAccounts) return null;

  for (const account of privyUser.linkedAccounts) {
    if (account.type === "wallet" && "address" in account) {
      return (account as { address: string }).address;
    }
  }
  return null;
}

/**
 * Auth middleware that verifies Privy JWT tokens
 * Sets user to null if no token or invalid token
 * Does NOT block requests - use requireAuth for protected routes
 */
export const privyAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      c.set("user", null);
      c.set("privyToken", null);
      return next();
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      const client = getPrivyClient();
      const claims = await client.verifyAuthToken(token);

      // Create user from token claims - don't make extra API calls
      // The user details will be synced via /api/auth/sync
      const user: PrivyUser = {
        id: claims.userId,
        privyId: claims.userId,
        email: null, // Will be populated from database
        walletAddress: null, // Will be populated from database
      };

      c.set("user", user);
      c.set("privyToken", claims);
    } catch (error) {
      console.error("Failed to verify Privy token:", error);
      c.set("user", null);
      c.set("privyToken", null);
    }

    return next();
  }
);

/**
 * Middleware that requires authentication
 * Returns 401 if no valid token
 */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        401
      );
    }

    return next();
  }
);

/**
 * Verify a Privy token and return the claims
 * Useful for the /api/auth/sync endpoint
 */
export async function verifyPrivyToken(
  token: string
): Promise<AuthTokenClaims | null> {
  try {
    const client = getPrivyClient();
    return await client.verifyAuthToken(token);
  } catch (error) {
    console.error("Failed to verify Privy token:", error);
    return null;
  }
}

/**
 * Get full user info from Privy API
 */
export async function getPrivyUserById(userId: string): Promise<PrivyUser | null> {
  try {
    const client = getPrivyClient();
    const privyUser = await client.getUserById(userId);

    return {
      id: privyUser.id,
      privyId: privyUser.id,
      email: extractEmail(privyUser),
      walletAddress: extractWalletAddress(privyUser),
    };
  } catch (error) {
    console.error("Failed to get Privy user:", error);
    return null;
  }
}

// Re-export the Privy client getter for direct usage
export { getPrivyClient };
