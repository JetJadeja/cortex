/**
 * Returns midnight today in the given IANA timezone (e.g. "America/New_York").
 * Falls back to UTC if the timezone is missing or invalid.
 */
export function midnightToday(timezone: string | undefined): Date {
  const tz = isValidTimezone(timezone) ? timezone : "UTC";
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  // Build an ISO string for midnight in that timezone, then convert to UTC
  const midnightLocal = new Date(`${year}-${month}-${day}T00:00:00`);
  const offsetMs = getTimezoneOffsetMs(tz, midnightLocal);

  return new Date(midnightLocal.getTime() - offsetMs);
}

function getTimezoneOffsetMs(tz: string, date: Date): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: tz });
  return new Date(tzStr).getTime() - new Date(utcStr).getTime();
}

function isValidTimezone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
