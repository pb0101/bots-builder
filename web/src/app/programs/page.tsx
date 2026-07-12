import type { Metadata } from "next";
import { programs } from "@/lib/programs";
import { EnrollButton } from "@/components/EnrollButton";

export const metadata: Metadata = {
  title: "Programs — Kids Robotics Classes Ages 7–14",
  description:
    "A four-level robotics engineering ladder for kids in Frisco, TX: from story-driven first robots to autonomous missions, mechanisms, Python coding, and a VEX competition team.",
  alternates: { canonical: "/programs/" },
};

// Course structured data helps these programs surface in Google course listings.
const courseLd = {
  "@context": "https://schema.org",
  "@graph": programs.map((p) => ({
    "@type": "Course",
    name: `${p.name} — Bots Builder`,
    description: p.tagline,
    provider: {
      "@type": "Organization",
      name: "Bots Builder",
      sameAs: "https://botsbuilderkids.com",
    },
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "USD",
      category: "Paid",
      availability: "https://schema.org/InStock",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Onsite",
      location: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "Frisco", addressRegion: "TX", addressCountry: "US" } },
    },
  })),
};

export default function ProgramsPage() {
  return (
    <section className="section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }}
      />
      <p className="eyebrow">Programs</p>
      <h1>A real engineering ladder, ages 7–14</h1>
      <p className="lede">
        Every course runs 8 weeks. Every session follows the same rhythm: a real-world hook, a
        mission briefing, 40 minutes of building and coding in pairs, scored test runs, and a
        showcase where every kid demos and explains their hardest bug.
      </p>
      <div className="program-list">
        {programs.map((p) => (
          <article className="program-card" key={p.id} id={p.id} style={{ borderLeftColor: p.color }}>
            <div className="program-head">
              <span className="badge mono" style={{ background: p.color }}>{p.badge}</span>
              <div>
                <h2>{p.name}</h2>
                <p className="mono program-meta">{p.ages} · {p.weeks} · ${p.price}</p>
              </div>
            </div>
            <p className="program-tagline">{p.tagline}</p>
            <ul>
              {p.outcomes.map((o) => <li key={o}>{o}</li>)}
            </ul>
            <EnrollButton programId={p.id} label={`See dates · $${p.price}`} />
          </article>
        ))}
      </div>
    </section>
  );
}
