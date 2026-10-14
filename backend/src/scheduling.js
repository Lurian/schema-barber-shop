import { GraphQLError } from 'graphql';

export const SLOT_MINUTES = 30;

export const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export function badInput(message) {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

export function notFound(kind, id) {
  return new GraphQLError(`${kind} ${id} not found`, { extensions: { code: 'NOT_FOUND' } });
}

/** `HH:MM` to minutes since midnight. */
export function parseTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw badInput(`time "${value}" must be HH:MM`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) {
    throw badInput(`time "${value}" is out of range`);
  }
  return hours * 60 + minutes;
}

export function formatTime(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const rest = String(minutes % 60).padStart(2, '0');
  return `${hours}:${rest}`;
}

/** `YYYY-MM-DD`, returned unchanged once it names a real calendar day. */
export function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw badInput(`date "${value}" must be YYYY-MM-DD`);
  }
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const roundTrips = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!roundTrips) {
    throw badInput(`date "${value}" is not a calendar day`);
  }
  return value;
}

/** `YYYY-MM-DDTHH:MM` to its date and minutes since midnight. */
function parseDateTime(value) {
  const [date, time, ...rest] = String(value).split('T');
  if (!time || rest.length > 0) {
    throw badInput(`date-time "${value}" must be YYYY-MM-DDTHH:MM`);
  }
  return { date: parseDate(date), minutes: parseTime(time) };
}

export function formatDateTime(date, minutes) {
  return `${date}T${formatTime(minutes)}`;
}

export function weekdayOf(date) {
  const [year, month, day] = date.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** Working hours must be well-formed and must not overlap on the same weekday. */
export function validateHours(hours) {
  const byWeekday = new Map();
  for (const entry of hours) {
    if (!WEEKDAYS.includes(entry.weekday)) {
      throw badInput(`unknown weekday "${entry.weekday}"`);
    }
    const start = parseTime(entry.start);
    const end = parseTime(entry.end);
    if (end <= start) {
      throw badInput(`hours on ${entry.weekday} end (${entry.end}) before they start (${entry.start})`);
    }
    const ranges = byWeekday.get(entry.weekday) ?? [];
    for (const range of ranges) {
      if (start < range.end && range.start < end) {
        throw badInput(`hours on ${entry.weekday} overlap`);
      }
    }
    ranges.push({ start, end });
    byWeekday.set(entry.weekday, ranges);
  }
  return hours.map(({ weekday, start, end }) => ({ weekday, start, end }));
}

/** Slot start times a barber offers on a date, before bookings are removed. */
export function slotStartsOn(barber, date) {
  const weekday = weekdayOf(date);
  const starts = [];
  for (const entry of barber.hours) {
    if (entry.weekday !== weekday) {
      continue;
    }
    const end = parseTime(entry.end);
    for (let start = parseTime(entry.start); start + SLOT_MINUTES <= end; start += SLOT_MINUTES) {
      starts.push(start);
    }
  }
  return starts.sort((left, right) => left - right);
}

export function availableSlots(barber, date, bookings) {
  const taken = new Set(
    bookings.filter((booking) => booking.barberId === barber.id).map((booking) => booking.startsAt),
  );
  return slotStartsOn(barber, date)
    .map((start) => formatDateTime(date, start))
    .filter((slot) => !taken.has(slot));
}

/** Returns the normalized `{ startsAt, endsAt }` for a slot, or throws. */
export function reserveSlot(barber, startsAt, bookings) {
  const { date, minutes } = parseDateTime(startsAt);
  const normalized = formatDateTime(date, minutes);

  if (!slotStartsOn(barber, date).includes(minutes)) {
    throw badInput(`${barber.name} does not work at ${normalized}`);
  }
  if (bookings.some((booking) => booking.barberId === barber.id && booking.startsAt === normalized)) {
    throw badInput(`${barber.name} is already booked at ${normalized}`);
  }

  return { startsAt: normalized, endsAt: formatDateTime(date, minutes + SLOT_MINUTES) };
}
