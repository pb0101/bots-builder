"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AdminUserGlobalSignOutCommand,
  AdminSetUserPasswordCommand,
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

      // Create or get user and trigger email with confirmation code
      try {
        await client.send(
          new AdminCreateUserCommand({
            UserPoolId: "us-east-1_7ivyevhwf",
            Username: email,
            UserAttributes: [{ Name: "email", Value: email }],
            MessageAction: "SUPPRESS", // Don't send welcome email, just confirmation
            TemporaryPassword: Math.random().toString(36).slice(-10), // Random temp password
          })
        );
      } catch (error: any) {
        // User might already exist, that's fine
        if (!error.message?.includes("already exists")) {
          console.error("AdminCreateUser error:", error);
        }
      }

      // Now initiate auth flow to trigger the confirmation code email
      try {
        const authResponse = await client.send(
          new AdminInitiateAuthCommand({
            UserPoolId: "us-east-1_7ivyevhwf",
            ClientId: config.cognitoClientId,
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            AuthParameters: {
              USERNAME: email,
              PASSWORD: Math.random().toString(36).slice(-10), // Dummy password
            },
          })
        );

        localStorage.setItem(EMAIL_KEY, email);
        const sessionData = {
          session: authResponse.Session,
          challengeName: authResponse.ChallengeName,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

        setState((s) => ({
          ...s,
          email,
          session: authResponse.Session || null,
          isLoading: false,
          error: null,
        }));
      } catch {
        // Auth might fail due to invalid password, but email should be sent
        localStorage.setItem(EMAIL_KEY, email);
        setState((s) => ({
          ...s,
          email,
          session: null,
          isLoading: false,
          error: null,
        }));
      }

      return { requiresCode: true };
    } catch (error: any) {
      const errorMsg = error.message || "Could not sign in";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const verifyCode = useCallback(async (code: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      const email = localStorage.getItem(EMAIL_KEY);
      const sessionStr = localStorage.getItem(SESSION_KEY);

      if (!email) throw new Error("Email not found");

      if (sessionStr) {
        // Get challenge name from stored session data
        const sessionData = JSON.parse(sessionStr);
        const challengeName = sessionData.challengeName || "SOFTWARE_TOKEN_MFA";
        const session = sessionData.session || sessionStr;

        const mfaResponse = await client.send(
          new RespondToAuthChallengeCommand({
            ClientId: config.cognitoClientId,
            ChallengeName: challengeName as any,
            Session: session,
            ChallengeResponses: {
              USERNAME: email,
              SOFTWARE_TOKEN_MFA_CODE: code,
            },
          })
        );

        if (mfaResponse.AuthenticationResult) {
          const tokens = {
            accessToken: mfaResponse.AuthenticationResult.AccessToken,
            idToken: mfaResponse.AuthenticationResult.IdToken,
            refreshToken: mfaResponse.AuthenticationResult.RefreshToken,
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
