import type { Metadata } from "next";
import { programs } from "@/lib/programs";
import { EnrollButton } from "@/components/EnrollButton";

export const metadata: Metadata = { title: "Programs — Bots Builder" };

export default function ProgramsPage() {
  return (
    <section className="section">
      <p className="eyebrow">Programs</p>
      <h1>A real engineering ladder, ages 7–12</h1>
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
