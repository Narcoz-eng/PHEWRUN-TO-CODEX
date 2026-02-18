import { createAuthClient } from "better-auth/react";
import { useEffect, useMemo, useState } from "react";
import { api, setAuthTokenGetter } from "@/lib/api";

const AUTH_TOKEN_STORAGE_KEY = "auth.session_token";

function resolveAuthBaseUrl() {
  const explicit = import.meta.env.VITE_BACKEND_URL?.trim();

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (!isLocal) {
      return explicit && explicit.length > 0 ? explicit : window.location.origin;
    }
  }

  if (explicit && explicit.length > 0) {
    return explicit;
  }

  return "http://localhost:3000";
}

export const authBaseUrl = resolveAuthBaseUrl();

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
});

let memorySessionToken: string | null = null;

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return fallback;
}

function extractPayloadError(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  if (!("error" in result)) return null;
  const payload = (result as { error?: unknown }).error;
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  if (typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return "Authentication request failed";
}

function unwrapPayload<T>(result: unknown): T | null {
  if (!result) return null;
  if (typeof result === "object" && "data" in (result as Record<string, unknown>)) {
    return ((result as { data?: T | null }).data ?? null) as T | null;
  }
  return result as T;
}

function extractToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const token = (payload as { token?: unknown }).token;
  if (typeof token === "string" && token.trim().length > 0) {
    return token;
  }
  return null;
}

function extractUser(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const maybeUser = (payload as { user?: unknown }).user;
  if (maybeUser && typeof maybeUser === "object") {
    return maybeUser as Record<string, unknown>;
  }
  return null;
}

export function getStoredSessionToken() {
  if (memorySessionToken) {
    return memorySessionToken;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    memorySessionToken = token;
  }
  return token;
}

export function setStoredSessionToken(token: string | null) {
  memorySessionToken = token && token.trim().length > 0 ? token : null;

  if (typeof window === "undefined") {
    return;
  }

  if (memorySessionToken) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, memorySessionToken);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

setAuthTokenGetter(async () => getStoredSessionToken());

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  walletAddress: string | null;
  username: string | null;
  level: number;
  xp: number;
  bio: string | null;
}

interface SessionResponse {
  user: AuthUser;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeUser(raw: Record<string, unknown> | null | undefined): AuthUser | null {
  if (!raw) return null;
  const id = raw.id;
  if (typeof id !== "string" || id.length === 0) {
    return null;
  }

  return {
    id,
    name: typeof raw.name === "string" ? raw.name : null,
    email: typeof raw.email === "string" ? raw.email : null,
    image: typeof raw.image === "string" ? raw.image : null,
    walletAddress: typeof raw.walletAddress === "string" ? raw.walletAddress : null,
    username: typeof raw.username === "string" ? raw.username : null,
    level: toNumber(raw.level, 0),
    xp: toNumber(raw.xp, 0),
    bio: typeof raw.bio === "string" ? raw.bio : null,
  };
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/",
      rememberMe: true,
    });

    const payloadError = extractPayloadError(result);
    if (payloadError) {
      throw new Error(payloadError);
    }

    const payload = unwrapPayload<Record<string, unknown>>(result);
    const token = extractToken(payload);
    if (token) {
      setStoredSessionToken(token);
    }

    return payload;
  } catch (error) {
    throw new Error(normalizeErrorMessage(error, "Failed to sign in"));
  }
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  try {
    const result = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/",
      rememberMe: true,
    });

    const payloadError = extractPayloadError(result);
    if (payloadError) {
      throw new Error(payloadError);
    }

    const payload = unwrapPayload<Record<string, unknown>>(result);
    const token = extractToken(payload);
    if (token) {
      setStoredSessionToken(token);
    }

    return payload;
  } catch (error) {
    throw new Error(normalizeErrorMessage(error, "Failed to create account"));
  }
}

