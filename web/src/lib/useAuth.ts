"use client";

import { useCallback, useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { signUp, confirmSignUp, signIn, signOut, getCurrentUser } from "aws-amplify/auth";

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_7ivyevhwf",
      userPoolClientId: "67rq6l3fg8175c2bgendlj5kus",
      region: "us-east-1",
    },
  },
});

interface AuthState {
  user: any;
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const TOKENS_KEY = "bots-builder-tokens";

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
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        setState({
          user,
          email: user?.username,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    };
    checkAuth();
  }, []);

  const handleSignUp = useCallback(async (username: string, password: string, email: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      await signUp({
        username,
        password,
        options: {
          userAttributes: { email },
        },
      });

      setState((s) => ({
        ...s,
        email,
        isLoading: false,
        error: null,
      }));

      return { requiresVerification: true };
    } catch (error: any) {
      const errorMsg = error.message || "Sign up failed";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const handleConfirmSignUp = useCallback(async (username: string, code: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      await confirmSignUp({
        username,
        confirmationCode: code,
      });

      setState({
        user: { username },
        email: username,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { username };
    } catch (error: any) {
      const errorMsg = error.message || "Verification failed";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const handleSignIn = useCallback(async (username: string, password: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      const user = await signIn({
        username,
        password,
      });

      setState({
        user,
        email: username,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { username };
    } catch (error: any) {
      const errorMsg = error.message || "Sign in failed";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      localStorage.removeItem(TOKENS_KEY);

      setState({
        user: null,
        email: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error("Sign out error:", error);
    }
  }, []);

  return {
    ...state,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
