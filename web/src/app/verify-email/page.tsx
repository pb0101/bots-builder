"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, PENDING_EMAIL_KEY } from "@/lib/useAuth";
import styles from "../auth.module.css";

export default function VerifyEmailPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEmail(localStorage.getItem(PENDING_EMAIL_KEY));
    setReady(true);
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setFormError("");
    setBusy(true);

    try {
      await auth.confirmSignUp(email, code);
      router.push("/signin/?verified=1");
    } catch (error: any) {
      setFormError(error.message || "Verification failed. Check the code and try again.");
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setFormError("");
    setNotice("");
    try {
      await auth.resendCode(email);
      setNotice("A new code is on its way to your inbox.");
    } catch (error: any) {
      setFormError(error.message || "Couldn't resend the code.");
    }
  };

  if (!ready) {
    return <div className={styles.wrap}><p>Loading…</p></div>;
  }

  if (!email) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1>Nothing to verify</h1>
          <p className={styles.lede}>
            We couldn&rsquo;t find a pending sign-up on this device.
          </p>
          <p className={styles.switch}>
            <Link href="/signup/">Create an account</Link> or{" "}
            <Link href="/signin/">sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>One last step</p>
        <h1>Check your email</h1>
        <p className={styles.lede}>
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to
          verify your account.
        </p>

        <form onSubmit={handleVerify} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="code">Verification code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={styles.codeInput}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              disabled={busy}
            />
          </div>

          {notice && <p className={styles.notice} role="status">{notice}</p>}
          {(formError || auth.error) && (
            <p className={styles.error} role="alert">{formError || auth.error}</p>
          )}

          <button type="submit" className={styles.submit} disabled={busy || code.length !== 6}>
            {busy ? "Verifying…" : "Verify email"}
          </button>
        </form>

        <hr className={styles.divider} />
        <p className={styles.switch}>
          Didn&rsquo;t get it?{" "}
          <button type="button" className={styles.linkBtn} onClick={handleResend} disabled={busy}>
            Resend code
          </button>
        </p>
      </div>
    </div>
  );
}
