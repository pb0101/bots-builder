"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSafeAuth } from "@/lib/useSafeAuth";
import {
  adminFetchRoster,
  adminNotifyWaitlist,
  adminSaveCohort,
  fetchCohorts,
  type Cohort,
  type NewCohort,
  type RosterEntry,
  type WaitlistEntry,
} from "@/lib/api";
import { programs } from "@/lib/programs";
import { formatDateRange } from "@/lib/format";

const emptyForm: NewCohort = {
  programId: "explorer",
  startDate: "",
  endDate: "",
  dayOfWeek: "Saturday",
  time: "10:00 AM",
  location: "Frisco, TX",
  capacity: 8,
};

export default function AdminPage() {
  const auth = useSafeAuth();
  const groups = String((auth.user?.profile as any)?.["cognito:groups"] ?? "");
  const isAdmin = groups.includes("admin");

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [form, setForm] = useState<NewCohort>(emptyForm);
  const [status, setStatus] = useState("");
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [rosterFor, setRosterFor] = useState("");

  const reload = () => fetchCohorts().then(setCohorts).catch(() => {});
  useEffect(() => { if (isAdmin) reload(); }, [isAdmin]);

  if (auth.isLoading) return <section className="section"><p>Signing you in…</p></section>;
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

  const save = async () => {
    setStatus("");
    if (!auth.user?.id_token) return;
    try {
      const res = await adminSaveCohort(auth.user.id_token, form);
      setStatus(`Saved cohort ${res.cohortId}.`);
      setForm(emptyForm);
      reload();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const loadRoster = async (cohortId: string) => {
    if (!auth.user?.id_token) return;
    setRosterFor(cohortId);
    setRoster(null);
    const res = await adminFetchRoster(auth.user.id_token, cohortId);
    setRoster(res.roster);
    setWaitlist(res.waitlist);
  };

  const set = (k: keyof NewCohort) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: k === "capacity" ? Number(e.target.value) : e.target.value });

  return (
    <section className="section">
      <p className="eyebrow">Admin</p>
      <h1>Cohorts &amp; rosters</h1>

      <div className="admin-grid">
        <div className="admin-panel">
          <h2>Create a cohort</h2>
          <div className="admin-form">
            <label>Program
              <select value={form.programId} onChange={set("programId")}>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>Start date<input type="date" value={form.startDate} onChange={set("startDate")} /></label>
            <label>End date<input type="date" value={form.endDate} onChange={set("endDate")} /></label>
            <label>Day of week<input value={form.dayOfWeek} onChange={set("dayOfWeek")} /></label>
            <label>Time<input value={form.time} onChange={set("time")} /></label>
            <label>Location<input value={form.location} onChange={set("location")} /></label>
            <label>Capacity<input type="number" min={1} max={20} value={form.capacity} onChange={set("capacity")} /></label>
            <label>Status
              <select value={form.status ?? "open"} onChange={set("status")}>
                <option value="open">open</option>
                <option value="closed">closed</option>
              </select>
            </label>
            <button className="btn btn-primary" onClick={save}>Save cohort</button>
            {status && <p className="cohort-msg">{status}</p>}
          </div>
        </div>

        <div className="admin-panel">
          <h2>Existing cohorts</h2>
          {cohorts.length === 0 && <p>No upcoming cohorts yet.</p>}
          <ul className="admin-cohort-list">
            {cohorts.map((c) => (
              <li key={c.cohortId}>
                <div>
                  <p className="enroll-name">{programs.find((p) => p.id === c.programId)?.name ?? c.programId}</p>
                  <p className="mono enroll-meta">
                    {formatDateRange(c.startDate, c.endDate)} · {c.dayOfWeek}s {c.time} ·{" "}
                    {c.capacity - c.seatsLeft}/{c.capacity} enrolled · {c.status}
                  </p>
                </div>
                <div className="admin-row-actions">
                  <button className="btn btn-ghost" onClick={() => loadRoster(c.cohortId)}>Roster</button>
                  <button
                    className="nav-link-btn"
                    onClick={async () => {
                      if (!auth.user?.id_token) return;
                      await adminSaveCohort(auth.user.id_token, {
                        cohortId: c.cohortId,
                        programId: c.programId,
                        startDate: c.startDate,
                        endDate: c.endDate,
                        dayOfWeek: c.dayOfWeek,
                        time: c.time,
                        location: c.location,
                        capacity: c.capacity,
                        status: c.status === "open" ? "closed" : "open",
                      });
                      reload();
                    }}
                  >
                    {c.status === "open" ? "Close" : "Reopen"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {rosterFor && (
        <div className="admin-panel">
          <h2 className="mono">Roster · {rosterFor}</h2>
          {roster === null && <p>Loading…</p>}
          {roster && roster.length === 0 && <p>No enrollments yet.</p>}
          {roster && roster.length > 0 && (
            <table className="roster-table">
              <thead><tr><th>Student</th><th>Age</th><th>Parent email</th><th>Payment</th></tr></thead>
              <tbody>
                {roster.map((r, i) => (
                  <tr key={i}>
                    <td>{r.studentName}</td><td>{r.studentAge}</td>
                    <td>{r.parentEmail}</td><td>{r.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {waitlist.length > 0 && (
            <>
              <h3>Waitlist</h3>
              <ul>{waitlist.map((w, i) => <li key={i}>{w.studentName || "—"} · {w.parentEmail}</li>)}</ul>
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  if (!auth.user?.id_token) return;
                  const res = await adminNotifyWaitlist(auth.user.id_token, rosterFor);
                  setStatus(`Emailed ${res.notified} waitlisted ${res.notified === 1 ? "family" : "families"}.`);
                }}
              >
                Email waitlist: a seat opened
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
