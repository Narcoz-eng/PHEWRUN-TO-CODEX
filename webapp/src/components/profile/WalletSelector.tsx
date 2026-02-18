import { useState, useEffect } from "react";
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
import { useWalletAuth, type WalletProviderId } from "@/hooks/useWalletAuth";
import { Wallet, Ghost, Sun, Loader2, CheckCircle2, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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

type WalletSelectorProviderId = typeof WALLET_PROVIDERS[number]["id"];

interface WalletSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (address: string, provider: string, signature?: string) => void;
  isConnecting: boolean;
}

function isSolanaAddress(address: string): boolean {
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return solanaRegex.test(address);
}

export function WalletSelector({
  open,
  onOpenChange,
  onConnect,
  isConnecting,
}: WalletSelectorProps) {
  const { connectWallet, availableWallets } = useWalletAuth();
  const [selectedProvider, setSelectedProvider] = useState<WalletSelectorProviderId | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "connecting" | "verified" | "failed">("idle");

  useEffect(() => {
    if (open) {
      setSelectedProvider(null);
      setWalletAddress("");
      setAddressError(null);
      setIsVerifying(false);
      setVerificationStatus("idle");
    }
  }, [open]);

  const handleProviderSelect = async (providerId: WalletSelectorProviderId) => {
    setSelectedProvider(providerId);
    setWalletAddress("");
    setAddressError(null);
    setVerificationStatus("idle");

    if (providerId === "manual") {
      return;
    }

    setIsVerifying(true);
    setVerificationStatus("connecting");
    try {
      const { address } = await connectWallet(providerId as WalletProviderId);
      setWalletAddress(address);
      setVerificationStatus("verified");
      toast.success("Wallet connected successfully");
      onConnect(address, providerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect wallet";
      setVerificationStatus("failed");
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddressChange = (value: string) => {
    const next = value.trim();
    setWalletAddress(next);
    if (next.length === 0) {
      setAddressError(null);
      return;
    }
    if (!isSolanaAddress(next)) {
      setAddressError("Invalid Solana wallet address format");
      return;
    }
    setAddressError(null);
  };

  const handleManualConnect = () => {
    if (!walletAddress) return;

    if (!isSolanaAddress(walletAddress)) {
      setAddressError("Invalid Solana wallet address format");
      return;
    }

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
            Connect your Solana wallet (Phantom or Solflare).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Connection Method</Label>
            <div className="grid gap-2">
              {WALLET_PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                const isSelected = selectedProvider === provider.id;
                const isInstalled =
                  provider.id === "manual" ||
                  (provider.id === "phantom" && availableWallets.phantom) ||
                  (provider.id === "solflare" && availableWallets.solflare);
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleProviderSelect(provider.id)}
                    disabled={!isInstalled || isVerifying || isConnecting}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      "hover:border-primary/50 hover:bg-secondary/50",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isSelected ? "border-primary bg-primary/5" : "border-border bg-background"
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
                        {isInstalled
                          ? provider.description
                          : `${provider.name} extension not detected`}
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

          {isNativeWallet && verificationStatus !== "idle" && (
            <div className="p-3 rounded-lg border bg-secondary/30 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2">
                {verificationStatus === "connecting" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">Waiting for wallet approval...</span>
                  </>
                )}
                {verificationStatus === "verified" && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-gain" />
                    <span className="text-sm text-gain">Wallet connected!</span>
                  </>
                )}
                {verificationStatus === "failed" && (
                  <>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">Connection failed</span>
                  </>
                )}
              </div>
              {walletAddress && (
                <p className="text-xs font-mono text-muted-foreground truncate">
                  {walletAddress}
                </p>
              )}
            </div>
          )}

          {selectedProvider === "manual" && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder="Enter your Solana wallet address..."
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
