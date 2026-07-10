"use client";

import { useCallback, useEffect, useState } from "react";

interface AuthState {
  user: any;
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const TOKEN_KEY = "bots-builder-token";
const EMAIL_KEY = "bots-builder-email";

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    email: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Check if user is already authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const email = localStorage.getItem(EMAIL_KEY);

    if (token && email) {
      setState({
        user: { email },
        email,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      // Store email for verification step
      localStorage.setItem(EMAIL_KEY, email);

      setState((s) => ({
        ...s,
        email,
        isLoading: false,
        error: null,
      }));

      return { requiresCode: true };
    } catch (error: any) {
      const errorMsg = error.message || "Failed to send sign-in code";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const verifyCode = useCallback(async (code: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      const email = localStorage.getItem(EMAIL_KEY);
      if (!email) throw new Error("Email not found");

      // Validate code format (6 digits)
      if (code.length !== 6 || !/^\d+$/.test(code)) {
        throw new Error("Invalid code format");
      }

      // Create session token
      const token = Math.random().toString(36).slice(2);
      localStorage.setItem(TOKEN_KEY, token);

      const user = { email };

      setState({
        user,
        email,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (error: any) {
      const errorMsg = error.message || "Invalid code";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setState({
      user: null,
      email: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    signInWithEmail,
    verifyCode,
    signOut,
  };
}
