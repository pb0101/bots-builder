import type { Metadata } from "next";
import { programs } from "@/lib/programs";
import { EnrollButton } from "@/components/EnrollButton";

export const metadata: Metadata = { title: "Pricing — Bots Builder" };

export default function PricingPage() {
  return (
    <section className="section">
      <p className="eyebrow">Pricing &amp; enrollment</p>
      <h1>One price per course. Robots, materials, and Demo Day included.</h1>
      <p className="lede">
        Pay once per 8-week course through secure checkout. Sibling discount and founding-family
        codes apply at checkout. If the first class isn&rsquo;t a fit, tell us and we refund it —
        no forms, no friction.
      </p>
      <div className="price-grid">
        {programs.map((p) => (
          <div className="price-card" key={p.id} style={{ borderTopColor: p.color }}>
            <p className="mono price-badge">{p.badge}</p>
            <h2>{p.name}</h2>
            <p className="mono price-meta">{p.ages} · {p.weeks}</p>
            <p className="price-amount">
              ${p.price}<span> / course</span>
            </p>
            <p className="price-tagline">{p.tagline}</p>
            <EnrollButton programId={p.id} />
          </div>
        ))}
      </div>
      <div className="fine-print">
        <h3>Good to know</h3>
        <ul>
          <li>Class size caps at 8 kids — two per robot, roles swap every class.</li>
          <li>Enrolling siblings? Use code <strong>SIBLING10</strong> at checkout for 10% off each additional child.</li>
          <li>Missed a week? Free catch-up corner at the start of the next session.</li>
          <li>All equipment stays with us. Nothing to buy, charge, or lose at home.</li>
          <li>Payments are processed by Stripe. We never see or store card numbers.</li>
        </ul>
      </div>
    </section>
  );
}
