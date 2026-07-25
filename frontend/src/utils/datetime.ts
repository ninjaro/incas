export const ADMIN_TIME_ZONE = "Europe/Berlin";

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partsInTimeZone(date: Date, timeZone: string): DateTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function partsAsUtc(parts: DateTimeParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

export function toDateTimeLocal(
  value: string | Date | null | undefined,
  timeZone = ADMIN_TIME_ZONE,
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const parts = partsInTimeZone(date, timeZone);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function fromDateTimeLocal(value: string, timeZone = ADMIN_TIME_ZONE): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return value;
  const requested: DateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  };
  const target = partsAsUtc(requested);
  let candidate = target;
  const visited = new Set<number>();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const rendered = partsAsUtc(partsInTimeZone(new Date(candidate), timeZone));
    if (rendered === target) return new Date(candidate).toISOString();
    if (visited.has(candidate)) break;
    visited.add(candidate);
    candidate += target - rendered;
  }

  // During a DST spring-forward gap, choose the first representable instant
  // after the requested wall time, matching native datetime-local behavior.
  const fallback = [...visited]
    .filter((instant) => partsAsUtc(partsInTimeZone(new Date(instant), timeZone)) >= target)
    .sort((left, right) => left - right)[0];
  return new Date(fallback ?? candidate).toISOString();
}

export function dateTimeLocalTomorrow(now = new Date(), timeZone = ADMIN_TIME_ZONE): string {
  const current = toDateTimeLocal(now, timeZone);
  const [datePart, timePart] = current.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${tomorrow.getUTCFullYear()}-${pad(tomorrow.getUTCMonth() + 1)}-${pad(tomorrow.getUTCDate())}T${timePart}`;
}
