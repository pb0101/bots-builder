import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About — Bots Builder" };

export default function AboutPage() {
  return (
    <section className="section section-narrow">
      <p className="eyebrow">About</p>
      <h1>Built by an engineer who wanted more for Frisco kids than joystick time</h1>
      <p>
        Bots Builder was founded by a software engineering leader who builds cloud
        identity systems used by millions of people — and who kept noticing the same thing at
        local robotics programs: kids driving robots with remote controls and calling it coding.
      </p>
      <p>
        Real robotics is different. It&rsquo;s writing a program, watching it fail, measuring the
        miss, and fixing it — the loop every professional engineer runs daily. Our curriculum is
        built around that loop. Kids keep engineering logbooks from week one, earn badges only
        when a skill is demonstrated, and finish every course by running an autonomous mission in
        front of their families.
      </p>
      <p>
        Classes are small on purpose: eight kids, four robots, one instructor with a scripted,
        field-tested lesson plan. The ladder runs from story-driven builds at age 7 to a
        registered competition team whose championship — the VEX World Championship — takes place
        in Dallas, thirty minutes from our classroom.
      </p>
      <p>
        Questions? Email <a href="mailto:hello@botsbuilder.com">hello@botsbuilder.com</a> or grab
        a seat in a <Link href="/pricing/">trial workshop</Link>.
      </p>
    </section>
  );
}
