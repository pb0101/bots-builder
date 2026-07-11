"use client";

import { useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useSafeAuth } from "@/lib/useSafeAuth";
import {
  adminDeleteCohort,
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

export default function AdminCohortsPage() {
  const auth = useSafeAuth();
  const groups = String((auth.user?.profile as any)?.["cognito:groups"] ?? "");
  const isAdmin = groups.includes("admin");

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [form, setForm] = useState<NewCohort>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [rosterFor, setRosterFor] = useState("");

  // fresh=true: skip the browser's 60s cache so new saves show up immediately
  const reload = () => fetchCohorts(true).then(setCohorts).catch(() => {});
  useEffect(() => { if (isAdmin) reload(); }, [isAdmin]);

  const rosterRef = useRef<HTMLDivElement>(null);

  const loadRoster = async (cohortId: string) => {
    if (!auth.user?.id_token) return;
    setStatus("");
    setRosterFor(cohortId);
    setRoster(null);
    try {
      const res = await adminFetchRoster(auth.user.id_token, cohortId);
      setRoster(res.roster);
      setWaitlist(res.waitlist);
    } catch (e) {
      setRosterFor("");
      setStatus(e instanceof Error ? e.message : "Couldn't load the roster.");
    }
  };

  // Bring the roster panel into view once it renders
  useEffect(() => {
    if (rosterFor) rosterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [rosterFor]);

  const save = async () => {
    setStatus("");
    if (!auth.user?.id_token) return;
    try {
      const res = await adminSaveCohort(auth.user.id_token, form);
      setStatus(`${editingId ? "Updated" : "Created"} cohort ${res.cohortId}.`);
      setForm(emptyForm);
      setEditingId(null);
      reload();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const startEdit = (c: Cohort) => {
    setStatus("");
    setEditingId(c.cohortId);
    setForm({
      cohortId: c.cohortId,
      programId: c.programId,
      startDate: c.startDate,
      endDate: c.endDate,
      dayOfWeek: c.dayOfWeek,
      time: c.time,
      location: c.location,
      capacity: c.capacity,
      status: c.status === "full" ? "open" : c.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setStatus("");
  };

  const remove = async (c: Cohort) => {
    if (!auth.user?.id_token) return;
    const enrolled = c.capacity - c.seatsLeft;
    const warning =
      enrolled > 0
        ? `${c.cohortId} has ${enrolled} enrollment${enrolled === 1 ? "" : "s"}. Delete anyway?`
        : `Delete cohort ${c.cohortId}? This can't be undone.`;
    if (!window.confirm(warning)) return;
    try {
      await adminDeleteCohort(auth.user.id_token, c.cohortId);
      setStatus(`Deleted cohort ${c.cohortId}.`);
      if (editingId === c.cohortId) cancelEdit();
      if (rosterFor === c.cohortId) { setRosterFor(""); setRoster(null); }
      reload();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const set = (k: keyof NewCohort) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: k === "capacity" ? Number(e.target.value) : e.target.value });

  return (
    <AdminShell title="Cohorts &amp; rosters">
      <div className="admin-grid">
        <div className="admin-panel">
          <h2>{editingId ? `Edit cohort · ${editingId}` : "Create a cohort"}</h2>
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
            <button className="btn btn-primary" onClick={save}>
              {editingId ? "Update cohort" : "Save cohort"}
            </button>
            {editingId && (
              <button className="nav-link-btn" onClick={cancelEdit}>Cancel edit</button>
            )}
            {status && <p className="cohort-msg" role="status">{status}</p>}
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
                  <button className="nav-link-btn" onClick={() => startEdit(c)}>Edit</button>
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
                  <button
                    className="nav-link-btn"
                    style={{ color: "#b42334" }}
                    onClick={() => remove(c)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {rosterFor && (
        <div className="admin-panel" ref={rosterRef}>
          <h2 className="mono">Roster · {rosterFor}</h2>
          {roster === null && <p>Loading…</p>}
          {roster && roster.length === 0 && (
            <p>No enrollments yet — families appear here as soon as they complete payment.</p>
          )}
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
    </AdminShell>
  );
}
