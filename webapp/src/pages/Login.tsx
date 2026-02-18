import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, LogIn, Mail, Wallet } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import {
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth-client";
import { useWalletAuth, type WalletProviderId } from "@/hooks/useWalletAuth";

type AuthMode = "sign-in" | "sign-up" | "forgot";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session, isPending, refetch } = useSession();
  const { isConnecting, availableWallets, authenticateWithWallet } = useWalletAuth();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const oauthError = useMemo(
    () => searchParams.get("oauth") === "error" || !!searchParams.get("error"),
    [searchParams]
  );

  useEffect(() => {
    if (oauthError) {
      toast.error("Google sign-in failed. Try again.");
    }
  }, [oauthError]);

  useEffect(() => {
    if (!isPending && session?.user) {
      navigate("/", { replace: true });
    }
  }, [isPending, session?.user, navigate]);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        await signInWithEmail(email.trim(), password);
        await refetch();
        navigate("/", { replace: true });
        return;
      }

      if (mode === "sign-up") {
        if (!name.trim()) {
          throw new Error("Name is required");
        }
        await signUpWithEmail(name.trim(), email.trim(), password);
        await refetch();
        navigate("/", { replace: true });
        return;
      }

      await requestPasswordReset(email.trim());
      toast.success("Reset email sent. Check your inbox.");
      setMode("sign-in");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    try {
      const payload = await signInWithGoogle();
      const redirected =
        payload &&
        typeof payload === "object" &&
        "url" in payload &&
        typeof (payload as { url?: unknown }).url === "string" &&
        Boolean((payload as { url?: string }).url);
      if (!redirected) {
        setIsSubmitting(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      toast.error(message);
      setIsSubmitting(false);
    }
  }

  async function handleWalletSignIn(provider: WalletProviderId) {
    try {
      await authenticateWithWallet(provider);
      await refetch();
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet sign-in failed";
      toast.error(message);
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 px-4 flex items-center justify-between border-b border-border">
        <div className="font-semibold">Just a Phew</div>
        <ThemeToggle size="icon" className="h-8 w-8" />
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {mode === "sign-in" && "Sign In"}
              {mode === "sign-up" && "Create Account"}
              {mode === "forgot" && "Forgot Password"}
            </CardTitle>
            <CardDescription>
              {mode === "forgot"
                ? "Enter your email and we will send a reset link."
                : "Use email, Google, or wallet to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {mode === "sign-up" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting || isConnecting}>
                {(isSubmitting || isConnecting) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    {mode === "sign-in" && "Sign In"}
                    {mode === "sign-up" && "Create Account"}
                    {mode === "forgot" && "Send Reset Link"}
                  </>
                )}
              </Button>
            </form>

            {mode !== "forgot" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isSubmitting || isConnecting}
                  onClick={handleGoogleSignIn}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Google
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!availableWallets.phantom || isSubmitting || isConnecting}
                    onClick={() => handleWalletSignIn("phantom")}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Phantom
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!availableWallets.solflare || isSubmitting || isConnecting}
                    onClick={() => handleWalletSignIn("solflare")}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Solflare
                  </Button>
                </div>
              </>
            )}

            <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
              {mode !== "sign-in" && (
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => setMode("sign-in")}
                >
                  Back to sign in
                </button>
              )}
              {mode === "sign-in" && (
                <>
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => setMode("sign-up")}
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => setMode("forgot")}
                  >
                    Forgot password
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
