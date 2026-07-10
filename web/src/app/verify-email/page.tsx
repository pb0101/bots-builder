"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function VerifyEmailPage() {
  const router = useRouter();
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("bots-builder-username") : null;
    setUsername(stored);
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setIsLoading(true);

    try {
      await auth.confirmSignUp(username, code);
      router.push("/signin/");
    } catch (error: any) {
      alert(error.message || "Verification failed");
      setIsLoading(false);
    }
  };

  if (!username) {
    return (
      <section className="section section-narrow">
        <h1>Verification</h1>
        <p>No account found. <Link href="/signup/">Create an account</Link></p>
      </section>
    );
  }

  return (
    <section className="section section-narrow">
      <h1>Verify Email</h1>
      <p>We sent a verification code to your email.</p>

      <form onSubmit={handleVerify} className="auth-form">
        <label>
          6-Digit Code
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            required
            disabled={isLoading}
          />
        </label>

        {auth.error && <p className="form-error">{auth.error}</p>}

        <button className="btn btn-primary" disabled={isLoading || code.length !== 6}>
          {isLoading ? "Verifying..." : "Verify & Continue"}
        </button>
      </form>

      <p><Link href="/signup/">Create different account</Link></p>
    </section>
  );
}
