"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function SignUpPage() {
  const router = useRouter();
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await auth.signUp(username, password, email);
      router.push("/verify-email/");
    } catch (error: any) {
      alert(error.message || "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (auth.isLoading) {
    return <section className="section"><p>Loading...</p></section>;
  }

  if (auth.isAuthenticated) {
    return (
      <section className="section">
        <p>You're already signed in. <Link href="/dashboard/">Go to dashboard</Link></p>
      </section>
    );
  }

  return (
    <section className="section section-narrow">
      <h1>Sign Up</h1>
      <form onSubmit={handleSignUp} className="auth-form">
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your-username"
            required
            disabled={isLoading}
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={isLoading}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 10 characters, mix of upper/lower, numbers"
            required
            disabled={isLoading}
          />
        </label>

        {auth.error && <p className="form-error">{auth.error}</p>}

        <button className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p>Already have an account? <Link href="/signin/">Sign in</Link></p>
    </section>
  );
}
