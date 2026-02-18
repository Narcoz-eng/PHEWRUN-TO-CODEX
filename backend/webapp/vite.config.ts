import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { vibecodePlugin } from "@vibecodeapp/webapp/plugin";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8000,
    allowedHosts: true, // Allow all hosts
  },
  plugins: [
    react(),
    mode === "development" && vibecodePlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Fix for packages that check for process.env
    "process.env": {},
    global: "globalThis",
  },
  optimizeDeps: {
    include: [
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-react-ui",
      "@solana/wallet-adapter-wallets",
      "@solana/web3.js",
      "buffer",
    ],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
    },
  },
}));
