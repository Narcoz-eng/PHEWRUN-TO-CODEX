interface SolanaWalletProviderProps {
  children: React.ReactNode;
}

// Compatibility wrapper for wallet-related app wiring.
export function SolanaWalletProvider({ children }: SolanaWalletProviderProps) {
  return <>{children}</>;
}
