import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { data: session, isPending, refetch } = useSession();
  const [searchParams] = useSearchParams();
  const didShowError = useRef(false);

  const oauthError = useMemo(
    () =>
      searchParams.get("error_description") ||
      searchParams.get("error") ||
      searchParams.get("message"),
    [searchParams]
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (oauthError && !didShowError.current) {
      didShowError.current = true;
      toast.error(typeof oauthError === "string" ? oauthError : "Google sign-in failed");
      navigate("/login", { replace: true });
      return;
    }

    if (session?.user) {
      navigate("/", { replace: true });
      return;
    }

    if (!isPending) {
      const timer = window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);

      return () => window.clearTimeout(timer);
    }
  }, [oauthError, session?.user, isPending, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
