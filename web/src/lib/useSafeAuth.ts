"use client";

import { useAuth } from "./useAuth";

/**
 * Safe auth hook that works during SSR/static prerender.
 * Returns auth state or stub during server-side rendering.
 */
export function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    // Return stub during SSR when window is not available
    return {
      user: null,
      email: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      sessionId: null,
      signInWithEmail: async () => {},
      verifyCode: async () => {},
      signOut: async () => {},
    };
  }
}
