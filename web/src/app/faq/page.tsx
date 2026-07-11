import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "FAQ — Bots Builder" };

const faqs: [string, string][] = [
  [
    "Where are classes held?",
    "At the Frisco Public Library, 8000 Dallas Pkwy, Frisco, TX 75034. Free parking, and the children's wing is steps away for siblings tagging along at pickup.",
  ],
  [
    "My kid has never coded. Is Level 1 too hard?",
    "Level 1 assumes zero experience. Week 1 starts with connecting a motor. By Week 8 the same kid runs an autonomous rescue mission — the ladder does the work.",
  ],
  [
    "What if my child misses a week?",
    "Every session starts with a 10-minute catch-up corner, and each missed concept has a short recap video. Nobody falls behind quietly.",
  ],
  [
    "Do we need to buy a robot or bring anything?",
    "No. Robots, tablets, mats, and materials stay with us. Kids bring curiosity and, ideally, a water bottle.",
  ],
  [
    "Two kids per robot — will mine actually get hands-on time?",
    "Yes, by design. Pairs swap Builder and Programmer roles on a timer every class. Pair engineering is how real teams work, and it doubles what each kid learns.",
  ],
  [
    "How do you handle safety and supervision?",
    "Instructors are background-checked, we follow a written two-adult/visibility policy, and every family signs a standard waiver and photo-consent form before the first class.",
  ],
  [
    "What's your refund policy?",
    "If the first class isn't a fit, tell us within 48 hours and we refund the course in full. After that, we prorate for medical or moving situations — just email us.",
  ],
  [
    "What comes after Level 4?",
    "The competition team competes in the VEX IQ Competition, whose World Championship is held in Dallas. Teens who outgrow it graduate to metal-and-C++ platforms — we'll point the way.",
  ],
  [
    "Can I watch a class?",
    "The last 10 minutes of every session is a showcase — parents are welcome at pickup. And the final week of every course is a full Demo Day built for families.",
  ],
];

export default function FaqPage() {
  return (
    <section className="section section-narrow">
      <p className="eyebrow">FAQ</p>
      <h1>Questions parents actually ask</h1>
      <div className="faq-list">
        {faqs.map(([q, a]) => (
          <details key={q} className="faq-item">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <p className="section-note">
        Something else? <a href="mailto:support@botsbuilderkids.com">support@botsbuilderkids.com</a> — or see
        the <Link href="/schedule/">current schedule</Link>.
      </p>
    </section>
  );
}
