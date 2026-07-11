"use client";

import { useState } from "react";
import { sendContact } from "@/lib/api";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot: stays empty for humans
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    try {
      setBusy(true);
      setDone(await sendContact(name, email, message, website));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send. Email us directly instead.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <section className="section section-narrow">
        <h1>Message sent</h1>
        <p className="notice" role="status">{done}</p>
      </section>
    );
  }

  return (
    <section className="section section-narrow">
      <p className="eyebrow">Contact</p>
      <h1>Talk to a human (who is also an engineer)</h1>
      <p className="lede">
        Cohort questions, private groups, birthday workshops, school partnerships — send it over.
        Or email <a href="mailto:support@botsbuilderkids.com">support@botsbuilderkids.com</a> directly.
      </p>
      <p className="mono">
        Classes are held at the Frisco Public Library · 8000 Dallas Pkwy, Frisco, TX 75034
      </p>
      <div className="admin-form contact-form">
        <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></label>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} /></label>
        <label>Message
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={2000} />
        </label>
        <input
          className="hp-field"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          aria-hidden="true"
        />
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? "Sending…" : "Send message"}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
