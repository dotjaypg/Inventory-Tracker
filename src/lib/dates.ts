// Today's date as "YYYY-MM-DD" in the user's own time zone.
// (toISOString() uses UTC, which in the Philippines (UTC+8) gives
// yesterday's date for anything done before 8 AM.)
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
