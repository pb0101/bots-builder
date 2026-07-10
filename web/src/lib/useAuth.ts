"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { config } from "./config";

interface AuthState {
  user: any;
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const TOKENS_KEY = "bots-builder-tokens";
const EMAIL_KEY = "bots-builder-email";
const USERNAME_KEY = "bots-builder-username";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

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
      });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const signUp = useCallback(async (username: string, password: string, email: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      await client.send(
        new SignUpCommand({
          ClientId: config.cognitoClientId,
          Username: username,
          Password: password,
          UserAttributes: [{ Name: "email", Value: email }],
        })
      );

      localStorage.setItem(EMAIL_KEY, email);
      localStorage.setItem(USERNAME_KEY, username);

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

  const confirmSignUp = useCallback(async (code: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      const username = localStorage.getItem(USERNAME_KEY);
      const email = localStorage.getItem(EMAIL_KEY);

      if (!username || !email) throw new Error("Username or email not found");

      await client.send(
        new ConfirmSignUpCommand({
          ClientId: config.cognitoClientId,
          Username: username,
          ConfirmationCode: code,
        })
      );

      setState({
        user: { email },
        email,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { email };
    } catch (error: any) {
      const errorMsg = error.message || "Verification failed";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      const authResponse = await client.send(
        new InitiateAuthCommand({
          ClientId: config.cognitoClientId,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
          },
        })
      );

      if (authResponse.AuthenticationResult) {
        const tokens = {
          accessToken: authResponse.AuthenticationResult.AccessToken,
          idToken: authResponse.AuthenticationResult.IdToken,
          refreshToken: authResponse.AuthenticationResult.RefreshToken,
        };
        localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
        localStorage.setItem(USERNAME_KEY, username);

        setState({
          user: { username },
          email: username,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        return { username };
      }

      throw new Error("Sign in failed");
    } catch (error: any) {
      const errorMsg = error.message || "Sign in failed";
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(USERNAME_KEY);

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
    signUp,
    confirmSignUp,
    signIn,
    signOut,
  };
}
