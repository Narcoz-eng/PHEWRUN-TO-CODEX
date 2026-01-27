/**
 * Auth module - Privy server-side authentication
 *
 * This module re-exports the Privy authentication utilities
 * for use throughout the backend.
 */

export {
  privyAuth,
  requireAuth,
  verifyPrivyToken,
  getPrivyUserById,
  getPrivyClient,
  type PrivyUser,
  type AuthVariables,
} from "./middleware/auth.js";
