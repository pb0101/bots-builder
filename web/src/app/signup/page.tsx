"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import styles from "../auth.module.css";

export default function SignUpPage() {
  const router = useRouter();
  const auth = useAuth();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter", ok: /[a-z]/.test(password) },
    { label: "One number", ok: /\d/.test(password) },
  ];
  const passwordOk = rules.every((r) => r.ok);
  const confirmOk = confirm.length > 0 && password === confirm;
  const canSubmit = passwordOk && confirmOk && firstName.trim() !== "" && email.trim() !== "";

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      await auth.signUp(email.trim(), password, firstName.trim());
      router.push("/verify-email/");
    } catch (error: any) {
      setFormError(error.message || "Sign up failed. Please try again.");
      setBusy(false);
    }
  };

  if (auth.isLoading) {
    return <div className={styles.wrap}><p>Loading…</p></div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1>You&rsquo;re signed in</h1>
          <p className={styles.lede}>
            Head to your <Link href="/dashboard/">dashboard</Link> to see your classes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Parent account</p>
        <h1>Create your account</h1>
        <p className={styles.lede}>
          One account to enroll your kids, track classes, and get Demo Day details.
        </p>

        <form onSubmit={handleSignUp} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="firstName">Your first name</label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g., Priya"
              maxLength={80}
              required
              disabled={busy}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={busy}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={busy}
            />
            <ul className={styles.rules} aria-live="polite">
              {rules.map((r) => (
                <li key={r.label} className={r.ok ? styles.ruleOk : undefined}>
                  {r.label}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.field}>
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              disabled={busy}
            />
            {confirm.length > 0 && (
              <p className={confirmOk ? styles.matchOk : styles.matchBad} aria-live="polite">
                {confirmOk ? "✓ Passwords match" : "Passwords don't match yet"}
              </p>
            )}
          </div>

          {(formError || auth.error) && (
            <p className={styles.error} role="alert">{formError || auth.error}</p>
          )}

          <button type="submit" className={styles.submit} disabled={busy || !canSubmit}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <hr className={styles.divider} />
        <p className={styles.switch}>
          Already have an account? <Link href="/signin/">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
