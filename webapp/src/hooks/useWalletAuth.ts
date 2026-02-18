import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { applySessionToken, normalizeAuthUser } from "@/lib/auth-client";

export type WalletProviderId = "phantom" | "solflare";

interface SolanaPublicKey {
  toString: () => string;
}

interface ConnectResult {
  publicKey?: SolanaPublicKey;
}

type SignMessageOutput =
  | Uint8Array
  | { signature?: Uint8Array | number[] }
  | number[];

interface SolanaProvider {
  isConnected?: boolean;
  publicKey?: SolanaPublicKey;
  connect: (args?: Record<string, unknown>) => Promise<ConnectResult | void>;
  disconnect?: () => Promise<void>;
  signMessage?: (message: Uint8Array, encoding?: string) => Promise<SignMessageOutput>;
}

declare global {
  interface Window {
    phantom?: {
      solana?: SolanaProvider;
    };
    solflare?: SolanaProvider;
  }
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      const value = (digits[i] ?? 0) * 256 + carry;
      digits[i] = value % 58;
      carry = Math.floor(value / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let zeroCount = 0;
  while (zeroCount < bytes.length && bytes[zeroCount] === 0) {
    zeroCount++;
  }

  let result = "1".repeat(zeroCount);
  for (let i = digits.length - 1; i >= 0; i--) {
    const idx = digits[i] ?? 0;
    result += BASE58_ALPHABET[idx] ?? "";
  }
  return result;
}

function asUint8Array(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
    return new Uint8Array(value);
  }
  if (value && typeof value === "object" && "signature" in value) {
    return asUint8Array((value as { signature?: unknown }).signature);
  }
  return null;
}

function getProvider(provider: WalletProviderId): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  if (provider === "phantom") {
    return window.phantom?.solana ?? null;
  }
  return window.solflare ?? null;
}

function isInstalled(provider: WalletProviderId) {
  return !!getProvider(provider);
}

function resolveAddress(provider: SolanaProvider, connectResult: ConnectResult | void) {
  const fromConnect = connectResult?.publicKey?.toString?.();
  if (fromConnect && fromConnect.length > 0) {
    return fromConnect;
  }
  const fromProvider = provider.publicKey?.toString?.();
  if (fromProvider && fromProvider.length > 0) {
    return fromProvider;
  }
  return null;
}

function buildAuthMessage(address: string) {
  return [
    "Sign in to Just a Phew",
    `Wallet: ${address}`,
    `Timestamp: ${new Date().toISOString()}`,
  ].join("\n");
}

interface WalletAuthResponse {
  token?: string;
  user?: unknown;
}

export function useWalletAuth() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState({
    phantom: isInstalled("phantom"),
    solflare: isInstalled("solflare"),
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setAvailableWallets({
        phantom: isInstalled("phantom"),
        solflare: isInstalled("solflare"),
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  const connectWallet = useCallback(async (providerId: WalletProviderId) => {
    const provider = getProvider(providerId);
    if (!provider) {
      throw new Error(`${providerId} wallet extension is not installed`);
    }

    const connectResult = await provider.connect();
    const address = resolveAddress(provider, connectResult);
    if (!address) {
      throw new Error("Wallet connected but no public key was returned");
    }

    return { provider, address };
  }, []);

  const authenticateWithWallet = useCallback(
    async (providerId: WalletProviderId) => {
      setIsConnecting(true);
      setError(null);

      try {
        const { provider, address } = await connectWallet(providerId);
        if (!provider.signMessage) {
          throw new Error("This wallet does not support message signing");
        }

        const message = buildAuthMessage(address);
        const messageBytes = new TextEncoder().encode(message);
        const signed = await provider.signMessage(messageBytes, "utf8");
        const signatureBytes = asUint8Array(signed);
        if (!signatureBytes) {
          throw new Error("Failed to get a valid signature from wallet");
        }

        const signature = base58Encode(signatureBytes);
        const payload = await api.post<WalletAuthResponse>("/api/auth/wallet", {
          walletAddress: address,
          walletProvider: providerId,
          signature,
          message,
        });

        applySessionToken(payload);
        const user = normalizeAuthUser(payload);

        return {
          address,
          provider: providerId,
          user,
          payload,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Wallet authentication failed";
        setError(message);
        throw e;
      } finally {
        setIsConnecting(false);
      }
    },
    [connectWallet]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isConnecting,
    error,
    availableWallets,
    connectWallet,
    authenticateWithWallet,
    clearError,
  };
}
