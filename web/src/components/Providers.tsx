"use client";

import { useEffect, useState } from "react";
import { AuthProvider } from "react-oidc-context";
import { config } from "@/lib/config";

export function Providers({ children }: { children: React.ReactNode }) {
  // oidc-client-ts touches window/sessionStorage at construction, so the
  // provider mounts only in the browser. During static prerender, pages
  // render auth-less via useSafeAuth()'s stub.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;

  return (
    <AuthProvider
      authority={config.cognitoAuthority}
      client_id={config.cognitoClientId}
      redirect_uri={`${window.location.origin}/dashboard/`}
      response_type="code"
      scope="openid email profile"
      onSigninCallback={() => {
        // Strip ?code & ?state so refreshes don't retry the exchange.
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
    >
      {children}
    </AuthProvider>
  );
}
