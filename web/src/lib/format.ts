export function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export function seatsLabel(seatsLeft: number, status: string): string {
  if (status !== "open" || seatsLeft <= 0) return "Full — waitlist open";
  if (seatsLeft === 1) return "1 seat left";
  if (seatsLeft <= 3) return `${seatsLeft} seats left`;
  return "Seats available";
}
