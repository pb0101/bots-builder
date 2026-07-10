"use client";

import { useContext } from "react";
import { AuthContext, type AuthContextProps } from "react-oidc-context";

const stub = {
  isLoading: true,
  isAuthenticated: false,
  user: undefined,
  signinRedirect: async () => {},
  removeUser: async () => {},
} as unknown as AuthContextProps;

/**
 * Like useAuth(), but safe during static prerender when the
 * AuthProvider isn't mounted yet (it mounts client-side only).
 */
export function useSafeAuth(): AuthContextProps {
  return useContext(AuthContext) ?? stub;
}
