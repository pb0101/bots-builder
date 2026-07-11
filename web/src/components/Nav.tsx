"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export function Nav() {
  const router = useRouter();
  const auth = useAuth();

  const handleSignOut = async () => {
    await auth.signOut();
    router.push("/");
  };

  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label="Bots Builder home">
        <span className="brand-mark" aria-hidden="true">
          <span /><span /><span />
        </span>
        Bots<em>Builder</em>
      </Link>
      <nav aria-label="Main">
        <Link href="/programs/">Programs</Link>
        <Link href="/schedule/">Schedule</Link>
        <Link href="/pricing/">Pricing</Link>
        <Link href="/about/">About</Link>
        {auth.isAuthenticated ? (
          <>
            <Link href="/dashboard/" className="nav-cta">My classes</Link>
            <button className="nav-link-btn" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/signin/">Sign in</Link>
            <Link href="/signup/" className="nav-cta">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
