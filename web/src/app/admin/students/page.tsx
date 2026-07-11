"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useSafeAuth } from "@/lib/useSafeAuth";
import { adminFetchAllEnrollments, type AdminEnrollment } from "@/lib/api";
import { programs } from "@/lib/programs";

export default function AdminStudentsPage() {
  const auth = useSafeAuth();
  const groups = String((auth.user?.profile as any)?.["cognito:groups"] ?? "");
  const isAdmin = groups.includes("admin");

  const [enrollments, setEnrollments] = useState<AdminEnrollment[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isAdmin || !auth.user?.id_token) return;
    adminFetchAllEnrollments(auth.user.id_token)
      .then(setEnrollments)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load students."));
  }, [isAdmin, auth.user]);

  const filtered = useMemo(() => {
    if (!enrollments) return null;
    const q = query.trim().toLowerCase();
    if (!q) return enrollments;
    return enrollments.filter(
      (e) =>
        e.studentName.toLowerCase().includes(q) ||
        e.parentEmail.toLowerCase().includes(q) ||
        e.cohortId.toLowerCase().includes(q) ||
        e.programId.toLowerCase().includes(q)
    );
  }, [enrollments, query]);

  return (
    <AdminShell title="Students">
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="admin-panel">
        <div className="admin-form" style={{ maxWidth: "420px" }}>
          <label>
            Search
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Student, parent email, cohort, or program"
            />
          </label>
        </div>

        {filtered === null && !error && <p>Loading students…</p>}
        {filtered && filtered.length === 0 && (
          <p>
            {query
              ? "No students match that search."
              : "No students enrolled yet — they'll appear here after a family completes payment."}
          </p>
        )}
        {filtered && filtered.length > 0 && (
          <>
            <p className="mono enroll-meta">
              {filtered.length} enrollment{filtered.length === 1 ? "" : "s"}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Student</th><th>Age</th><th>Program</th><th>Cohort</th>
                    <th>Parent email</th><th>Payment</th><th>Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <tr key={i}>
                      <td>{e.studentName || "—"}</td>
                      <td>{e.studentAge || "—"}</td>
                      <td>{programs.find((p) => p.id === e.programId)?.name ?? e.programId}</td>
                      <td className="mono">{e.cohortId}</td>
                      <td>{e.parentEmail}</td>
                      <td>{e.paymentStatus}</td>
                      <td>{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
