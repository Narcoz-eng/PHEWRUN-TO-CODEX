import { PrivyClient, type AuthTokenClaims, type User as PrivyUser } from "@privy-io/server-auth";
import { env, hasPrivyConfig } from "../env";

let privyClient: PrivyClient | null = null;

export function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function getPrivyClient(): PrivyClient | null {
  if (!hasPrivyConfig) {
    return null;
  }

  if (!privyClient) {
    privyClient = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_APP_SECRET);
  }

  return privyClient;
}

export async function verifyPrivyAccessToken(token: string): Promise<AuthTokenClaims | null> {
  const client = getPrivyClient();
  if (!client || !token) {
    return null;
  }

  try {
    return await client.verifyAuthToken(token);
  } catch {
    return null;
  }
}

export async function getPrivyUserById(userId: string): Promise<PrivyUser | null> {
  const client = getPrivyClient();
  if (!client) {
    return null;
  }

  try {
    return await client.getUserById(userId);
  } catch (error) {
    console.error("[Privy] Failed to fetch user by ID:", error);
    return null;
  }
}

export function getPrimaryPrivyEmail(user: PrivyUser | null): string | null {
  if (!user) return null;

  if (user.email?.address) {
    return user.email.address.toLowerCase();
  }

  for (const account of user.linkedAccounts) {
    if (account.type === "email" && "address" in account && account.address) {
      return String(account.address).toLowerCase();
    }
  }

  return null;
}

export function getPrimaryPrivyWallet(user: PrivyUser | null): string | null {
  if (!user) return null;

  if (user.wallet?.address) {
    return user.wallet.address;
  }

  for (const account of user.linkedAccounts) {
    if (account.type === "wallet" && "address" in account && account.address) {
      return String(account.address);
    }
  }

  return null;
}
