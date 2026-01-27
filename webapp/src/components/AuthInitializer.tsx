import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { setAuthTokenGetter, api } from "@/lib/api";

interface AuthInitializerProps {
  children: React.ReactNode;
}

/**
 * Initializes the auth token getter for the API client
 * and syncs the user with the backend after login
 */
export function AuthInitializer({ children }: AuthInitializerProps) {
  const { getAccessToken, authenticated, ready, user } = usePrivy();
  const [synced, setSynced] = useState(false);
  const syncingRef = useRef(false);

  // Set up the auth token getter
  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        const token = await getAccessToken();
        return token;
      } catch (error) {
        console.error("Failed to get access token:", error);
        return null;
      }
    });
  }, [getAccessToken]);

  // Sync user with backend after authentication
  useEffect(() => {
    async function syncUser() {
      if (!authenticated || !ready || !user || syncingRef.current) return;

      syncingRef.current = true;

      try {
        const token = await getAccessToken();
        if (!token) {
          console.error("No access token available for sync");
          return;
        }

        // Extract user info from Privy user object
        let email: string | null = null;

        for (const account of user.linkedAccounts || []) {
          if (account.type === "email" && "address" in account) {
            email = String(account.address);
          }
        }

        // Sync user with backend, passing the user info
        await api.post("/api/auth/sync", { email });
        setSynced(true);
      } catch (error) {
        console.error("Failed to sync user with backend:", error);
        // Still allow the app to load even if sync fails
        setSynced(true);
      } finally {
        syncingRef.current = false;
      }
    }

    if (authenticated && ready && user && !synced) {
      syncUser();
    }

    // Reset synced state when user logs out
    if (!authenticated && synced) {
      setSynced(false);
    }
  }, [authenticated, ready, user, getAccessToken, synced]);

  return <>{children}</>;
}
