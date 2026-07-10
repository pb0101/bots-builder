import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section section-narrow">
      <p className="eyebrow mono">wait until ⟨page found?⟩ … timed out</p>
      <h1>This page drove off the mat.</h1>
      <p>The link may be old, or the address has a typo.</p>
      <Link href="/" className="btn btn-primary">Back to the start box</Link>
    </section>
  );
}
