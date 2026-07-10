"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function VerifyEmailPage() {
  const router = useRouter();
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const email = typeof window !== "undefined" ? localStorage.getItem("bots-builder-email") : null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await auth.confirmSignUp(code);
      router.push("/signin/");
    } catch (error: any) {
      alert(error.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return (
      <section className="section section-narrow">
        <h1>No email found</h1>
        <p><Link href="/signup/">Go back to sign up</Link></p>
      </section>
    );
  }

  return (
    <section className="section section-narrow">
      <h1>Verify Your Email</h1>
      <p>We sent a verification code to <strong>{email}</strong></p>

      <form onSubmit={handleVerify} className="auth-form">
        <label>
          Verification Code
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            maxLength={6}
            required
            disabled={isLoading}
          />
        </label>

        {auth.error && <p className="form-error">{auth.error}</p>}

        <button className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Verifying..." : "Verify & Sign In"}
        </button>
      </form>

      <p><Link href="/signup/">Use different email</Link></p>
    </section>
  );
}
