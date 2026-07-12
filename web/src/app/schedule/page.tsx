"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCohorts, type Cohort } from "@/lib/api";
import { programs } from "@/lib/programs";
import { CohortCard } from "@/components/CohortCard";

export default function SchedulePage() {
  const [cohorts, setCohorts] = useState<Cohort[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCohorts()
      .then(setCohorts)
      .catch(() => setError("Couldn't load the schedule. Refresh to try again."));
  }, []);

  return (
    <section className="section">
      <p className="eyebrow">Schedule</p>
      <h1>Upcoming cohorts</h1>
      <p className="lede">
        Every cohort runs 8 weeks with the same instructor and the same 8 kids. Two kids per
        robot, roles swap every class, and the final session is a parent Demo Day.
      </p>

      <div className="scarcity-banner" role="note">
        <span className="scarcity-badge mono">8 seats only</span>
        <p>
          <strong>Each cohort caps at 8 children — first come, first served.</strong> We keep
          classes small so every kid gets real hands-on time. When a cohort fills, the next
          opening is the following term.
        </p>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {cohorts === null && !error && <p>Loading upcoming cohorts…</p>}
      {cohorts && cohorts.length === 0 && (
        <div className="empty-state">
          <p>New cohorts are being scheduled. Want first pick of seats?</p>
          <a className="btn btn-primary" href="mailto:support@botsbuilderkids.com?subject=Cohort%20interest">
            Email us your preferred days
          </a>
        </div>
      )}

      {cohorts &&
        programs.map((p) => {
          const list = cohorts.filter((c) => c.programId === p.id);
          if (list.length === 0) return null;
          return (
            <div key={p.id} className="schedule-group" id={p.id}>
              <h2>
                <span className="badge mono" style={{ background: p.color }}>{p.badge}</span>
                {p.name}
                <Link href={`/programs/#${p.id}`} className="schedule-more mono">
                  what&rsquo;s covered →
                </Link>
              </h2>
              <div className="cohort-list">
                {list.map((c) => <CohortCard key={c.cohortId} cohort={c} />)}
              </div>
            </div>
          );
        })}
    </section>
  );
}
