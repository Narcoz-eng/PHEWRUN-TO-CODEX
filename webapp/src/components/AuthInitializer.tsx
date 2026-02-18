interface AuthInitializerProps {
  children: React.ReactNode;
}

// Legacy compatibility wrapper. Auth initialization now happens in auth-client.ts.
export function AuthInitializer({ children }: AuthInitializerProps) {
  return <>{children}</>;
}
