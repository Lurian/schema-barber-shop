import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { MOCK_BARBERS, MOCK_BOOKINGS, MOCK_CLIENTS } from '../../components/src/booking/mock-data.ts';
import { generateSeed, OCCUPANCY, weekOf, windowDates } from '../scripts/generate-seed.js';
import { reserveSlot, slotStartsOn, validateHours } from '../src/scheduling.js';

const seed = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'data', 'seed.json'), 'utf8'));

test('the committed seed is what the generator writes', () => {
  assert.deepEqual(seed, generateSeed());
});

test('the shop has more than four barbers, each with valid hours', () => {
  assert.ok(seed.barbers.length > 4);
  for (const barber of seed.barbers) {
    assert.doesNotThrow(() => validateHours(barber.hours), barber.name);
  }
  assert.equal(new Set(seed.clients.map((client) => client.email)).size, seed.clients.length);
});

test('every booking is a real, free working slot of its barber', () => {
  const barbers = new Map(seed.barbers.map((barber) => [barber.id, barber]));
  const clients = new Set(seed.clients.map((client) => client.id));
  const accepted = [];

  for (const booking of seed.bookings) {
    assert.ok(clients.has(booking.clientId), booking.id);
    const slot = reserveSlot(barbers.get(booking.barberId), booking.startsAt, accepted);
    assert.equal(slot.endsAt, booking.endsAt, booking.id);
    accepted.push(booking);
  }
  assert.equal(new Set(seed.bookings.map((booking) => booking.id)).size, seed.bookings.length);
});

test('each barber is between 50% and 60% booked over the four weeks', () => {
  for (const barber of seed.barbers) {
    const slots = windowDates().reduce((total, date) => total + slotStartsOn(barber, date).length, 0);
    const booked = seed.bookings.filter((booking) => booking.barberId === barber.id).length;
    const occupancy = booked / slots;
    assert.ok(
      occupancy >= OCCUPANCY.min && occupancy <= OCCUPANCY.max,
      `${barber.name} is ${(occupancy * 100).toFixed(1)}% booked`,
    );
  }
});

test('a client sees a barber at most once a week, but may see several barbers in one week', () => {
  const visits = new Map();
  for (const booking of seed.bookings) {
    const key = `${booking.clientId}|${booking.barberId}|${weekOf(booking.startsAt.slice(0, 10))}`;
    assert.ok(!visits.has(key), `${key} is booked twice`);
    visits.set(key, booking.id);
  }

  const barbersPerWeek = new Map();
  for (const booking of seed.bookings) {
    const key = `${booking.clientId}|${weekOf(booking.startsAt.slice(0, 10))}`;
    barbersPerWeek.set(key, (barbersPerWeek.get(key) ?? new Set()).add(booking.barberId));
  }
  assert.ok([...barbersPerWeek.values()].some((barbers) => barbers.size > 1));
});

test('a client is never in two chairs at once', () => {
  const seats = new Set();
  for (const booking of seed.bookings) {
    const key = `${booking.clientId}|${booking.startsAt}`;
    assert.ok(!seats.has(key), `${key} is booked with two barbers`);
    seats.add(key);
  }
});

test('every record the site mocks is in the seed, unchanged', () => {
  const byId = (records) => new Map(records.map((record) => [record.id, record]));
  const [barbers, clients, bookings] = [byId(seed.barbers), byId(seed.clients), byId(seed.bookings)];

  for (const barber of MOCK_BARBERS) assert.deepEqual(barbers.get(barber.id), barber);
  for (const client of MOCK_CLIENTS) assert.deepEqual(clients.get(client.id), client);
  for (const booking of MOCK_BOOKINGS) assert.deepEqual(bookings.get(booking.id), booking);
});
