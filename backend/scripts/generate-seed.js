// Writes data/seed.json: the shop the backend starts from. Deterministic, so running it again
// reproduces the same file. Run with `pnpm --filter @schema-barber-shop/backend seed`.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatDateTime, parseTime, SLOT_MINUTES, slotStartsOn } from '../src/scheduling.js';

export const WINDOW_START = '2026-09-28';
export const WINDOW_WEEKS = 4;
export const OCCUPANCY = { min: 0.5, max: 0.6 };

const BARBERS = [
  {
    id: 'barber-marco',
    name: 'Marco',
    hours: [
      { weekday: 'MONDAY', start: '09:00', end: '13:00' },
      { weekday: 'MONDAY', start: '14:00', end: '18:00' },
      { weekday: 'TUESDAY', start: '09:00', end: '18:00' },
      { weekday: 'WEDNESDAY', start: '09:00', end: '18:00' },
      { weekday: 'THURSDAY', start: '09:00', end: '18:00' },
      { weekday: 'FRIDAY', start: '09:00', end: '16:00' },
    ],
  },
  {
    id: 'barber-lena',
    name: 'Lena',
    hours: [
      { weekday: 'TUESDAY', start: '12:00', end: '20:00' },
      { weekday: 'THURSDAY', start: '12:00', end: '20:00' },
      { weekday: 'SATURDAY', start: '09:00', end: '15:00' },
    ],
  },
  {
    id: 'barber-rafael',
    name: 'Rafael',
    hours: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((weekday) => ({
      weekday,
      start: '10:00',
      end: '18:00',
    })),
  },
  {
    id: 'barber-aiko',
    name: 'Aiko',
    hours: [
      { weekday: 'WEDNESDAY', start: '09:00', end: '17:00' },
      { weekday: 'THURSDAY', start: '09:00', end: '17:00' },
      { weekday: 'FRIDAY', start: '09:00', end: '17:00' },
      { weekday: 'SATURDAY', start: '08:00', end: '14:00' },
    ],
  },
  {
    id: 'barber-dmitri',
    name: 'Dmitri',
    hours: [
      { weekday: 'MONDAY', start: '12:00', end: '20:00' },
      { weekday: 'WEDNESDAY', start: '12:00', end: '20:00' },
      { weekday: 'FRIDAY', start: '12:00', end: '20:00' },
      { weekday: 'SATURDAY', start: '09:00', end: '13:00' },
    ],
  },
];

const FIRST_NAMES = [
  'Alan',
  'Barbara',
  'Claude',
  'Dorothy',
  'Edsger',
  'Frances',
  'Gordon',
  'Hedy',
  'Ivan',
  'Joan',
  'Ken',
  'Katherine',
  'Linus',
  'Margaret',
  'Niklaus',
  'Radia',
  'Tim',
  'Shafi',
  'Vint',
  'Mary',
  'John',
  'Annie',
  'Donald',
  'Karen',
];
const LAST_NAMES = ['Turing', 'Liskov', 'Shannon', 'Vaughan', 'Okafor', 'Silva'];

/** The first two are the records the site mocks in components/src/booking/mock-data.ts. */
const EXISTING_CLIENTS = [
  { id: 'client-ada', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'client-grace', name: 'Grace Hopper', email: 'grace@example.com' },
];

const EXISTING_BOOKINGS = [
  ['booking-1', 'barber-marco', 'client-ada', '2026-09-29T10:00'],
  ['booking-2', 'barber-marco', 'client-grace', '2026-09-30T15:00'],
  ['booking-3', 'barber-marco', 'client-ada', '2026-10-09T11:00'],
  ['booking-4', 'barber-lena', 'client-grace', '2026-09-29T14:00'],
  ['booking-5', 'barber-lena', 'client-ada', '2026-10-01T18:00'],
  ['booking-6', 'barber-lena', 'client-grace', '2026-10-10T09:00'],
].map(([id, barberId, clientId, startsAt]) => ({ id, barberId, clientId, startsAt, endsAt: slotEnd(startsAt) }));

