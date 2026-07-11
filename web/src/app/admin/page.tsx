"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { useSafeAuth } from "@/lib/useSafeAuth";
import {
  adminFetchAllEnrollments,
  adminFetchUsers,
  fetchCohorts,
  type AdminEnrollment,
  type AdminUser,
  type Cohort,
} from "@/lib/api";
import { programs } from "@/lib/programs";
import { formatDateRange } from "@/lib/format";

export default function AdminOverviewPage() {
  const auth = useSafeAuth();
  const groups = String((auth.user?.profile as any)?.["cognito:groups"] ?? "");
  const isAdmin = groups.includes("admin");

  const [cohorts, setCohorts] = useState<Cohort[] | null>(null);
  const [enrollments, setEnrollments] = useState<AdminEnrollment[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin || !auth.user?.id_token) return;
    const token = auth.user.id_token;
    fetchCohorts(true).then(setCohorts).catch(() => setError("Couldn't load cohorts."));
    adminFetchAllEnrollments(token).then(setEnrollments).catch(() => setError("Couldn't load enrollments."));
    adminFetchUsers(token).then(setUsers).catch(() => setError("Couldn't load parents."));
  }, [isAdmin, auth.user]);

  const openSeats = cohorts?.reduce((sum, c) => sum + (c.status === "open" ? c.seatsLeft : 0), 0);
  const paidEnrollments = enrollments?.filter((e) => e.paymentStatus === "paid");

  const stat = (value: number | undefined | null, label: string, href: string) => (
    <Link href={href} className="stat-card" style={{ textDecoration: "none" }}>
      <div className="stat-value">{value ?? "…"}</div>
      <div className="stat-label">{label}</div>
    </Link>
  );

  return (
    <AdminShell title="Overview">
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="stat-grid">
        {stat(cohorts?.length, "Upcoming cohorts", "/admin/cohorts/")}
        {stat(openSeats, "Open seats", "/admin/cohorts/")}
        {stat(enrollments?.length, "Students enrolled", "/admin/students/")}
        {stat(users?.length, "Registered parents", "/admin/parents/")}
      </div>

      <div className="admin-grid">
        <div className="admin-panel">
          <h2>Upcoming schedule</h2>
          {cohorts === null && <p>Loading…</p>}
          {cohorts && cohorts.length === 0 && (
            <p>No upcoming cohorts. <Link href="/admin/cohorts/">Create one</Link> to open enrollment.</p>
          )}
          {cohorts && cohorts.length > 0 && (
            <ul className="admin-cohort-list">
              {cohorts.map((c) => (
                <li key={c.cohortId}>
                  <div>
                    <p className="enroll-name">
                      {programs.find((p) => p.id === c.programId)?.name ?? c.programId}
                    </p>
                    <p className="mono enroll-meta">
                      {formatDateRange(c.startDate, c.endDate)} · {c.dayOfWeek}s {c.time} · {c.location}
                      {" · "}{c.capacity - c.seatsLeft}/{c.capacity} enrolled · {c.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-panel">
          <h2>Latest enrollments</h2>
          {enrollments === null && <p>Loading…</p>}
          {enrollments && enrollments.length === 0 && (
            <p>No enrollments yet — they&rsquo;ll appear here as soon as a family completes payment.</p>
          )}
          {enrollments && enrollments.length > 0 && (
            <ul className="admin-cohort-list">
              {enrollments.slice(0, 6).map((e, i) => (
                <li key={i}>
                  <div>
                    <p className="enroll-name">{e.studentName || "—"}</p>
                    <p className="mono enroll-meta">
                      {e.cohortId} · {e.parentEmail} · {e.paymentStatus}
                      {" · "}{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {paidEnrollments && enrollments && enrollments.length > 0 && (
            <p className="mono enroll-meta" style={{ marginTop: "0.75rem" }}>
              {paidEnrollments.length} paid · {enrollments.length - paidEnrollments.length} other
              {" · "}<Link href="/admin/students/">See all students</Link>
            </p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
