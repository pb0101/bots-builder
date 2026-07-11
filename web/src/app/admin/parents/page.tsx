"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useSafeAuth } from "@/lib/useSafeAuth";
import {
  adminFetchAllEnrollments,
  adminFetchUsers,
  type AdminEnrollment,
  type AdminUser,
} from "@/lib/api";

export default function AdminParentsPage() {
  const auth = useSafeAuth();
  const groups = String((auth.user?.profile as any)?.["cognito:groups"] ?? "");
  const isAdmin = groups.includes("admin");

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isAdmin || !auth.user?.id_token) return;
    const token = auth.user.id_token;
    adminFetchUsers(token)
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load parents."));
    adminFetchAllEnrollments(token).then(setEnrollments).catch(() => {});
  }, [isAdmin, auth.user]);

  const enrollCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of enrollments) {
      counts.set(e.parentEmail, (counts.get(e.parentEmail) ?? 0) + 1);
    }
    return counts;
  }, [enrollments]);

  const filtered = useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <AdminShell title="Parents">
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="admin-panel">
        <div className="admin-form" style={{ maxWidth: "420px" }}>
          <label>
            Search
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or email"
            />
          </label>
        </div>

        {filtered === null && !error && <p>Loading parents…</p>}
        {filtered && filtered.length === 0 && (
          <p>{query ? "No parents match that search." : "No registered parents yet."}</p>
        )}
        {filtered && filtered.length > 0 && (
          <>
            <p className="mono enroll-meta">
              {filtered.length} account{filtered.length === 1 ? "" : "s"}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Status</th><th>Enrollments</th><th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={i}>
                      <td>{u.name || "—"}</td>
                      <td>{u.email}</td>
                      <td>{u.status === "CONFIRMED" ? "Verified" : u.status.toLowerCase()}</td>
                      <td>{enrollCounts.get(u.email) ?? 0}</td>
                      <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
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
