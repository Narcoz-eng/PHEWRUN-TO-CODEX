import { createAuthClient } from "better-auth/react";
import { useState, useEffect, useCallback, createContext, useContext, createElement } from "react";
import type { ReactNode } from "react";

const isLocalDevHost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1";

const getAppOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : null;

// Get the backend URL
const getBaseUrl = () => {
  // In local browser development, default to local backend unless explicitly overridden
  if (typeof window !== "undefined" && isLocalDevHost(window.location.hostname)) {
    return import.meta.env.VITE_LOCAL_BACKEND_URL || "http://localhost:3000";
  }

  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  if (typeof window !== "undefined" && window.location.hostname.endsWith(".vibecode.run")) {
    return window.location.origin;
  }

  return "http://localhost:3000";
};

const baseURL = getBaseUrl();
console.log("[Auth] Using backend URL:", baseURL);

// Create the Better Auth client
// Better Auth expects baseURL to be the server root, it appends /api/auth/* itself
export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth", // Explicitly set the auth path
  fetchOptions: {
    credentials: "include",
  },
});

console.log("[Auth] Better Auth client initialized with baseURL:", baseURL);

// Export auth functions from client
export const { signIn, signUp, signOut } = authClient;

// Auth user interface
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

// Session state
interface SessionState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Auth context
interface AuthContextType extends SessionState {
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Fetch session from backend using /api/me endpoint
// This endpoint uses our custom middleware that supports Bearer tokens
async function fetchSession(): Promise<AuthUser | null> {
  try {
    // Get token from localStorage as fallback for cross-origin issues
    const token = localStorage.getItem("auth-token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Use /api/me which supports Bearer token auth via our middleware
    const response = await fetch(`${baseURL}/api/me`, {
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      console.log("[Auth] Session response not ok:", response.status);
      // Clear invalid token
      if (response.status === 401) {
        localStorage.removeItem("auth-token");
      }
      return null;
    }

    const text = await response.text();
    console.log("[Auth] Session response text:", text);

    // Handle null or empty responses
    if (!text || text === "null" || text === "undefined") {
      return null;
    }

    try {
      const data = JSON.parse(text);

      // /api/me returns user data directly wrapped in { data: user }
      const user = data.data || data;
      if (user && user.id) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    } catch (parseError) {
      console.log("[Auth] Failed to parse session response:", parseError);
    }

    return null;
  } catch (error) {
    console.error("[Auth] Failed to fetch session:", error);
    return null;
  }
}

// Auth Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refetch = useCallback(async () => {
    try {
      const user = await fetchSession();
      setState({
        user,
        isLoading: false,
        isAuthenticated: !!user,
      });
    } catch {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
      // Clear stored token
      localStorage.removeItem("auth-token");
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error("[Auth] Logout error:", error);
      // Still clear local state on error
      localStorage.removeItem("auth-token");
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // Initial session check
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const user = await fetchSession();
      if (mounted) {
        setState({
          user,
          isLoading: false,
          isAuthenticated: !!user,
        });
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  return createElement(
    AuthContext.Provider,
    { value: { ...state, refetch, logout } },
    children
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return {
    user: context.user,
    isAuthenticated: context.isAuthenticated,
    isReady: !context.isLoading,
    isPending: context.isLoading,
    signOut: context.logout,
    refetch: context.refetch,
  };
}

// Session hook for ProtectedRoute/GuestRoute compatibility
export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSession must be used within AuthProvider");
  }

  return {
    data: context.user ? { user: context.user } : null,
    isPending: context.isLoading,
  };
}

// Legacy compatibility
export function usePrivyAuth() {
  const auth = useAuth();
  return {
    user: auth.user
      ? {
          id: auth.user.id,
          email: auth.user.email,
          walletAddress: null,
          linkedAccounts: [],
        }
      : null,
    isAuthenticated: auth.isAuthenticated,
    isReady: auth.isReady,
    login: () => console.warn("login() - use form-based login"),
    logout: auth.signOut,
  };
}

// Sign up function - use direct fetch for reliability
export async function signUpWithEmail(email: string, password: string, name: string) {
  console.log("[Auth] Attempting sign up for:", email);
  try {
    const response = await fetch(`${baseURL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, name }),
    });

    // Try to parse JSON, but handle empty responses
    let data: { message?: string; code?: string; token?: string; error?: { message?: string; code?: string }; [key: string]: unknown } | null = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        console.log("[Auth] Response is not JSON:", text);
      }
    }
    console.log("[Auth] Sign up response:", response.status, data);

    const payloadError = data?.error?.message || data?.error?.code;
    if (!response.ok || payloadError) {
      return { error: { message: payloadError || data?.message || data?.code || "Failed to create account" } };
    }

    // Store token in localStorage for cross-origin auth
    if (data?.token) {
      localStorage.setItem("auth-token", data.token);
    }

    return { data: data || { success: true } };
  } catch (error) {
    console.error("[Auth] Sign up error:", error);
    return { error: { message: error instanceof Error ? error.message : "Sign up failed" } };
  }
}

// Sign in function - use direct fetch for reliability
export async function signInWithEmail(email: string, password: string) {
  console.log("[Auth] Attempting sign in for:", email);
  try {
    const response = await fetch(`${baseURL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    // Try to parse JSON, but handle empty responses
    let data: { message?: string; code?: string; token?: string; error?: { message?: string; code?: string }; [key: string]: unknown } | null = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        console.log("[Auth] Response is not JSON:", text);
      }
    }
    console.log("[Auth] Sign in response:", response.status, data);

    const payloadError = data?.error?.message || data?.error?.code;
    if (!response.ok || payloadError) {
      return { error: { message: payloadError || data?.message || data?.code || "Invalid email or password" } };
    }

    // Store token in localStorage for cross-origin auth
    if (data?.token) {
      localStorage.setItem("auth-token", data.token);
    }

    return { data: data || { success: true } };
  } catch (error) {
    console.error("[Auth] Sign in error:", error);
    return { error: { message: error instanceof Error ? error.message : "Sign in failed" } };
  }
}

// Sign in with Google - use direct redirect
export async function signInWithGoogle() {
  console.log("[Auth] Redirecting to Google sign in");
  // Trigger Better Auth social sign-in flow (handles method/redirect contract)
  const origin = getAppOrigin() || baseURL;
  const result = await signIn.social({
    provider: "google",
    callbackURL: `${origin}/auth/callback`,
    errorCallbackURL: `${origin}/login?authError=google`,
  });

  if (result?.error) {
    throw new Error(result.error.message || "Failed to start Google sign-in");
  }
}

// Forgot password - request password reset email
export async function forgotPassword(email: string) {
  console.log("[Auth] Requesting password reset for:", email);
  try {
    const origin = getAppOrigin() || baseURL;
    const response = await fetch(`${baseURL}/api/auth/request-password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email,
        redirectTo: `${origin}/reset-password`,
      }),
    });

    let data: { message?: string; code?: string; error?: { message?: string; code?: string }; [key: string]: unknown } | null = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        console.log("[Auth] Response is not JSON:", text);
      }
    }
    console.log("[Auth] Forgot password response:", response.status, data);

    const payloadError = data?.error?.message || data?.error?.code;
    if (!response.ok || payloadError) {
      return { error: { message: payloadError || data?.message || data?.code || "Failed to send reset email" } };
    }

    return { data: data || { success: true } };
  } catch (error) {
    console.error("[Auth] Forgot password error:", error);
    return { error: { message: error instanceof Error ? error.message : "Failed to send reset email" } };
  }
}

// Reset password with token
export async function resetPassword(newPassword: string, token: string) {
  console.log("[Auth] Resetting password with token");
  try {
    const response = await fetch(`${baseURL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newPassword, token }),
    });

    let data: { message?: string; code?: string; error?: { message?: string; code?: string }; [key: string]: unknown } | null = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        console.log("[Auth] Response is not JSON:", text);
      }
    }
    console.log("[Auth] Reset password response:", response.status, data);

    const payloadError = data?.error?.message || data?.error?.code;
    if (!response.ok || payloadError) {
      return { error: { message: payloadError || data?.message || data?.code || "Failed to reset password" } };
    }

    return { data: data || { success: true } };
  } catch (error) {
    console.error("[Auth] Reset password error:", error);
    return { error: { message: error instanceof Error ? error.message : "Failed to reset password" } };
  }
}

// Check if running in an iframe
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
