import type { Barber, Booking, Client } from './scheduling';

// A subset of backend/data/seed.json: its first two barbers and clients and six of its bookings.
// The frontend never calls the backend.
export const MOCK_BARBERS: Barber[] = [
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
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'client-ada', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'client-grace', name: 'Grace Hopper', email: 'grace@example.com' },
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'booking-1',
    barberId: 'barber-marco',
    clientId: 'client-ada',
    startsAt: '2026-09-29T10:00',
    endsAt: '2026-09-29T10:30',
  },
  {
    id: 'booking-2',
    barberId: 'barber-marco',
    clientId: 'client-grace',
    startsAt: '2026-09-30T15:00',
    endsAt: '2026-09-30T15:30',
  },
  {
    id: 'booking-3',
    barberId: 'barber-marco',
    clientId: 'client-ada',
    startsAt: '2026-10-09T11:00',
    endsAt: '2026-10-09T11:30',
  },
  {
    id: 'booking-4',
    barberId: 'barber-lena',
    clientId: 'client-grace',
    startsAt: '2026-09-29T14:00',
    endsAt: '2026-09-29T14:30',
  },
  {
    id: 'booking-5',
    barberId: 'barber-lena',
    clientId: 'client-ada',
    startsAt: '2026-10-01T18:00',
    endsAt: '2026-10-01T18:30',
  },
  {
    id: 'booking-6',
    barberId: 'barber-lena',
    clientId: 'client-grace',
    startsAt: '2026-10-10T09:00',
    endsAt: '2026-10-10T09:30',
  },
];
