"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { config } from "./config";

interface AuthState {
  user: any;
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  session: string | null;
}

const TOKEN_KEY = "bots-builder-token";
const TOKENS_KEY = "bots-builder-tokens";
const EMAIL_KEY = "bots-builder-email";
const SESSION_KEY = "bots-builder-session";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    email: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    session: null,
  });

  // Check if user is already authenticated on mount
  useEffect(() => {
    const tokensStr = localStorage.getItem(TOKENS_KEY);
    const email = localStorage.getItem(EMAIL_KEY);

    if (tokensStr && email) {
      const tokens = JSON.parse(tokensStr);
      setState({
        user: { email },
        email,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        session: null,
      });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      // Call Lambda to create user and send email with temporary password
      const response = await fetch(`${config.apiUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sign up");
      }

      // Email has been sent with temporary password
      // Now we wait for user to enter the code from email
      localStorage.setItem(EMAIL_KEY, email);
      localStorage.removeItem(SESSION_KEY);

      setState((s) => ({
        ...s,
        email,
        session: null,
        isLoading: false,
        error: null,
      }));

      return { requiresCode: true };
    } catch (error: any) {
      const errorMsg = error.message || "Could not sign up";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const verifyCode = useCallback(async (code: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      const email = localStorage.getItem(EMAIL_KEY);

      if (!email) throw new Error("Email not found");

      // Use the code (temporary password) from email to authenticate
      const authResponse = await client.send(
        new AdminInitiateAuthCommand({
          UserPoolId: "us-east-1_7ivyevhwf",
          ClientId: config.cognitoClientId,
          AuthFlow: "ADMIN_NO_SRP_AUTH",
          AuthParameters: {
            USERNAME: email,
            PASSWORD: code, // Use the code/temp password from email
          },
        })
      );

      // If auth succeeded, we have tokens
      if (authResponse.AuthenticationResult) {
        const tokens = {
          accessToken: authResponse.AuthenticationResult.AccessToken,
          idToken: authResponse.AuthenticationResult.IdToken,
          refreshToken: authResponse.AuthenticationResult.RefreshToken,
        };
        localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
        localStorage.removeItem(SESSION_KEY);

        setState({
          user: { email },
          email,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          session: null,
        });

        return { email };
      }

      // If there's a challenge (e.g., NEW_PASSWORD_REQUIRED), handle it
      if (authResponse.ChallengeName === "NEW_PASSWORD_REQUIRED" && authResponse.Session) {
        // For passwordless, just accept the temp password
        // Don't require new password setup
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            session: authResponse.Session,
            challengeName: authResponse.ChallengeName,
          })
        );

        setState({
          user: { email },
          email,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          session: authResponse.Session || null,
        });

        return { email };
      }

      throw new Error("Verification failed");
    } catch (error: any) {
      const errorMsg = error.message || "Invalid code";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(TOKENS_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
      localStorage.removeItem(SESSION_KEY);

      setState({
        user: null,
        email: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        session: null,
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
