export const SLOT_MINUTES = 30;

export const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type WorkingHours = { weekday: Weekday; start: string; end: string };

export type Barber = { id: string; name: string; hours: WorkingHours[] };

export type Client = { id: string; name: string; email: string };

export type Booking = { id: string; barberId: string; clientId: string; startsAt: string; endsAt: string };

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  SUNDAY: 'Sun',
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
};

/** `HH:MM` to minutes since midnight, or `null` when malformed. */
export function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) {
    return null;
  }
  return hours * 60 + minutes;
}

export function formatTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const rest = String(minutes % 60).padStart(2, '0');
  return `${hours}:${rest}`;
}

export function formatDateTime(date: string, minutes: number): string {
  return `${date}T${formatTime(minutes)}`;
}

export function splitDateTime(value: string): { date: string; time: string } {
  const [date, time] = value.split('T');
  return { date, time };
}

export function addMinutes(dateTime: string, amount: number): string {
  const { date, time } = splitDateTime(dateTime);
  return formatDateTime(date, (parseTime(time) ?? 0) + amount);
}

/** The local calendar date as `YYYY-MM-DD`. */
export function todayDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function weekdayOf(date: string): Weekday {
  const [year, month, day] = date.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Slot start times a barber offers on a date, in minutes since midnight. */
export function slotStartsOn(barber: Barber, date: string): number[] {
  const weekday = weekdayOf(date);
  const starts: number[] = [];
  for (const entry of barber.hours) {
    if (entry.weekday !== weekday) {
      continue;
    }
    const start = parseTime(entry.start);
    const end = parseTime(entry.end);
    if (start === null || end === null) {
      continue;
    }
    for (let slot = start; slot + SLOT_MINUTES <= end; slot += SLOT_MINUTES) {
      starts.push(slot);
    }
  }
  return starts.sort((left, right) => left - right);
}

export function takenSlots(barber: Barber, bookings: Booking[]): Set<string> {
  return new Set(bookings.filter((booking) => booking.barberId === barber.id).map((booking) => booking.startsAt));
}

export function availableSlots(barber: Barber, date: string, bookings: Booking[]): string[] {
  const taken = takenSlots(barber, bookings);
  return slotStartsOn(barber, date)
    .map((start) => formatDateTime(date, start))
    .filter((slot) => !taken.has(slot));
}

/** Mirrors the backend's `validateHours`: a message when the hours are invalid, otherwise `null`. */
export function hoursProblem(hours: WorkingHours[]): string | null {
  const byWeekday = new Map<Weekday, Array<{ start: number; end: number }>>();
  for (const entry of hours) {
    const start = parseTime(entry.start);
    const end = parseTime(entry.end);
    if (start === null || end === null) {
      return 'times must be HH:MM';
    }
    if (end <= start) {
      return `hours on ${WEEKDAY_LABELS[entry.weekday]} end before they start`;
    }
    const ranges = byWeekday.get(entry.weekday) ?? [];
    if (ranges.some((range) => start < range.end && range.start < end)) {
      return `hours on ${WEEKDAY_LABELS[entry.weekday]} overlap`;
    }
    ranges.push({ start, end });
    byWeekday.set(entry.weekday, ranges);
  }
  return null;
}

export function sortHours(hours: WorkingHours[]): WorkingHours[] {
  return [...hours].sort((left, right) => {
    const dayOrder = WEEKDAYS.indexOf(left.weekday) - WEEKDAYS.indexOf(right.weekday);
    return dayOrder !== 0 ? dayOrder : (parseTime(left.start) ?? 0) - (parseTime(right.start) ?? 0);
  });
}
