"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import styles from "./signin.module.css";

export default function SignInPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      await auth.signInWithEmail(email);
      setStep("code");
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) return;

    try {
      await auth.verifyCode(code);
      router.push("/dashboard/");
    } catch (error) {
      console.error("Verification error:", error);
    }
  };

  const handleResendCode = async () => {
    try {
      await auth.signInWithEmail(email);
    } catch (error) {
      console.error("Resend error:", error);
    }
  };

  if (auth.isLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1>Sign In to Bots Builder</h1>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={auth.isLoading}
                required
              />
            </div>

            {auth.error && <div className={styles.error}>{auth.error}</div>}

            <button
              type="submit"
              disabled={auth.isLoading || !email.trim()}
              className={styles.button}
            >
              {auth.isLoading ? "Sending code..." : "Send Code"}
            </button>

            <p className={styles.info}>
              We'll send a 6-digit code to your email. No password needed.
            </p>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className={styles.form}>
            <p className={styles.subtitle}>Enter the code sent to {email}</p>

            <div className={styles.inputGroup}>
              <label htmlFor="code">6-Digit Code</label>
              <input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                disabled={auth.isLoading}
                required
                className={styles.codeInput}
              />
            </div>

            {auth.error && <div className={styles.error}>{auth.error}</div>}

            <button
              type="submit"
              disabled={auth.isLoading || code.length !== 6}
              className={styles.button}
            >
              {auth.isLoading ? "Verifying..." : "Verify Code"}
            </button>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={auth.isLoading}
                className={styles.link}
              >
                Didn't receive it? Resend
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setEmail("");
                }}
                disabled={auth.isLoading}
                className={styles.link}
              >
                Use different email
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
