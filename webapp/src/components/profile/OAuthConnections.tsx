import { useMemo } from "react";
import { usePrivyAuth, usePrivy } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Chrome, Twitter, Discord } from "lucide-react";

type OAuthProvider = {
  id: "google" | "twitter" | "discord";
  label: string;
  description: string;
  linkedType: "google_oauth" | "twitter_oauth" | "discord_oauth";
  icon: React.ComponentType<{ className?: string }>;
};

const providers: OAuthProvider[] = [
  {
    id: "google",
    label: "Google",
    description: "Use your Google account for quick sign-ins.",
    linkedType: "google_oauth",
    icon: Chrome,
  },
  {
    id: "twitter",
    label: "Twitter",
    description: "Connect Twitter to show verified social presence.",
    linkedType: "twitter_oauth",
    icon: Twitter,
  },
  {
    id: "discord",
    label: "Discord",
    description: "Link Discord for community verification.",
    linkedType: "discord_oauth",
    icon: Discord,
  },
];

export function OAuthConnections() {
  const { user } = usePrivyAuth();
  const { login } = usePrivy();

  const linkedTypes = useMemo(() => {
    return new Set(user?.linkedAccounts.map((account) => account.type) ?? []);
  }, [user?.linkedAccounts]);

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/5 via-card to-accent/5 dark:from-primary/10 dark:via-card dark:to-accent/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="font-heading">Connected Accounts</span>
          <Badge variant="secondary" className="text-xs">
            OAuth
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => {
          const isConnected = linkedTypes.has(provider.linkedType);
          const Icon = provider.icon;

          return (
            <div
              key={provider.id}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between",
                "bg-background/60 border-border/60"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{provider.label}</p>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge
                    variant="outline"
                    className="text-xs border-gain/40 text-gain bg-gain/10"
                  >
                    Connected
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => login({ loginMethods: [provider.id] })}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