export function windowDates() {
  const [year, month, day] = WINDOW_START.split('-').map(Number);
  return Array.from({ length: WINDOW_WEEKS * 7 }, (_, offset) =>
    new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10),
  );
}

/** Monday of the date's week, as `YYYY-MM-DD`. Weeks run Monday to Sunday. */
export function weekOf(date) {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const sinceMonday = (utc.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(year, month - 1, day - sinceMonday)).toISOString().slice(0, 10);
}

function slotEnd(startsAt) {
  const [date, time] = startsAt.split('T');
  return formatDateTime(date, parseTime(time) + SLOT_MINUTES);
}

/** mulberry32: a small seeded generator, so the output never changes between runs. */
function random(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, next) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(next() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function generateSeed() {
  const next = random(20260928);
  const clients = [
    ...EXISTING_CLIENTS,
    ...LAST_NAMES.flatMap((last) =>
      FIRST_NAMES.map((first) => ({
        id: `client-${first}-${last}`.toLowerCase(),
        name: `${first} ${last}`,
        email: `${first}.${last}@example.com`.toLowerCase(),
      })),
    ),
  ];

  const bookings = [...EXISTING_BOOKINGS];
  const withBarberInWeek = new Set();
  const clientAt = new Set();
  const barberAt = new Set();
  for (const booking of bookings) {
    withBarberInWeek.add(`${booking.clientId}|${booking.barberId}|${weekOf(booking.startsAt.slice(0, 10))}`);
    clientAt.add(`${booking.clientId}|${booking.startsAt}`);
    barberAt.add(`${booking.barberId}|${booking.startsAt}`);
  }

  const added = [];
  for (const barber of BARBERS) {
    const slots = windowDates().flatMap((date) =>
      slotStartsOn(barber, date).map((minutes) => formatDateTime(date, minutes)),
    );
    const rate = OCCUPANCY.min + 0.02 + next() * (OCCUPANCY.max - OCCUPANCY.min - 0.04);
    let booked = bookings.filter((booking) => booking.barberId === barber.id).length;
    const target = Math.round(slots.length * rate);

    for (const startsAt of shuffle(slots, next)) {
      if (booked >= target) break;
      if (barberAt.has(`${barber.id}|${startsAt}`)) continue;
      const week = weekOf(startsAt.slice(0, 10));
      const client = shuffle(clients, next).find(
        (candidate) =>
          !withBarberInWeek.has(`${candidate.id}|${barber.id}|${week}`) && !clientAt.has(`${candidate.id}|${startsAt}`),
      );
      if (!client) continue;

      withBarberInWeek.add(`${client.id}|${barber.id}|${week}`);
      clientAt.add(`${client.id}|${startsAt}`);
      barberAt.add(`${barber.id}|${startsAt}`);
      added.push({ barberId: barber.id, clientId: client.id, startsAt, endsAt: slotEnd(startsAt) });
      booked += 1;
    }
  }

  added.sort(
    (left, right) => left.startsAt.localeCompare(right.startsAt) || left.barberId.localeCompare(right.barberId),
  );
  for (const [index, booking] of added.entries()) {
    bookings.push({ id: `booking-${index + EXISTING_BOOKINGS.length + 1}`, ...booking });
  }
  bookings.sort(
    (left, right) => left.startsAt.localeCompare(right.startsAt) || left.barberId.localeCompare(right.barberId),
  );

  return { barbers: BARBERS, clients, bookings };
}

if (import.meta.main) {
  const seed = generateSeed();
  writeFileSync(join(import.meta.dirname, '..', 'data', 'seed.json'), `${JSON.stringify(seed, null, 2)}\n`);
  console.log(`wrote ${seed.barbers.length} barbers, ${seed.clients.length} clients, ${seed.bookings.length} bookings`);
}
