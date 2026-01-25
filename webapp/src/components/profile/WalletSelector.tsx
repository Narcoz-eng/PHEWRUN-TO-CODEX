import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Wallet, Ghost, Sun, Loader2, CheckCircle2, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Wallet provider options for native connection
const WALLET_PROVIDERS = [
  {
    id: "phantom",
    name: "Phantom",
    description: "Connect Phantom wallet",
    icon: Ghost,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    id: "solflare",
    name: "Solflare",
    description: "Connect Solflare wallet",
    icon: Sun,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    id: "manual",
    name: "Manual Entry",
    description: "Enter address manually (no verification)",
    icon: Wallet,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
] as const;

type WalletProviderId = typeof WALLET_PROVIDERS[number]["id"];

interface WalletSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (address: string, provider: string, signature?: string) => void;
  isConnecting: boolean;
}

// Validate Solana or EVM address format
function validateWalletAddress(address: string): { valid: boolean; type: "solana" | "evm" | null } {
  // Solana: Base58, 32-44 chars
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  // EVM: 0x prefix + 40 hex chars
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;

  if (solanaRegex.test(address)) {
    return { valid: true, type: "solana" };
  }
  if (evmRegex.test(address)) {
    return { valid: true, type: "evm" };
  }
  return { valid: false, type: null };
}

// Generate a unique message for wallet verification
function generateVerificationMessage(): string {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);
  return `Sign this message to verify wallet ownership on Just a Phew.\n\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
}

export function WalletSelector({
  open,
  onOpenChange,
  onConnect,
  isConnecting,
}: WalletSelectorProps) {
  const { connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const [selectedProvider, setSelectedProvider] = useState<WalletProviderId | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "signing" | "verified" | "failed">("idle");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedProvider(null);
      setWalletAddress("");
      setAddressError(null);
      setIsVerifying(false);
      setVerificationStatus("idle");
    }
  }, [open]);

  const handleProviderSelect = async (providerId: WalletProviderId) => {
    setSelectedProvider(providerId);
    setWalletAddress("");
    setAddressError(null);
    setVerificationStatus("idle");

    // For native wallet providers, trigger Privy's wallet connection
    if (providerId !== "manual") {
      try {
        setIsVerifying(true);
        // Use Privy to connect wallet
        await connectWallet();
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        toast.error("Failed to connect wallet");
      } finally {
        setIsVerifying(false);
      }
    }
  };

  // Watch for newly connected wallets from Privy
  useEffect(() => {
    if (wallets.length > 0 && selectedProvider && selectedProvider !== "manual") {
      const latestWallet = wallets[wallets.length - 1];
      if (latestWallet?.address) {
        setWalletAddress(latestWallet.address);
        // Auto-verify with signature
        handleSignAndVerify(latestWallet);
      }
    }
  }, [wallets, selectedProvider]);

  // Sign message to verify wallet ownership
  const handleSignAndVerify = async (wallet: typeof wallets[0]) => {
    if (!wallet) return;

    try {
      setVerificationStatus("signing");
      const message = generateVerificationMessage();

      // Request signature from wallet
      const signature = await wallet.sign(message);

      if (signature) {
        setVerificationStatus("verified");
        toast.success("Wallet verified successfully!");

        // Call onConnect with signature for backend verification
        onConnect(wallet.address, selectedProvider || "unknown", signature);
      } else {
        setVerificationStatus("failed");
        toast.error("Signature verification failed");
      }
    } catch (error) {
      console.error("Failed to sign message:", error);
      setVerificationStatus("failed");
      toast.error("Failed to verify wallet ownership");
    }
  };

  const handleAddressChange = (value: string) => {
    setWalletAddress(value.trim());
    if (value.trim()) {
      const validation = validateWalletAddress(value.trim());
      if (!validation.valid) {
        setAddressError("Invalid wallet address format");
      } else {
        setAddressError(null);
      }
    } else {
      setAddressError(null);
    }
  };

  const handleManualConnect = () => {
    if (!walletAddress) return;

    const validation = validateWalletAddress(walletAddress);
    if (!validation.valid) {
      setAddressError("Invalid wallet address format");
      return;
    }

    // Manual entry without signature
    onConnect(walletAddress, "manual");
  };

  const handleClose = () => {
    setSelectedProvider(null);
    setWalletAddress("");
    setAddressError(null);
    setVerificationStatus("idle");
    onOpenChange(false);
  };

  const isValid = selectedProvider && walletAddress && !addressError;
  const isNativeWallet = selectedProvider && selectedProvider !== "manual";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Connect and verify your wallet to prove ownership.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Select Connection Method</Label>
            <div className="grid gap-2">
              {WALLET_PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                const isSelected = selectedProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleProviderSelect(provider.id)}
                    disabled={isVerifying || isConnecting}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      "hover:border-primary/50 hover:bg-secondary/50",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg",
                        provider.iconBg
                      )}
                    >
                      <Icon className={cn("h-5 w-5", provider.iconColor)} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {provider.description}
                      </p>
                    </div>
                    {provider.id !== "manual" && (
                      <Shield className="h-4 w-4 text-primary" />
                    )}
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 transition-colors",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Verification Status for Native Wallets */}
          {isNativeWallet && walletAddress && (
            <div className="p-3 rounded-lg border bg-secondary/30 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2">
                {verificationStatus === "signing" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">Please sign the message in your wallet...</span>
                  </>
                )}
                {verificationStatus === "verified" && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-gain" />
                    <span className="text-sm text-gain">Wallet verified!</span>
                  </>
                )}
                {verificationStatus === "failed" && (
                  <>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">Verification failed</span>
                  </>
                )}
              </div>
              <p className="text-xs font-mono text-muted-foreground truncate">
                {walletAddress}
              </p>
            </div>
          )}

          {/* Manual Address Input */}
          {selectedProvider === "manual" && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder="Enter your wallet address..."
                value={walletAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                className={cn(
                  "font-mono text-sm",
                  addressError && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {addressError ? (
                <p className="text-xs text-destructive">{addressError}</p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Manual entry cannot verify ownership
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isConnecting || isVerifying}>
            Cancel
          </Button>
          {selectedProvider === "manual" && (
            <Button
              onClick={handleManualConnect}
              disabled={!isValid || isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect (Unverified)"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
