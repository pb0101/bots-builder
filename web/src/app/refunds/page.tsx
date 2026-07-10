import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refund Policy — Bots Builder" };

export default function RefundsPage() {
  return (
    <section className="section section-narrow legal">
      <p className="eyebrow">Policies</p>
      <h1>Refund policy</h1>
      <p className="mono">Effective July 2026 · Bots Builder LLC</p>
      <p>
        <strong>First-class guarantee:</strong> if the first session isn&rsquo;t a fit, email us
        within 48 hours of that class and we refund the full course price. No forms, no questions.
      </p>
      <p>
        <strong>Before the cohort starts:</strong> cancel up to 7 days before the first session
        for a full refund; within 7 days, we refund in full if we can fill the seat (waitlists
        usually make this quick), otherwise 80%.
      </p>
      <p>
        <strong>Mid-course:</strong> for medical reasons or a move, we prorate the remaining
        weeks. For other situations, we&rsquo;ll offer a credit toward a future cohort first.
      </p>
      <p>
        <strong>If we cancel</strong> a session (weather, illness), it&rsquo;s rescheduled; if we
        cancel a cohort, you receive a full refund. Refunds return to the original payment method
        via Stripe within 5–10 business days.
      </p>
      <p>Requests: <a href="mailto:hello@botsbuilder.com">hello@botsbuilder.com</a></p>
    </section>
  );
}
