import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, TrendingUp, Users, Target, Shield, BarChart3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { login, ready, authenticated } = usePrivy();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (ready && authenticated) {
      navigate("/", { replace: true });
    }
  }, [ready, authenticated, navigate]);

  useEffect(() => {
    // Trigger animations after mount
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login();
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

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
        <section className="max-w-7xl mx-auto px-6 pt-12 md:pt-24 pb-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-8 transition-all duration-500",
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ transitionDelay: "100ms" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                The SocialFi platform for verified alpha
              </span>
            </div>

            {/* Main Title */}
            <h1
              className={cn(
                "text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 transition-all duration-500",
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ transitionDelay: "200ms" }}
            >
              <span className="text-gradient">Just a Phew</span>
            </h1>

            {/* Subtitle */}
            <p
              className={cn(
                "text-xl sm:text-2xl md:text-3xl text-muted-foreground font-medium mb-4 transition-all duration-500",
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ transitionDelay: "300ms" }}
            >
              running the internet
            </p>

            {/* Description */}
            <p
              className={cn(
                "text-base md:text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-10 transition-all duration-500",
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ transitionDelay: "400ms" }}
            >
              Build your reputation through verified crypto calls.
              Track accuracy, climb the ranks, become the alpha.
            </p>

            {/* CTA Buttons */}
            <div
              className={cn(
                "flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-500",
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ transitionDelay: "500ms" }}
            >
              <Button
                onClick={handleLogin}
                disabled={!ready || isLoggingIn}
                size="lg"
                className="h-14 px-8 text-base font-semibold gap-3 group shadow-glow hover:shadow-glow-lg transition-all duration-300"
              >
                {!ready ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="h-14 px-8 text-base font-medium text-muted-foreground hover:text-foreground"
              >
                Learn More
              </Button>
            </div>

            {/* Stats Row */}
            <div
              className={cn(
                "flex items-center justify-center gap-8 md:gap-16 mt-16 pt-8 border-t border-border/50 transition-all duration-500",
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ transitionDelay: "600ms" }}
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Reputation is everything
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              In a world of noise, your track record speaks louder than words.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative"
              >
                <div className="card-premium p-8 h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-sm">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="card-glass p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-16">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-4">
                  <Shield className="w-4 h-4" />
                  Verified & Transparent
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Your calls. Your proof.
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  Every prediction is timestamped and tracked on-chain.
                  No editing, no hiding failed calls. Pure transparency that builds real trust.
                </p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Real-time stats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Immutable records</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto">
                <div
                  className="relative w-full md:w-64 h-48 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 border border-primary/20 p-6 overflow-hidden shadow-glow animate-pulse-glow"
                >
                  <div className="text-xs text-muted-foreground mb-2">Accuracy Score</div>
                  <div className="text-4xl font-bold text-gradient mb-4">87.3%</div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gain" />
                    <span className="text-sm text-gain font-medium">+12.4% this month</span>
                  </div>
                  {/* Decorative chart lines */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end gap-1 px-6 pb-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/30 rounded-t transition-all duration-500"
                        style={{
                          height: isLoaded ? `${height}%` : "0%",
                          transitionDelay: `${800 + i * 100}ms`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to prove your alpha?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Join the phew who are shaping the future of crypto reputation.
            </p>
            <Button
              onClick={handleLogin}
              disabled={!ready || isLoggingIn}
              size="lg"
              className="h-14 px-10 text-base font-semibold gap-3 group shadow-glow hover:shadow-glow-lg transition-all duration-300"
            >
              {!ready ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Enter the Platform
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
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
