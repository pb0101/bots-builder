import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy — Bots Builder" };

export default function PrivacyPage() {
  return (
    <section className="section section-narrow legal">
      <p className="eyebrow">Policies</p>
      <h1>Privacy policy</h1>
      <p className="mono">Effective July 2026 · Bots Builder LLC, Frisco, Texas</p>

      <h2>What we collect</h2>
      <p>
        Parent account details (name, email) via Amazon Cognito; your child&rsquo;s first name and
        age for class rosters and badge cards; enrollment and payment records (payments are
        processed by Stripe — card numbers never touch our systems); and messages you send us.
      </p>

      <h2>How we use it</h2>
      <p>
        To run classes: rosters, schedules, progress emails, Demo Day invites, waitlist and
        enrollment notices. We don&rsquo;t sell data, run ads, or share information beyond the
        processors that operate the service (AWS, Stripe).
      </p>

      <h2>Children</h2>
      <p>
        Accounts belong to parents. We collect the minimum about students — first name and age —
        provided by the parent. Photo use is governed by the photo policy in our
        {" "}<a href="/terms/">terms</a>.
      </p>

      <h2>Your choices</h2>
      <p>
        Email <a href="mailto:support@botsbuilderkids.com">support@botsbuilderkids.com</a> to access, correct,
        or delete your data. Deleting your account removes personal data from our systems within
        30 days, except records we must keep for tax and payment compliance.
      </p>
    </section>
  );
}
