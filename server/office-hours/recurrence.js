/**
 * Recurring office hours expansion.
 *
 * Rules live in `office_hours_recurring` as a wall-clock time plus an IANA zone
 * ("Thursdays, 17:00-18:00, Europe/London"). We expand them into concrete UTC
 * instants at read time so a rule change is instantly reflected everywhere and
 * there are no materialised rows to keep in sync.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Offset (ms) between the given instant and how `timeZone` renders it. */
const zoneOffsetMs = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = Number(p.value);
    return acc;
  }, {});

  const asUtc = Date.UTC(
    parts.year, parts.month - 1, parts.day,
    parts.hour % 24, parts.minute, parts.second,
  );
  return asUtc - date.getTime();
};

/**
 * Wall-clock `YYYY-MM-DD` + `HH:MM[:SS]` in `timeZone` -> UTC Date.
 * Applied twice so occurrences that straddle a DST change land on the right instant.
 */
export const zonedWallClockToUtc = (dateStr, timeStr, timeZone) => {
  const [h = 0, m = 0, s = 0] = String(timeStr).split(':').map(Number);
  const [y, mo, d] = dateStr.split('-').map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, m, s);

  let utc = naive - zoneOffsetMs(new Date(naive), timeZone);
  const settled = naive - zoneOffsetMs(new Date(utc), timeZone);
  if (settled !== utc) utc = settled;

  return new Date(utc);
};

/** Today's calendar date in `timeZone`, as `YYYY-MM-DD`. */
export const todayInZone = (timeZone, now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);

const toDateStr = (ms) => new Date(ms).toISOString().slice(0, 10);
const fromDateStr = (str) => Date.parse(`${str}T00:00:00Z`);

/**
 * Expand one rule into occurrences overlapping [from, to].
 * Returns slot-shaped objects so callers can merge them with `office_hours_schedule`
 * rows without special-casing.
 */
export const expandRule = (rule, { from, to, exceptions = new Set() }) => {
  const zone = rule.timezone || 'Europe/London';
  const weekdays = (rule.weekdays || []).map(Number).filter(d => d >= 0 && d <= 6);
  if (weekdays.length === 0) return [];

  const interval = Math.max(1, Number(rule.interval_weeks) || 1);
  const anchor = fromDateStr(rule.starts_on);

  // Walk whole weeks from the rule's first week so `interval_weeks` phase is stable.
  const anchorWeekStart = anchor - new Date(anchor).getUTCDay() * DAY_MS;
  const windowStart = Math.max(anchorWeekStart, from.getTime() - 7 * DAY_MS);
  const firstWeek = anchorWeekStart + Math.ceil(
    Math.max(0, windowStart - anchorWeekStart) / (7 * DAY_MS * interval),
  ) * 7 * DAY_MS * interval;

  const lastDay = rule.ends_on ? Math.min(to.getTime(), fromDateStr(rule.ends_on) + DAY_MS) : to.getTime();
  const occurrences = [];

  for (let week = firstWeek; week <= lastDay; week += 7 * DAY_MS * interval) {
    for (const weekday of weekdays) {
      const dayMs = week + weekday * DAY_MS;
      if (dayMs < anchor) continue;
      if (rule.ends_on && dayMs > fromDateStr(rule.ends_on)) continue;

      const date = toDateStr(dayMs);
      if (exceptions.has(date)) continue;

      const startsAt = zonedWallClockToUtc(date, rule.start_time, zone);
      const endsAt = zonedWallClockToUtc(date, rule.end_time, zone);
      if (endsAt < from || startsAt > to) continue;

      occurrences.push({
        id: `${rule.id}:${date}`,
        recurrence_id: rule.id,
        occurrence_date: date,
        recurring: true,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      });
    }
  }

  return occurrences;
};

/**
 * Expand every rule and merge with one-off slots, sorted by start time.
 * `exceptionRows` are `{ recurrence_id, occurrence_date }` from
 * `office_hours_recurring_exceptions`.
 */
export const buildSchedule = ({ rules = [], slots = [], exceptions = [], from = new Date(), to, horizonWeeks = 8 }) => {
  const until = to || new Date(from.getTime() + horizonWeeks * 7 * DAY_MS);

  const byRule = exceptions.reduce((acc, ex) => {
    const key = ex.recurrence_id;
    if (!acc.has(key)) acc.set(key, new Set());
    // Postgres `date` comes back as `YYYY-MM-DD`, but tolerate a full timestamp.
    acc.get(key).add(String(ex.occurrence_date).slice(0, 10));
    return acc;
  }, new Map());

  const expanded = rules.flatMap(rule =>
    expandRule(rule, { from, to: until, exceptions: byRule.get(rule.id) || new Set() }),
  );

  const oneOffs = slots.map(slot => ({ ...slot, recurring: false }));

  return [...oneOffs, ...expanded]
    .filter(s => new Date(s.ends_at) >= from)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Every Thursday, 17:00 - 18:00" — used in admin lists and coach-facing copy. */
export const describeRule = (rule) => {
  const days = (rule.weekdays || []).map(Number).sort((a, b) => a - b).map(d => WEEKDAY_NAMES[d]);
  const cadence = Number(rule.interval_weeks) === 1
    ? 'Every'
    : `Every ${rule.interval_weeks === 2 ? 'other' : `${rule.interval_weeks}th`}`;
  const list = days.length > 1
    ? `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}`
    : days[0];
  return `${cadence} ${list}, ${String(rule.start_time).slice(0, 5)} - ${String(rule.end_time).slice(0, 5)}`;
};
