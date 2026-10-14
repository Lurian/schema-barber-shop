import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availableSlots, parseDate, parseTime, reserveSlot, validateHours, weekdayOf } from '../src/scheduling.js';

const marco = {
  id: 'marco',
  name: 'Marco',
  hours: [
    { weekday: 'MONDAY', start: '09:00', end: '10:30' },
    { weekday: 'MONDAY', start: '14:00', end: '15:00' },
  ],
};

// 2026-10-05 is a Monday.
const monday = '2026-10-05';

test('weekdayOf reads the calendar, not the local clock', () => {
  assert.equal(weekdayOf(monday), 'MONDAY');
  assert.equal(weekdayOf('2026-10-04'), 'SUNDAY');
});

test('availableSlots lists 30-minute starts inside working hours and drops booked ones', () => {
  const bookings = [{ barberId: 'marco', startsAt: '2026-10-05T09:30' }];
  assert.deepEqual(availableSlots(marco, monday, bookings), [
    '2026-10-05T09:00',
    '2026-10-05T10:00',
    '2026-10-05T14:00',
    '2026-10-05T14:30',
  ]);
  assert.deepEqual(availableSlots(marco, '2026-10-06', []), []);
});

test('reserveSlot accepts a free working slot and computes its end', () => {
  assert.deepEqual(reserveSlot(marco, '2026-10-05T10:00', []), {
    startsAt: '2026-10-05T10:00',
    endsAt: '2026-10-05T10:30',
  });
});

test('reserveSlot rejects times outside hours, off-grid times, and taken slots', () => {
  assert.throws(() => reserveSlot(marco, '2026-10-05T11:00', []), /does not work at 2026-10-05T11:00/);
  assert.throws(() => reserveSlot(marco, '2026-10-05T09:15', []), /does not work/);
  assert.throws(() => reserveSlot(marco, '2026-10-06T09:00', []), /does not work/);
  assert.throws(
    () => reserveSlot(marco, '2026-10-05T09:00', [{ barberId: 'marco', startsAt: '2026-10-05T09:00' }]),
    /already booked/,
  );
  assert.throws(() => reserveSlot(marco, '2026-10-05 09:00', []), /must be YYYY-MM-DDTHH:MM/);
});

test('validateHours rejects reversed and overlapping ranges', () => {
  assert.throws(() => validateHours([{ weekday: 'MONDAY', start: '10:00', end: '09:00' }]), /before they start/);
  assert.throws(
    () =>
      validateHours([
        { weekday: 'MONDAY', start: '09:00', end: '12:00' },
        { weekday: 'MONDAY', start: '11:00', end: '13:00' },
      ]),
    /overlap/,
  );
  assert.equal(
    validateHours([
      { weekday: 'MONDAY', start: '09:00', end: '12:00' },
      { weekday: 'TUESDAY', start: '11:00', end: '13:00' },
    ]).length,
    2,
  );
});

test('parseTime and parseDate reject malformed and impossible values', () => {
  assert.equal(parseTime('24:00'), 1440);
  assert.throws(() => parseTime('9:00'), /must be HH:MM/);
  assert.throws(() => parseTime('24:30'), /out of range/);
  assert.throws(() => parseTime('10:75'), /out of range/);

  assert.equal(parseDate('2028-02-29'), '2028-02-29');
  assert.throws(() => parseDate('2026-2-3'), /must be YYYY-MM-DD/);
  assert.throws(() => parseDate('2026-02-29'), /is not a calendar day/);
  assert.throws(() => parseDate('2026-13-01'), /is not a calendar day/);
});

test('validateHours rejects unknown weekdays and returns only the hour fields', () => {
  assert.throws(() => validateHours([{ weekday: 'FUNDAY', start: '09:00', end: '10:00' }]), /unknown weekday "FUNDAY"/);
  assert.deepEqual(validateHours([{ weekday: 'MONDAY', start: '09:00', end: '10:00', note: 'x' }]), [
    { weekday: 'MONDAY', start: '09:00', end: '10:00' },
  ]);
});
