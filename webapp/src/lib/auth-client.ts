import { usePrivy, useLogout } from "@privy-io/react-auth";
import { useMemo, useState, useEffect } from "react";
import { api } from "@/lib/api";

// Re-export the raw usePrivy hook for advanced usage
export { usePrivy } from "@privy-io/react-auth";

export interface PrivyAuthUser {
  id: string;
  email: string | null;
  walletAddress: string | null;
  linkedAccounts: {
    type: string;
    address?: string;
    email?: string;
  }[];
}

export interface PrivyAuthState {
  user: PrivyAuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

/**
 * Custom hook that provides a simplified auth interface for Privy
 */
export function usePrivyAuth(): PrivyAuthState {
  const { user, authenticated, ready, login } = usePrivy();
  const { logout: privyLogout } = useLogout();

  const authUser = useMemo<PrivyAuthUser | null>(() => {
    if (!user) return null;

    const emailAccount = user.linkedAccounts.find(
      (account) => account.type === "email"
    );
    const email: string | null =
      emailAccount && "address" in emailAccount
        ? String(emailAccount.address ?? "")
        : null;

    let walletAddress: string | null = null;
    for (const account of user.linkedAccounts) {
      if (account.type === "wallet" && "address" in account && account.address) {
        walletAddress = String(account.address);
        break;
      }
    }

    const linkedAccounts = user.linkedAccounts.map((account) => ({
      type: account.type,
      address: "address" in account ? String(account.address) : undefined,
      email:
        account.type === "email" && "address" in account
          ? String(account.address)
          : undefined,
    }));

    return {
      id: user.id,
      email: email || null,
      walletAddress,
      linkedAccounts,
    };
  }, [user]);

  const logout = async () => {
    try {
      await api.post<{ success: boolean }>("/api/auth/logout");
    } catch (error) {
      console.warn("Backend logout failed, continuing with Privy logout:", error);
    }
    await privyLogout();
  };

  return {
    user: authUser,
    isAuthenticated: authenticated,
    isReady: ready,
    login,
    logout,
  };
}

// useSession hook with timeout fallback
export function useSession() {
  const { user, isAuthenticated, isReady } = usePrivyAuth();
  const [forceReady, setForceReady] = useState(false);

  // If Privy doesn't become ready after 2 seconds, force ready state
  // This prevents infinite loading when Privy has issues
  useEffect(() => {
    if (isReady) return;

    const timeout = setTimeout(() => {
      console.log("Privy timeout - forcing ready state");
      setForceReady(true);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [isReady]);

  const effectiveReady = isReady || forceReady;

  return {
    data: isAuthenticated && user ? { user } : null,
    isPending: !effectiveReady,
  };
}

// Legacy compatibility
export async function signOut() {
  console.warn("signOut() called outside of React context. Use usePrivyAuth().logout instead.");
}
