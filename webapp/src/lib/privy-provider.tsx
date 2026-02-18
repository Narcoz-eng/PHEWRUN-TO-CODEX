interface PrivyProviderProps {
  children: React.ReactNode;
}

// Kept only for backwards compatibility with old imports.
export function PrivyProvider({ children }: PrivyProviderProps) {
  return <>{children}</>;
}
