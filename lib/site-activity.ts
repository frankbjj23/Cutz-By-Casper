export const ACTIVITY_PATHS = ["/", "/book", "/styles", "/reviews", "/privacy"] as const;
export const ACTIVITY_SESSION_KEY = "redeemed-activity-v1";
export const ACTIVITY_SESSION_MS = 30 * 60 * 1000;
export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function easternDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isActivityPath(path: unknown): path is string {
  return typeof path === "string" && (ACTIVITY_PATHS as readonly string[]).includes(path);
}

export function activityRange(value?: string) {
  return value === "7" ? 7 : value === "90" ? 90 : 30;
}

export type ActivitySession = { id: string; day: string; lastActive: number; paths: string[] };

export function activitySession(raw: string | null, now: number, newId: () => string): ActivitySession {
  const day = easternDay(new Date(now));
  try {
    const old = JSON.parse(raw ?? "null") as ActivitySession | null;
    if (old && UUID_V4.test(old.id) && old.day === day &&
      Number.isFinite(old.lastActive) && now >= old.lastActive && now - old.lastActive < ACTIVITY_SESSION_MS &&
      Array.isArray(old.paths) && old.paths.length <= ACTIVITY_PATHS.length && old.paths.every(isActivityPath)) {
      return { ...old, lastActive: now };
    }
  } catch { /* Invalid or old storage starts a new anonymous visit. */ }
  return { id: newId(), day, lastActive: now, paths: [] };
}

export type ActivityDay = {
  day: string;
  visits: number | null;
  page_visits: number | null;
  booking_visits: number | null;
  new_contacts: number;
};

export type SiteActivity = {
  days: ActivityDay[];
  tracking_started_at: string;
  total_contacts: number;
  imported_contacts: number;
  website_contacts: number;
};
