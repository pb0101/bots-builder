"use client";

import { useCallback, useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import {
  signUp,
  confirmSignUp,
  resendSignUpCode,
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_7ivyevhwf",
      userPoolClientId: "67rq6l3fg8175c2bgendlj5kus",
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

export const PENDING_EMAIL_KEY = "bots-builder-pending-email";

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    email: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const loadSession = useCallback(async () => {
    const current = await getCurrentUser();
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken;
    const email =
      (idToken?.payload?.email as string) ??
      current.signInDetails?.loginId ??
      current.username;

    setState({
      user: {
        ...current,
        id_token: idToken?.toString(),
        profile: idToken?.payload ?? { email },
      },
      email,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    return email;
  }, []);

  // Check for an existing session on mount
  useEffect(() => {
    loadSession().catch(() => setState((s) => ({ ...s, isLoading: false })));
  }, [loadSession]);

  const handleSignUp = useCallback(async (email: string, password: string, givenName: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      await signUp({
        username: email,
        password,
        options: {
          userAttributes: { email, given_name: givenName },
        },
      });

      localStorage.setItem(PENDING_EMAIL_KEY, email);
      setState((s) => ({ ...s, email, isLoading: false, error: null }));

      return { requiresVerification: true };
    } catch (error: any) {
      const errorMsg = error.message || "Sign up failed";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const handleConfirmSignUp = useCallback(async (email: string, code: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      localStorage.removeItem(PENDING_EMAIL_KEY);
      setState((s) => ({ ...s, isLoading: false, error: null }));

      return { email };
    } catch (error: any) {
      const errorMsg = error.message || "Verification failed";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const handleResendCode = useCallback(async (email: string) => {
    try {
      setState((s) => ({ ...s, error: null }));
      await resendSignUpCode({ username: email });
    } catch (error: any) {
      const errorMsg = error.message || "Could not resend the code";
      setState((s) => ({ ...s, error: errorMsg }));
      throw error;
    }
  }, []);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      try {
        setState((s) => ({ ...s, isLoading: true, error: null }));

        const { isSignedIn, nextStep } = await signIn({ username: email, password });

        if (nextStep?.signInStep === "CONFIRM_SIGN_UP") {
          // Account exists but email was never verified
          localStorage.setItem(PENDING_EMAIL_KEY, email);
          await resendSignUpCode({ username: email }).catch(() => {});
          setState((s) => ({ ...s, isLoading: false }));
          return { requiresVerification: true };
        }

        if (isSignedIn) {
          await loadSession();
          return { email };
        }

        throw new Error("Sign in failed");
      } catch (error: any) {
        if (error.name === "UserNotConfirmedException") {
          localStorage.setItem(PENDING_EMAIL_KEY, email);
          setState((s) => ({ ...s, isLoading: false }));
          return { requiresVerification: true };
        }
        const errorMsg = error.message || "Sign in failed";
        setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
        throw error;
      }
    },
    [loadSession]
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error: any) {
      console.error("Sign out error:", error);
    }
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
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    resendCode: handleResendCode,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
