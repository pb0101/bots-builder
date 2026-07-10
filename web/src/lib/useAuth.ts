"use client";

import { useCallback, useEffect, useState } from "react";
import { Amplify, Auth } from "aws-amplify";
import { config } from "./config";

// Initialize Amplify with Cognito config
if (typeof window !== "undefined") {
  Amplify.configure({
    Auth: {
      region: "us-east-1",
      userPoolId: "us-east-1_7ivyevhwf",
      userPoolWebClientId: config.cognitoClientId,
    },
  });
}

interface AuthState {
  user: any;
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
}

const SESSION_KEY = "bots-builder-session";
const EMAIL_KEY = "bots-builder-email";

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    email: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    sessionId: null,
  });

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await Auth.currentAuthenticatedUser();
        if (currentUser) {
          const email = currentUser.attributes?.email;
          setState({
            user: currentUser,
            email,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            sessionId: null,
          });
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      // Sign up user if doesn't exist (passwordless)
      try {
        await Auth.signUp({
          username: email,
          password: Math.random().toString(36).slice(2), // Random password (not used)
          attributes: { email },
        });
      } catch (error: any) {
        // User already exists, that's fine
        if (!error.message?.includes("already exists")) {
          throw error;
        }
      }

      // Initiate sign in - will trigger email with temporary code
      const result = await Auth.signIn(email);

      localStorage.setItem(EMAIL_KEY, email);
      localStorage.setItem(SESSION_KEY, JSON.stringify(result));

      setState((s) => ({
        ...s,
        email,
        isLoading: false,
        error: null,
        sessionId: result.Session || null,
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
      const sessionStr = localStorage.getItem(SESSION_KEY);

      if (!email || !sessionStr) throw new Error("Session not found");

      const session = JSON.parse(sessionStr);

      // Complete sign in with code
      const user = await Auth.sendCustomChallengeAnswer(session, code);

      setState({
        user,
        email,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionId: null,
      });

      localStorage.removeItem(SESSION_KEY);

      return user;
    } catch (error: any) {
      const errorMsg = error.message || "Invalid code";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await Auth.signOut();
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(EMAIL_KEY);
      setState({
        user: null,
        email: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionId: null,
      });
    } catch (error: any) {
      console.error("Sign out error:", error);
    }
  }, []);

  return {
    ...state,
    signInWithEmail,
    verifyCode,
    signOut,
  };
}
