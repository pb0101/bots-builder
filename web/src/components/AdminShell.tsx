"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSafeAuth } from "@/lib/useSafeAuth";

const TABS = [
  { href: "/admin/", label: "Overview" },
  { href: "/admin/cohorts/", label: "Cohorts & rosters" },
  { href: "/admin/students/", label: "Students" },
  { href: "/admin/parents/", label: "Parents" },
  { href: "/admin/inventory/", label: "Inventory" },
  { href: "/admin/curriculum/", label: "Curriculum" },
  { href: "/schedule/", label: "Public schedule ↗" },
];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const auth = useSafeAuth();
  const pathname = usePathname();
  const groups = String((auth.user?.profile as any)?.["cognito:groups"] ?? "");
  const isAdmin = groups.includes("admin");

  if (auth.isLoading) {
    return <section className="section"><p>Signing you in…</p></section>;
  }

  if (!auth.isAuthenticated) {
    return (
      <section className="section section-narrow">
        <h1>Staff sign-in</h1>
        <Link href="/signin/" className="btn btn-primary">Sign in</Link>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="section section-narrow">
        <h1>Staff only</h1>
        <p>This account isn&rsquo;t in the admin group. Parents: your classes are in the dashboard.</p>
      </section>
    );
  }

  return (
    <section className="section">
      <p className="eyebrow">Admin</p>
      <h1>{title}</h1>
      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={pathname === t.href ? "admin-tab admin-tab-active" : "admin-tab"}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </section>
  );
}
