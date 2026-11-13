/**
 * Parse a date string in YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, or MM-DD format.
 * Returns { year: number | null, month: number, day: number } or null if invalid.
 */
export function parseMilestoneDate(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;

  let year = null;
  let month = null;
  let day = null;

  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else if ((match = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/))) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else if ((match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
  } else if ((match = s.match(/^(?:--)?(\d{1,2})-(\d{1,2})$/))) {
    month = Number(match[1]);
    day = Number(match[2]);
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const checkYear = year !== null ? year : 2000;
  const probe = new Date(checkYear, month - 1, day);
  if (
    probe.getFullYear() !== checkYear ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function makeOccurrenceDate(year, month, day) {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return new Date(year, 1, 28);
  }
  return new Date(year, month - 1, day);
}

/**
 * Compute upcoming birthdays and anniversaries sorted by daysUntil ascending, then name.
 */
export function computeUpcomingMilestones(people, { today = new Date(), limit = 25 } = {}) {
  const list = Array.isArray(people) ? people : Object.values(people || {});
  const baseDate = today instanceof Date && !Number.isNaN(today.getTime()) ? today : new Date();
  const todayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const currentYear = todayStart.getFullYear();

  const milestones = [];

  const pushMilestone = (person, rawDate, type) => {
    const parsed = parseMilestoneDate(rawDate);
    if (!parsed) return;

    let nextDate = makeOccurrenceDate(currentYear, parsed.month, parsed.day);
    if (nextDate < todayStart) {
      nextDate = makeOccurrenceDate(currentYear + 1, parsed.month, parsed.day);
    }

    const daysUntil = Math.round((nextDate.getTime() - todayStart.getTime()) / 86400000);
    const years =
      parsed.year !== null && nextDate.getFullYear() >= parsed.year
        ? nextDate.getFullYear() - parsed.year
        : null;

    milestones.push({
      type,
      daysUntil,
      nextDate,
      years,
      person
    });
  };

  for (const person of list) {
    if (!person || person.late) continue;
    if (person.dob) pushMilestone(person, person.dob, "birthday");
    if (person.anniversary) pushMilestone(person, person.anniversary, "anniversary");
  }

  milestones.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    const nameA = a.person?.name || a.person?.n || "";
    const nameB = b.person?.name || b.person?.n || "";
    return nameA.localeCompare(nameB);
  });

  if (typeof limit === "number" && limit > 0) {
    return milestones.slice(0, limit);
  }
  return milestones;
}
