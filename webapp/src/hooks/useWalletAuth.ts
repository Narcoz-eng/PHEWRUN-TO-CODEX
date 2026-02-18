import { useCallback, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { api } from "@/lib/api";
import bs58 from "bs58";

interface WalletAuthResult {
  success: boolean;
  error?: string;
}

// Message template for signing to verify wallet ownership
const createSignMessage = (walletAddress: string, nonce: string): string => {
  return `Sign this message to verify your wallet ownership.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
};

// Generate a random nonce for the signature
const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export function useWalletAuth() {
  const { publicKey, signMessage, connected, disconnect, wallet, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAvailableWallets = useMemo(
    () =>
      wallets.some(
        (walletOption) =>
          walletOption.readyState === WalletReadyState.Installed ||
          walletOption.readyState === WalletReadyState.Loadable
      ),
    [wallets]
  );

  // Open wallet selection modal
  const openWalletModal = useCallback(() => {
    setError(null);
    if (!hasAvailableWallets) {
      setError("No compatible wallet extension detected. Install Phantom or Solflare and refresh.");
      return;
    }
    setVisible(true);
  }, [hasAvailableWallets, setVisible]);

  // Sign message and authenticate with backend
  const authenticateWallet = useCallback(async (): Promise<WalletAuthResult> => {
    if (!publicKey || !signMessage) {
      return { success: false, error: "Wallet not connected or does not support message signing" };
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();
      const nonce = generateNonce();
      const message = createSignMessage(walletAddress, nonce);

      // Request signature from wallet
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      // Get wallet provider name
      const walletProvider = wallet?.adapter?.name?.toLowerCase() || "unknown";

      // Send to backend for verification
      const response = await api.raw("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          walletProvider,
          signature,
          message,
          nonce,
        }),
      });

      const data = await response.json().catch(() => null) as {
        token?: string;
        error?: { message?: string };
      } | null;

      if (response.ok && !data?.error) {
        if (data?.token) {
          // Keep a bearer fallback for cross-origin/cookie-restricted environments
          localStorage.setItem("auth-token", data.token);
        }
        return { success: true };
      } else {
        const errorMessage = data?.error?.message || "Failed to authenticate wallet";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      console.error("Wallet auth error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to sign message";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage, wallet]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
      setError(null);
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  }, [disconnect]);

  return {
    // State
    connected,
    publicKey: publicKey?.toBase58() ?? null,
    walletName: wallet?.adapter?.name ?? null,
    isAuthenticating,
    error,
    hasAvailableWallets,

    // Actions
    openWalletModal,
    authenticateWallet,
    disconnectWallet,
    clearError: () => setError(null),
  };
}
