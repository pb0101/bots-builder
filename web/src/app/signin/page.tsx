"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import styles from "../auth.module.css";

export default function SignInPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("verified")) {
      setNotice("Email verified — sign in below to get started.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);

    try {
      const result = await auth.signIn(email.trim(), password);
      if (result?.requiresVerification) {
        router.push("/verify-email/");
        return;
      }
      router.push("/dashboard/");
    } catch (error: any) {
      setFormError(error.message || "Sign in failed. Check your email and password.");
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
        <p className={styles.eyebrow}>Welcome back</p>
        <h1>Sign in</h1>
        <p className={styles.lede}>
          Enrollments, cohort dates, and Demo Day details — all in your dashboard.
        </p>

        <form onSubmit={handleSignIn} className={styles.form}>
          {notice && <p className={styles.notice} role="status">{notice}</p>}
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              disabled={busy}
            />
          </div>

          {(formError || auth.error) && (
            <p className={styles.error} role="alert">{formError || auth.error}</p>
          )}

          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <hr className={styles.divider} />
        <p className={styles.switch}>
          New to Bots Builder? <Link href="/signup/">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
