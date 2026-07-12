"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSafeAuth } from "@/lib/useSafeAuth";
import { createCheckout, joinWaitlist, type Cohort } from "@/lib/api";
import { programs } from "@/lib/programs";
import { formatDateRange, seatsLabel } from "@/lib/format";

type Mode = "idle" | "form" | "busy" | "waitlisted";

export function CohortCard({ cohort }: { cohort: Cohort }) {
  const router = useRouter();
  const auth = useSafeAuth();
  const program = programs.find((p) => p.id === cohort.programId);
  const isOpen = cohort.status === "open" && cohort.seatsLeft > 0;
  const perClass = program && program.sessions > 1 ? Math.round(program.price / program.sessions) : null;

  const [mode, setMode] = useState<Mode>("idle");
  const [studentName, setStudentName] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [waiver, setWaiver] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requireAuthThen = async (intent: object) => {
    if (!auth.isAuthenticated || !auth.user?.id_token) {
      sessionStorage.setItem("pendingCheckout", JSON.stringify(intent));
      router.push("/signin/");
      return null;
    }
    return auth.user.id_token;
  };

  const submitEnroll = async () => {
    setError("");
    if (!studentName.trim() || !studentAge.trim()) {
      setError("Add your child's first name and age so we can set up their badge card.");
      return;
    }
    if (!waiver) {
      setError("Please accept the participation and photo policy to continue.");
      return;
    }
    const intent = { cohortId: cohort.cohortId, studentName, studentAge, waiverAccepted: true };
    const token = await requireAuthThen(intent);
    if (!token) return;
    try {
      setMode("busy");
      const url = await createCheckout(token, intent);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout didn't start. Try again.");
      setMode("form");
    }
  };

  const submitWaitlist = async () => {
    setError("");
    const token = await requireAuthThen({ waitlist: true, cohortId: cohort.cohortId, studentName });
    if (!token) return;
    try {
      setMode("busy");
      setMessage(await joinWaitlist(token, cohort.cohortId, studentName));
      setMode("waitlisted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the waitlist. Try again.");
      setMode("idle");
    }
  };

  return (
    <div className="cohort-card" style={{ borderLeftColor: program?.color ?? "var(--cobalt)" }}>
      <div className="cohort-main">
        <p className="mono cohort-dates">
          {formatDateRange(cohort.startDate, cohort.endDate)} · {cohort.dayOfWeek}s · {cohort.time}
        </p>
        <h3>{program?.name ?? cohort.programId}</h3>
        <p className="cohort-loc">{cohort.location}</p>
        {program && (
          <p className="mono cohort-price">
            {perClass
              ? <>${perClass}/class · <span>${program.price} for {program.sessions} classes</span></>
              : <>${program.price}{program.id === "competitor" ? " / season" : " / workshop"}</>}
          </p>
        )}
        <p className={`mono seats ${isOpen ? (cohort.seatsLeft <= 3 ? "seats-low" : "") : "seats-full"}`}>
          {seatsLabel(cohort.seatsLeft, cohort.status)}
        </p>
      </div>

      <div className="cohort-action">
        {mode === "idle" && isOpen && (
          <button className="btn btn-primary" onClick={() => setMode("form")}>
            Enroll · {perClass ? `$${perClass}/class` : `$${program?.price ?? ""}`}
          </button>
        )}
        {mode === "idle" && !isOpen && (
          <button className="btn btn-ghost" onClick={submitWaitlist}>Join waitlist</button>
        )}
        {mode === "waitlisted" && <p className="cohort-msg">{message}</p>}
        {(mode === "form" || mode === "busy") && (
          <div className="student-form">
            <label>
              Child&rsquo;s first name
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g., Maya"
                maxLength={80}
              />
            </label>
            <label>
              Age
              <input
                value={studentAge}
                onChange={(e) => setStudentAge(e.target.value.replace(/\D/g, ""))}
                placeholder="10"
                inputMode="numeric"
                maxLength={2}
              />
            </label>
            <label className="waiver-check">
              <input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)} />
              <span>
                I agree to the <a href="/terms/" target="_blank">participation &amp; photo policy</a>.
              </span>
            </label>
            <div className="student-form-actions">
              <button className="btn btn-primary" onClick={submitEnroll} disabled={mode === "busy"}>
                {mode === "busy" ? "Opening checkout…" : "Continue to payment"}
              </button>
              <button className="nav-link-btn" onClick={() => setMode("idle")} disabled={mode === "busy"}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
