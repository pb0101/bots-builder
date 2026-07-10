import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms & Policies — Bots Builder" };

export default function TermsPage() {
  return (
    <section className="section section-narrow legal">
      <p className="eyebrow">Policies</p>
      <h1>Terms, participation &amp; photo policy</h1>
      <p className="mono">Effective July 2026 · Bots Builder LLC, Frisco, Texas</p>

      <h2>Enrollment</h2>
      <p>
        A seat is reserved when payment completes. Enrollment covers the listed cohort dates for
        one named student. Seats are transferable to a sibling with an email to us before the
        cohort starts.
      </p>

      <h2>Participation &amp; safety</h2>
      <p>
        Robotics involves small parts, moving mechanisms, and supervised use of simple tools.
        Instructors are background-checked and follow a written supervision policy. Parents agree
        to disclose allergies or medical needs before the first session and to complete our
        liability waiver at or before the first class. Drop-off and pickup are by a listed adult.
      </p>

      <h2>Photos</h2>
      <p>
        We photograph class moments for progress emails and, with consent, for our website and
        social channels. The enrollment checkbox covers progress emails to you; public use of any
        photo featuring your child requires the separate photo-release form, which you may
        decline without affecting participation.
      </p>

      <h2>Conduct</h2>
      <p>
        Kids follow the Engineer&rsquo;s Code: we test, we don&rsquo;t blame; hands on our own
        team&rsquo;s robot; safety always. Repeated unsafe behavior leads to a parent conversation
        and, if unresolved, withdrawal with a prorated refund.
      </p>

      <h2>Payments</h2>
      <p>
        Payments are processed by Stripe. We never see or store card numbers. See the
        {" "}<a href="/refunds/">refund policy</a> for cancellation terms.
      </p>
    </section>
  );
}
