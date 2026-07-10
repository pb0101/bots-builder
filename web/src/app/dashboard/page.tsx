"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSafeAuth } from "@/lib/useSafeAuth";
import {
  createCheckout,
  fetchCohorts,
  fetchEnrollments,
  joinWaitlist,
  type Cohort,
  type Enrollment,
} from "@/lib/api";
import { programs } from "@/lib/programs";
import { formatDateRange } from "@/lib/format";

export default function DashboardPage() {
  const auth = useSafeAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Resume an action started before sign-in.
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.id_token) return;
    const raw = sessionStorage.getItem("pendingCheckout");
    if (!raw) return;
    sessionStorage.removeItem("pendingCheckout");
    try {
      const intent = JSON.parse(raw);
      if (intent.waitlist) {
        joinWaitlist(auth.user.id_token, intent.cohortId, intent.studentName ?? "")
          .then(setNotice)
          .catch(() => setError("Couldn't join the waitlist. Find the class in the schedule to retry."));
      } else if (intent.cohortId && intent.studentName) {
        createCheckout(auth.user.id_token, intent)
          .then((url) => (window.location.href = url))
          .catch((e) =>
            setError(e instanceof Error ? e.message : "Checkout didn't start. Retry from the schedule.")
          );
      }
    } catch { /* malformed intent: ignore */ }
  }, [auth.isAuthenticated, auth.user]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.id_token) {
      fetchEnrollments(auth.user.id_token)
        .then(setEnrollments)
        .catch(() => setError("Couldn't load your classes. Refresh to try again."));
      fetchCohorts().then(setCohorts).catch(() => {});
    }
  }, [auth.isAuthenticated, auth.user]);

  // Payment-return banner.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const enrolled = params.get("enrolled");
    if (enrolled) {
      const name = programs.find((p) => p.id === enrolled)?.name ?? "your class";
      setNotice(`Payment received — ${name} is booked. A confirmation email is on its way.`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (auth.isLoading) return <section className="section"><p>Signing you in…</p></section>;

  if (!auth.isAuthenticated) {
    return (
      <section className="section section-narrow">
        <h1>Your classes live here</h1>
        <p>Sign in to see enrollments, cohort dates, and Demo Day details.</p>
        <button className="btn btn-primary" onClick={() => auth.signinRedirect()}>
          Sign in or create an account
        </button>
      </section>
    );
  }

  const name = (auth.user?.profile?.given_name as string) ?? "there";

  return (
    <section className="section">
      <p className="eyebrow">Parent dashboard</p>
      <h1>Hi {name} 👋</h1>
      {notice && <p className="notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      <h2>Your enrollments</h2>
      {enrollments === null && !error && <p>Loading your classes…</p>}
      {enrollments && enrollments.length === 0 && (
        <div className="empty-state">
          <p>No classes yet — pick a cohort with open seats.</p>
          <Link href="/schedule/" className="btn btn-primary">See the schedule</Link>
        </div>
      )}
      {enrollments && enrollments.length > 0 && (
        <ul className="enroll-list">
          {enrollments.map((e) => {
            const program = programs.find((p) => p.id === e.programId);
            const cohort = cohorts.find((c) => c.cohortId === e.cohortId);
            return (
              <li key={`${e.cohortId}-${e.createdAt}`} className="enroll-item">
                <div>
                  <p className="enroll-name">
                    {e.studentName ? `${e.studentName} · ` : ""}{program?.name ?? e.programId}
                  </p>
                  <p className="mono enroll-meta">
                    {cohort
                      ? `${formatDateRange(cohort.startDate, cohort.endDate)} · ${cohort.dayOfWeek}s ${cohort.time} · ${cohort.location}`
                      : `Enrolled ${new Date(e.createdAt).toLocaleDateString()}`}
                    {" · "}
                    {e.paymentStatus === "paid" ? "Paid" : e.paymentStatus}
                  </p>
                </div>
                <span className="badge mono" style={{ background: program?.color ?? "var(--ink)" }}>
                  {program?.badge ?? "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="section-note">
        The final session of every course is Demo Day — families invited. Details arrive by email
        the week before your cohort starts.
      </p>
    </section>
  );
}
