import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, signInWithEmail, signUpWithEmail, signInWithGoogle, isInIframe, forgotPassword } from "@/lib/auth-client";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Zap, TrendingUp, Users, Target, Shield, Loader2, Mail, Lock, User as UserIcon, AlertTriangle, Wallet } from "lucide-react";
import { AccuracyScoreCard } from "@/components/AccuracyScoreCard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const features = [
  {
    icon: Target,
    title: "Track Alpha Calls",
    description: "Log your crypto predictions and build an immutable track record."
  },
  {
    icon: TrendingUp,
    title: "Prove Your Edge",
    description: "Real-time accuracy metrics that showcase your trading insight."
  },
  {
    icon: Users,
    title: "Join the Phew",
    description: "Connect with verified traders. Follow the signal, cut the noise."
  }
];

const stats = [
  { value: "10K+", label: "Calls Tracked" },
  { value: "68%", label: "Avg Accuracy" },
  { value: "2.4K", label: "Active Traders" }
];

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isReady, refetch } = useAuth();
  const walletAuth = useWalletAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isForgotPasswordSubmitting, setIsForgotPasswordSubmitting] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [walletAuthAttempted, setWalletAuthAttempted] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if running in iframe
    setInIframe(isInIframe());
  }, []);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isReady, isAuthenticated, navigate]);

  useEffect(() => {
    // Trigger animations after mount
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Login] Form submitted, isSignUp:", isSignUp, "email:", email);
    setError(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError("Name is required");
          setIsSubmitting(false);
          return;
        }
        const result = await signUpWithEmail(email, password, name);
        if (result.error) {
          setError(result.error.message || "Failed to create account");
        } else {
          toast.success("Account created successfully!");
          await refetch();
          navigate("/", { replace: true });
        }
      } else {
        const result = await signInWithEmail(email, password);
        if (result.error) {
          setError(result.error.message || "Invalid email or password");
        } else {
          toast.success("Welcome back!");
          await refetch();
          navigate("/", { replace: true });
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setShowForgotPassword(false);
    setForgotPasswordSuccess(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsForgotPasswordSubmitting(true);
    setError(null);

    try {
      const result = await forgotPassword(forgotPasswordEmail);
      if (result.error) {
        setError(result.error.message || "Failed to send reset email");
      } else {
        setForgotPasswordSuccess(true);
        toast.success("Password reset email sent!");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsForgotPasswordSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log("[Login] Google sign-in clicked, inIframe:", inIframe);
    if (inIframe) {
      setError("Google sign-in doesn't work in iframes. Please open the app in a new tab or use email/password.");
      return;
    }

    setIsGoogleLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      // The redirect will happen automatically
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError("Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  // Handle wallet connection - opens the wallet modal
  const handleWalletConnect = () => {
    console.log("[Login] Opening wallet modal");
    setError(null);
    walletAuth.openWalletModal();
  };

  // Effect to handle wallet authentication after connection
  useEffect(() => {
    // Skip if already authenticated or if wallet auth was already attempted
    if (walletAuthAttempted) return;
    if (!walletAuth.connected || !walletAuth.publicKey) return;
    if (walletAuth.isAuthenticating) return;

    const authenticateConnectedWallet = async () => {
      console.log("[Login] Wallet connected, authenticating:", walletAuth.publicKey);
      setWalletAuthAttempted(true);

      try {
        const result = await walletAuth.authenticateWallet();
        if (result.success) {
          toast.success("Wallet connected successfully!");
          await refetch();
          navigate("/", { replace: true });
        } else {
          setError(result.error || "Failed to authenticate wallet");
          // Disconnect the wallet if authentication fails
          await walletAuth.disconnectWallet();
          setWalletAuthAttempted(false); // Reset so user can try again
        }
      } catch (err) {
        console.error("[Login] Wallet auth error:", err);
        setError("Failed to authenticate wallet");
        setWalletAuthAttempted(false);
      }
    };

    authenticateConnectedWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAuth.connected, walletAuth.publicKey, walletAuthAttempted]);

  // Reset wallet auth attempted when wallet disconnects
  useEffect(() => {
    if (!walletAuth.connected && walletAuthAttempted) {
      setWalletAuthAttempted(false);
    }
  }, [walletAuth.connected, walletAuthAttempted]);

  // Show wallet auth errors
  useEffect(() => {
    if (walletAuth.error) {
      setError(walletAuth.error);
    }
  }, [walletAuth.error]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary gradient orb */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-3xl animate-glow-pulse"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.15), transparent 70%)"
          }}
        />
        {/* Secondary accent orb */}
        <div
          className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl animate-glow-pulse"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--accent) / 0.1), transparent 70%)",
            animationDelay: "1.5s"
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px"
          }}
        />
      </div>

      {/* Header */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm tracking-tight">Just a Phew</span>
          </div>
          <ThemeToggle size="icon" className="h-9 w-9" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-8 md:pt-16 pb-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column - Branding */}
            <div className="hidden lg:block">
              <div
                className={cn(
                  "transition-all duration-500",
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
                style={{ transitionDelay: "100ms" }}
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    The SocialFi platform for verified alpha
                  </span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
                  <span className="text-gradient">Just a Phew</span>
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground font-medium mb-4">
                  running the internet
                </p>

                <p className="text-base text-muted-foreground/80 max-w-md mb-6">
                  Build your reputation through verified crypto calls.
                  Track accuracy, climb the ranks, become the alpha.
                </p>

                {/* Accuracy Score Card */}
                <AccuracyScoreCard className="mb-6" />

                {/* Features preview */}
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-8 mt-8 pt-6 border-t border-border/50">
                  {stats.map((stat, index) => (
                    <div key={index}>
                      <div className="text-xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Auth Form */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <div
                className={cn(
                  "card-premium p-8 transition-all duration-500",
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
                style={{ transitionDelay: "200ms" }}
              >
                {/* Mobile branding */}
                <div className="lg:hidden text-center mb-8">
                  <h1 className="text-3xl font-bold tracking-tight mb-2">
                    <span className="text-gradient">Just a Phew</span>
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    running the internet
                  </p>
                </div>

                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">
                    {showForgotPassword
                      ? "Reset your password"
                      : isSignUp
                      ? "Create your account"
                      : "Welcome back"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {showForgotPassword
                      ? "Enter your email to receive a reset link"
                      : isSignUp
                      ? "Start building your trading reputation"
                      : "Sign in to continue to your dashboard"}
                  </p>
                </div>

                {showForgotPassword ? (
                  <div className="space-y-4 relative z-10">
                    {forgotPasswordSuccess ? (
                      <div className="text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                          <Mail className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            If an account exists for <span className="font-medium text-foreground">{forgotPasswordEmail}</span>, you will receive a password reset email shortly.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-11"
                          onClick={() => {
                            setShowForgotPassword(false);
                            setForgotPasswordSuccess(false);
                            setForgotPasswordEmail("");
                          }}
                        >
                          Back to sign in
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-email" className="text-sm font-medium">
                            Email
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="forgot-email"
                              type="email"
                              placeholder="you@example.com"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              className="pl-10 h-11"
                              disabled={isForgotPasswordSubmitting}
                              required
                            />
                          </div>
                        </div>

                        {error && (
                          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                          </div>
                        )}

                        <Button
                          type="submit"
                          className="w-full h-11 font-semibold gap-2 shadow-glow hover:shadow-glow-lg transition-all duration-300"
                          disabled={isForgotPasswordSubmitting}
                        >
                          {isForgotPasswordSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              Send reset link
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full h-11"
                          onClick={() => {
                            setShowForgotPassword(false);
                            setError(null);
                          }}
                          disabled={isForgotPasswordSubmitting}
                        >
                          Back to sign in
                        </Button>
                      </form>
                    )}
                  </div>
                ) : (
                <>
                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Name
                      </Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10 h-11"
                          disabled={isSubmitting}
                          required={isSignUp}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder={isSignUp ? "Create a password" : "Enter your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11"
                        disabled={isSubmitting}
                        required
                        minLength={8}
                      />
                    </div>
                    {isSignUp && (
                      <p className="text-xs text-muted-foreground">
                        Must be at least 8 characters
                      </p>
                    )}
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowForgotPassword(true);
                          setForgotPasswordEmail(email);
                          setError(null);
                          setForgotPasswordSuccess(false);
                        }}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold gap-2 shadow-glow hover:shadow-glow-lg transition-all duration-300 relative z-10"
                    disabled={isSubmitting}
                    onClick={(e) => {
                      console.log("[Login] Submit button clicked");
                      // Form submit will handle it, but log for debugging
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isSignUp ? "Creating account..." : "Signing in..."}
                      </>
                    ) : (
                      <>
                        {isSignUp ? "Create Account" : "Sign In"}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                {/* Iframe Warning */}
                {inIframe && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Google sign-in is not available when viewing in the Vibecode app. Please use email/password, wallet, or open in a new browser tab.</span>
                  </div>
                )}

                {/* Social Auth Buttons */}
                <div className="space-y-3 relative z-10">
                  {/* Google Sign-In Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 font-medium gap-3"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log("[Login] Google button clicked");
                      handleGoogleSignIn();
                    }}
                    disabled={isSubmitting || isGoogleLoading || walletAuth.isAuthenticating || inIframe}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                  </Button>

                  {/* Wallet Connect Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 font-medium gap-3"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log("[Login] Wallet button clicked");
                      handleWalletConnect();
                    }}
                    disabled={isSubmitting || isGoogleLoading || walletAuth.isAuthenticating}
                  >
                    {walletAuth.isAuthenticating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {walletAuth.connected ? "Signing message..." : "Connecting..."}
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5" />
                        Connect Wallet
                      </>
                    )}
                  </Button>

                  {/* Connected wallet info */}
                  {walletAuth.connected && walletAuth.publicKey && (
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Connected:</span>
                        <span className="font-mono text-xs">
                          {walletAuth.publicKey.slice(0, 4)}...{walletAuth.publicKey.slice(-4)}
                        </span>
                      </div>
                      {walletAuth.walletName && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-muted-foreground">Wallet:</span>
                          <span className="text-xs">{walletAuth.walletName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 text-center relative z-10">
                  <p className="text-sm text-muted-foreground">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log("[Login] Toggle mode clicked");
                        toggleMode();
                      }}
                      className="text-primary hover:underline font-medium relative z-10"
                      disabled={isSubmitting}
                    >
                      {isSignUp ? "Sign in" : "Sign up"}
                    </button>
                  </p>
                </div>
                </>
                )}
              </div>

              {/* Security notice */}
              <div
                className={cn(
                  "flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground transition-all duration-500",
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
                style={{ transitionDelay: "300ms" }}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Secured with end-to-end encryption</span>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Features Section */}
        <section className="lg:hidden max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">
              Reputation is everything
            </h2>
            <p className="text-muted-foreground text-sm">
              In a world of noise, your track record speaks louder than words.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card-premium p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Stats */}
          <div className="flex items-center justify-center gap-8 mt-8 py-6 border-t border-border/50">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Zap className="w-4 h-4 text-primary" />
            <span>Just a Phew</span>
            <span className="text-muted-foreground/50">|</span>
            <span>running the internet</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
          </div>
        </div>
      </footer>

      {/* Add custom animation keyframes */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px hsl(var(--primary) / 0.1);
          }
          50% {
            box-shadow: 0 0 40px hsl(var(--primary) / 0.2);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