export async function signInWithGoogle() {
  try {
    const callbackURL =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "/auth/callback";
    const errorCallbackURL =
      typeof window !== "undefined"
        ? `${window.location.origin}/login?oauth=error`
        : "/login?oauth=error";

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      newUserCallbackURL: callbackURL,
      errorCallbackURL,
      disableRedirect: true,
    });

    const payloadError = extractPayloadError(result);
    if (payloadError) {
      throw new Error(payloadError);
    }

    const payload = unwrapPayload<Record<string, unknown>>(result);
    const url =
      payload && typeof payload.url === "string" && payload.url.length > 0
        ? payload.url
        : null;

    if (url && typeof window !== "undefined") {
      window.location.href = url;
    }

    return payload;
  } catch (error) {
    throw new Error(normalizeErrorMessage(error, "Failed to start Google sign-in"));
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : "/reset-password";

    const result = await authClient.forgetPassword({
      email,
      redirectTo,
    });

    const payloadError = extractPayloadError(result);
    if (payloadError) {
      throw new Error(payloadError);
    }

    return unwrapPayload<Record<string, unknown>>(result);
  } catch (error) {
    throw new Error(normalizeErrorMessage(error, "Failed to send reset email"));
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const result = await authClient.resetPassword({
      token,
      newPassword,
    });

    const payloadError = extractPayloadError(result);
    if (payloadError) {
      throw new Error(payloadError);
    }

    return unwrapPayload<Record<string, unknown>>(result);
  } catch (error) {
    throw new Error(normalizeErrorMessage(error, "Failed to reset password"));
  }
}

export function applySessionToken(payload: unknown) {
  const token = extractToken(payload);
  if (token) {
    setStoredSessionToken(token);
  }
  return token;
}

export interface PrivyAuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

// Kept for backwards compatibility with existing imports.
export function usePrivyAuth(): PrivyAuthState {
  const { data, isPending } = useSession();
  const user = data?.user ?? null;

  const login = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const logout = async () => {
    try {
      await authClient.signOut();
    } finally {
      setStoredSessionToken(null);
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isReady: !isPending,
    login,
    logout,
  };
}

export function useSession() {
  const sessionQuery = authClient.useSession();
  const sessionUser = useMemo(() => {
    const raw = (sessionQuery.data as { user?: Record<string, unknown> } | null)?.user;
    return normalizeUser(raw ?? null);
  }, [sessionQuery.data]);

  const [fallbackUser, setFallbackUser] = useState<AuthUser | null>(null);
  const [fallbackPending, setFallbackPending] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function fetchFallbackUser() {
      const token = getStoredSessionToken();
      if (!token || sessionQuery.isPending || sessionUser) {
        if (!token && !sessionUser) {
          setFallbackUser(null);
        }
        return;
      }

      setFallbackPending(true);
      try {
        const me = await api.get<Record<string, unknown>>("/api/me");
        if (!disposed) {
          setFallbackUser(normalizeUser(me));
        }
      } catch {
        if (!disposed) {
          setFallbackUser(null);
          setStoredSessionToken(null);
        }
      } finally {
        if (!disposed) {
          setFallbackPending(false);
        }
      }
    }

    fetchFallbackUser();

    return () => {
      disposed = true;
    };
  }, [sessionQuery.isPending, sessionUser]);

  const effectiveUser = sessionUser ?? fallbackUser;

  return {
    data: effectiveUser ? ({ user: effectiveUser } as SessionResponse) : null,
    isPending: sessionQuery.isPending || fallbackPending,
    isRefetching: sessionQuery.isRefetching,
    error: sessionQuery.error,
    refetch: sessionQuery.refetch,
  };
}

export async function signOut() {
  try {
    await authClient.signOut();
  } finally {
    setStoredSessionToken(null);
  }
}

// Utility for wallet-auth flow to normalize user payloads.
export function normalizeAuthUser(payload: unknown) {
  const user = extractUser(payload);
  return normalizeUser(user);
}
