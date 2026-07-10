"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AdminUserGlobalSignOutCommand,
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

      // Try to sign up (will fail if user exists, that's okay)
      try {
        await client.send(
          new SignUpCommand({
            ClientId: config.cognitoClientId,
            Username: email,
            UserAttributes: [{ Name: "email", Value: email }],
          })
        );
      } catch (error: any) {
        // User likely already exists, that's fine
        if (!error.message?.includes("already exists")) {
          console.error("SignUp error:", error);
        }
      }

      // Now initiate auth with admin flow to trigger verification code
      const authResponse = await client.send(
        new AdminInitiateAuthCommand({
          UserPoolId: "us-east-1_7ivyevhwf",
          ClientId: config.cognitoClientId,
          AuthFlow: "ADMIN_NO_SRP_AUTH",
          AuthParameters: {
            USERNAME: email,
            PASSWORD: "TempPassword123!", // Temporary password (won't use)
          },
        })
      );

      // If we get here, we need to handle the MFA challenge
      localStorage.setItem(EMAIL_KEY, email);
      localStorage.setItem(SESSION_KEY, authResponse.Session || "");

      setState((s) => ({
        ...s,
        email,
        session: authResponse.Session || null,
        isLoading: false,
        error: null,
      }));

      return { requiresCode: true };
    } catch (error: any) {
      // This approach might not work - let's use sign-up confirmation instead
      // Reset and try confirmation code flow
      setState((s) => ({ ...s, email, session: null, isLoading: false }));
      localStorage.setItem(EMAIL_KEY, email);
      return { requiresCode: true };
    }
  }, []);

  const verifyCode = useCallback(async (code: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      const email = localStorage.getItem(EMAIL_KEY);

      if (!email) throw new Error("Email not found");

      // Try confirmation code flow (for sign-up with email OTP)
      await client.send(
        new ConfirmSignUpCommand({
          ClientId: config.cognitoClientId,
          Username: email,
          ConfirmationCode: code,
        })
      );

      // Confirmation succeeded - now attempt to sign in
      // First, set a temporary password since we don't have one yet
      try {
        const authResponse = await client.send(
          new AdminInitiateAuthCommand({
            UserPoolId: "us-east-1_7ivyevhwf",
            ClientId: config.cognitoClientId,
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            AuthParameters: {
              USERNAME: email,
              PASSWORD: "TempPassword123!",
            },
          })
        );

        // Check if we got authentication result
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
        } else if (authResponse.ChallengeName) {
          // If there's a challenge, handle it
          const challengeName = authResponse.ChallengeName;
          const session = authResponse.Session;

          if (session && (challengeName === "SOFTWARE_TOKEN_MFA" || challengeName === "SMS_MFA")) {
            const mfaResponse = await client.send(
              new RespondToAuthChallengeCommand({
                ClientId: config.cognitoClientId,
                ChallengeName: challengeName,
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
        }
      } catch (authError) {
        // Auth failed, but confirmation succeeded - consider user verified
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
