import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";

interface PrivyProviderProps {
  children: React.ReactNode;
}

function MissingAppIdScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Configuration Required
        </h1>
        <p className="text-muted-foreground mb-6">
          The Privy App ID is not configured. Please add the{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
            VITE_PRIVY_APP_ID
          </code>{" "}
          environment variable to continue.
        </p>
        <div className="p-4 rounded-lg bg-muted/50 border border-border text-left">
          <p className="text-xs text-muted-foreground mb-2">
            Add this to your environment:
          </p>
          <code className="text-sm font-mono text-foreground">
            VITE_PRIVY_APP_ID=your-privy-app-id
          </code>
        </div>
      </div>
    </div>
  );
}

export function PrivyProvider({ children }: PrivyProviderProps) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!appId) {
    console.error("VITE_PRIVY_APP_ID is not set");
    return <MissingAppIdScreen />;
  }

  return (
    <BasePrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google", "twitter", "discord"],
        appearance: {
          theme: "dark",
          accentColor: "#3b82f6",
          logo: undefined,
          showWalletLoginFirst: false,
        },
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}
