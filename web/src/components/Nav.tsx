"use client";

import Link from "next/link";
import { useSafeAuth } from "@/lib/useSafeAuth";
import { config } from "@/lib/config";

export function Nav() {
  const auth = useSafeAuth();

  const signOut = () => {
    const logoutUrl =
      `${config.cognitoDomain}/logout?client_id=${config.cognitoClientId}` +
      `&logout_uri=${encodeURIComponent(window.location.origin)}`;
    auth.removeUser().then(() => (window.location.href = logoutUrl));
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
            <button className="nav-link-btn" onClick={signOut}>Sign out</button>
          </>
        ) : (
          <button className="nav-cta" onClick={() => auth.signinRedirect()}>
            Sign in
          </button>
        )}
      </nav>
    </header>
  );
}
