import { describe, expect, test } from 'vitest';
import {
  addMinutes,
  availableSlots,
  type Barber,
  formatDate,
  formatDateTime,
  formatTime,
  hoursProblem,
  parseTime,
  slotStartsOn,
  sortHours,
  splitDateTime,
  takenSlots,
  weekdayOf,
} from '../src/booking/scheduling';

// The same barber and day as backend/test/scheduling.test.js, so both copies of the rules agree.
const marco: Barber = {
  id: 'marco',
  name: 'Marco',
  hours: [
    { weekday: 'MONDAY', start: '09:00', end: '10:30' },
    { weekday: 'MONDAY', start: '14:00', end: '15:00' },
  ],
};

// 2026-10-05 is a Monday.
const monday = '2026-10-05';

describe('times', () => {
  test('parseTime reads HH:MM and rejects malformed or out-of-range values', () => {
    expect(parseTime('09:30')).toBe(570);
    expect(parseTime('24:00')).toBe(1440);
    expect(parseTime('24:01')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('9:30')).toBeNull();
  });

  test('formatTime and formatDateTime pad to two digits', () => {
    expect(formatTime(545)).toBe('09:05');
    expect(formatDateTime(monday, 600)).toBe('2026-10-05T10:00');
  });

  test('addMinutes and splitDateTime work on wall-clock date-times', () => {
    expect(addMinutes('2026-10-05T09:45', 30)).toBe('2026-10-05T10:15');
    expect(splitDateTime('2026-10-05T09:45')).toEqual({ date: monday, time: '09:45' });
  });

  test('weekdayOf and formatDate read the calendar, not the local clock', () => {
    expect(weekdayOf(monday)).toBe('MONDAY');
    expect(weekdayOf('2026-10-04')).toBe('SUNDAY');
    expect(formatDate(monday)).toBe('Mon, 5 Oct 2026');
  });
});

describe('slots', () => {
  test('slotStartsOn lists 30-minute starts inside each working range', () => {
    expect(slotStartsOn(marco, monday).map(formatTime)).toEqual(['09:00', '09:30', '10:00', '14:00', '14:30']);
    expect(slotStartsOn(marco, '2026-10-06')).toEqual([]);
  });

  test('availableSlots drops the barber’s booked slots but not other barbers’', () => {
    const bookings = [
      { id: 'a', barberId: 'marco', clientId: 'c', startsAt: '2026-10-05T09:30', endsAt: '2026-10-05T10:00' },
      { id: 'b', barberId: 'lena', clientId: 'c', startsAt: '2026-10-05T10:00', endsAt: '2026-10-05T10:30' },
    ];
    expect(availableSlots(marco, monday, bookings)).toEqual([
      '2026-10-05T09:00',
      '2026-10-05T10:00',
      '2026-10-05T14:00',
      '2026-10-05T14:30',
    ]);
    expect([...takenSlots(marco, bookings)]).toEqual(['2026-10-05T09:30']);
  });
});

describe('hours', () => {
  test('hoursProblem rejects reversed, overlapping, and malformed ranges', () => {
    expect(hoursProblem([{ weekday: 'MONDAY', start: '10:00', end: '09:00' }])).toMatch(/end before they start/);
    expect(
      hoursProblem([
        { weekday: 'MONDAY', start: '09:00', end: '12:00' },
        { weekday: 'MONDAY', start: '11:00', end: '13:00' },
      ]),
    ).toMatch(/overlap/);
    expect(hoursProblem([{ weekday: 'MONDAY', start: '9', end: '10:00' }])).toBe('times must be HH:MM');
  });

  test('hoursProblem accepts touching ranges and the same times on different days', () => {
    expect(
      hoursProblem([
        { weekday: 'MONDAY', start: '09:00', end: '12:00' },
        { weekday: 'MONDAY', start: '12:00', end: '13:00' },
        { weekday: 'TUESDAY', start: '11:00', end: '13:00' },
      ]),
    ).toBeNull();
  });

  test('sortHours orders by weekday, then by start', () => {
    const sorted = sortHours([
      { weekday: 'TUESDAY', start: '09:00', end: '10:00' },
      { weekday: 'MONDAY', start: '14:00', end: '15:00' },
      { weekday: 'MONDAY', start: '09:00', end: '10:00' },
    ]);
    expect(sorted.map((range) => `${range.weekday} ${range.start}`)).toEqual([
      'MONDAY 09:00',
      'MONDAY 14:00',
      'TUESDAY 09:00',
    ]);
  });
});
