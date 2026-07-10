import Link from "next/link";

/** Program/pricing pages route to the schedule, where cohorts have dates and seats. */
export function EnrollButton({ programId, label }: { programId: string; label?: string }) {
  return (
    <Link href={`/schedule/#${programId}`} className="btn btn-primary">
      {label ?? "See dates & enroll"}
    </Link>
  );
}
