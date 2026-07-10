"use client";

import { useCallback, useEffect, useState } from "react";
import { Amplify, Auth } from "aws-amplify";

// Configure Amplify
Amplify.configure({
  Auth: {
    region: "us-east-1",
    userPoolId: "us-east-1_7ivyevhwf",
    userPoolWebClientId: "67rq6l3fg8175c2bgendlj5kus",
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
        const user = await Auth.currentAuthenticatedUser();
        setState({
          user,
          email: user.attributes?.email,
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

  const signUp = useCallback(async (username: string, password: string, email: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      await Auth.signUp({
        username,
        password,
        attributes: { email },
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

  const confirmSignUp = useCallback(async (username: string, code: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      await Auth.confirmSignUp(username, code);

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

  const signIn = useCallback(async (username: string, password: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      const user = await Auth.signIn(username, password);

      setState({
        user,
        email: user.attributes?.email,
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

  const signOut = useCallback(async () => {
    try {
      await Auth.signOut();
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
    signUp,
    confirmSignUp,
    signIn,
    signOut,
  };
}
