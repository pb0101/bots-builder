import Link from "next/link";
import { RobotHero } from "@/components/RobotHero";
import { programs } from "@/lib/programs";

const ladder = programs.filter((p) => p.id !== "junior");

export default function Home() {
  return (
    <>
      <section className="hero grid-paper">
        <div className="hero-copy">
          <p className="eyebrow">Frisco, TX · Ages 7–12 · Small classes, 2 kids per robot</p>
          <h1>
            Your kid builds the robot.
            <br />
            <span className="accent">The robot does the rest.</span>
          </h1>
          <p className="lede">
            No remote controls, no watching videos. Kids design, build, and program autonomous
            robots — then prove them on a scored mission mat, taught by a professional software
            engineer. The ladder ends at a real competition whose World Championship is held
            30&nbsp;minutes away in Dallas.
          </p>
          <div className="hero-actions">
            <Link href="/schedule/" className="btn btn-primary">See dates &amp; enroll</Link>
            <Link href="/programs/" className="btn btn-ghost">How the ladder works</Link>
          </div>
          <p className="hero-proof mono">
            75-min sessions · skill badges, not participation trophies · parents watch Demo Day
          </p>
        </div>
        <RobotHero />
      </section>

      <section className="section">
        <p className="eyebrow">The progression ladder</p>
        <h2>Four levels. Each one ends with a mission your kid runs in front of you.</h2>
        <div className="rail">
          {ladder.map((p, i) => (
            <article className="rail-card" key={p.id} style={{ borderTopColor: p.color }}>
              <p className="mono rail-step">{p.badge}</p>
              <h3>{p.name.replace(/^Level \d · /, "")}</h3>
              <p className="rail-ages mono">{p.ages} · {p.weeks}</p>
              <p>{p.tagline}</p>
              {i < ladder.length - 1 && <span className="rail-arrow" aria-hidden="true">→</span>}
            </article>
          ))}
        </div>
        <p className="section-note">
          Ages 7–8 start in <Link href="/programs/">Junior Builders</Link>, then join Level 1 at 9.
        </p>
      </section>

      <section className="section section-alt">
        <p className="eyebrow">Why parents pick us</p>
        <div className="why-grid">
          <div className="why-card">
            <h3>Taught by a working engineer</h3>
            <p>
              Founded and taught by a professional software engineering leader who builds
              large-scale cloud systems for a living — not a franchise script reader. Kids hear
              how the loop they just wrote runs the real world.
            </p>
          </div>
          <div className="why-card">
            <h3>Autonomy over joysticks</h3>
            <p>
              Most programs let kids drive robots. Ours make robots drive themselves. Every level
              ends in a scored autonomous mission — the same discipline real robotics demands.
            </p>
          </div>
          <div className="why-card">
            <h3>Worlds is in Dallas</h3>
            <p>
              Our competition track feeds the VEX IQ Competition — the world&rsquo;s largest
              robotics competition, whose World Championship is held in Dallas. The top of this
              ladder is a 30-minute drive from Frisco.
            </p>
          </div>
          <div className="why-card">
            <h3>Progress you can see weekly</h3>
            <p>
              Skill badges are punched only when a skill is demonstrated. Kids keep engineering
              Mission Logs from week one, and every 8-week course ends with a parent Demo Day.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <p className="eyebrow">Inside a session</p>
        <h2>One class, minute by minute</h2>
        <div className="timeline">
          <div className="timeline-item">
            <p className="mono timeline-min">10 min</p>
            <h3>Spark</h3>
            <p>A real-world hook — Mars rovers, warehouse robots — tied to today&rsquo;s concept.</p>
          </div>
          <div className="timeline-item">
            <p className="mono timeline-min">5 min</p>
            <h3>Mission briefing</h3>
            <p>Today&rsquo;s challenge as a mission card with scored success criteria.</p>
          </div>
          <div className="timeline-item timeline-big">
            <p className="mono timeline-min">40 min</p>
            <h3>Build &amp; code</h3>
            <p>Pairs work hands-on; Builder and Programmer roles swap on a timer.</p>
          </div>
          <div className="timeline-item">
            <p className="mono timeline-min">10 min</p>
            <h3>Test arena</h3>
            <p>Scored attempts on the mission mat, logged in engineering notebooks.</p>
          </div>
          <div className="timeline-item">
            <p className="mono timeline-min">10 min</p>
            <h3>Showcase</h3>
            <p>Every pair demos and answers: what was your hardest bug, and how did you fix it?</p>
          </div>
        </div>
      </section>

      <section className="section cta-band grid-paper">
        <h2>Fall cohorts are forming now.</h2>
        <p>Eight kids per class. Two kids per robot. When it&rsquo;s full, it&rsquo;s full.</p>
        <Link href="/schedule/" className="btn btn-primary btn-lg">Reserve a seat</Link>
      </section>
    </>
  );
}
