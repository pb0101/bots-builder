export function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export function seatsLabel(seatsLeft: number, status: string): string {
  if (status !== "open" || seatsLeft <= 0) return "Full — waitlist open";
  if (seatsLeft <= 3) return "Only a few seats left";
  return "Limited seats remaining";
}
