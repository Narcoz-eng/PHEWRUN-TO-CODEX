import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const completeAuth = async () => {
      try {
        const search = new URLSearchParams(window.location.search);
        const oauthError = search.get("error");
        if (oauthError) {
          throw new Error(oauthError.replace(/_/g, " "));
        }

        await refetch();
        if (mounted) {
          navigate("/", { replace: true });
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Google sign-in failed.");
          setTimeout(() => navigate("/login", { replace: true }), 1200);
        }
      }
    };

    void completeAuth();
    return () => {
      mounted = false;
    };
  }, [navigate, refetch]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md card-premium p-8 text-center space-y-4">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">
          {error ? `Authentication failed: ${error}` : "Completing sign-in..."}
        </p>
      </div>
    </div>
  );
}
