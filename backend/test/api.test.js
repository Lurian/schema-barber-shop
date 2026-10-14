import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

let directory;
let app;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'barber-'));
  app = createApp({
    storePath: join(directory, 'store.json'),
    seedPath: join(import.meta.dirname, 'fixtures', 'seed.json'),
  });
  await app.start();
});

after(async () => {
  await app.stop();
  await rm(directory, { recursive: true, force: true });
});

async function graphql(query, variables) {
  const response = await app.executeOperation({ query, variables });
  if (response.body.kind !== 'single') {
    throw new Error(`expected a single GraphQL result, got ${response.body.kind}`);
  }
  return response.body.singleResult;
}

test('a barber links to a client and back to a barber', async () => {
  const result = await graphql(`{
    barber(id: "barber-marco") {
      name
      bookings {
        client {
          name
          bookings {
            barber { name }
          }
        }
      }
    }
  }`);
  assert.equal(result.errors, undefined);
  const ada = result.data.barber.bookings.find((booking) => booking.client.name === 'Ada Lovelace');
  const names = ada.client.bookings.map((booking) => booking.barber.name);
  assert.ok(names.includes('Marco'));
  assert.ok(names.includes('Lena'));
});

test('a client books a barber at a free hour and the booking is persisted to the file', async () => {
  const seeded = await graphql('{ barbers { id name } clients { id } }');
  assert.equal(seeded.data.barbers.length, 2);
  const marco = seeded.data.barbers.find((barber) => barber.name === 'Marco');
  const [client] = seeded.data.clients;

  const slots = await graphql('query ($id: ID!, $date: String!) { availableSlots(barberId: $id, date: $date) }', {
    id: marco.id,
    date: '2026-10-05',
  });
  assert.equal(slots.data.availableSlots[0], '2026-10-05T09:00');
  assert.ok(!slots.data.availableSlots.includes('2026-10-05T13:00'));

  const booked = await graphql(
    `mutation ($barberId: ID!, $clientId: ID!, $startsAt: String!) {
      bookHaircut(barberId: $barberId, clientId: $clientId, startsAt: $startsAt) {
        id startsAt endsAt barber { name } client { name }
      }
    }`,
    { barberId: marco.id, clientId: client.id, startsAt: '2026-10-05T09:00' },
  );
  assert.equal(booked.errors, undefined);
  assert.equal(booked.data.bookHaircut.endsAt, '2026-10-05T09:30');
  assert.equal(booked.data.bookHaircut.barber.name, 'Marco');

  const again = await graphql(
    `mutation ($barberId: ID!, $clientId: ID!, $startsAt: String!) {
      bookHaircut(barberId: $barberId, clientId: $clientId, startsAt: $startsAt) { id }
    }`,
    { barberId: marco.id, clientId: client.id, startsAt: '2026-10-05T09:00' },
  );
  assert.match(again.errors[0].message, /already booked/);
  assert.equal(again.errors[0].extensions.code, 'BAD_USER_INPUT');

  const remaining = await graphql('query ($id: ID!, $date: String!) { availableSlots(barberId: $id, date: $date) }', {
    id: marco.id,
    date: '2026-10-05',
  });
  assert.ok(!remaining.data.availableSlots.includes('2026-10-05T09:00'));

  const onDisk = JSON.parse(await readFile(join(directory, 'store.json'), 'utf8'));
  const persisted = onDisk.bookings.filter((booking) => booking.startsAt === '2026-10-05T09:00');
  assert.equal(persisted.length, 1);
});

test('a barber replaces their hours and invalid hours are rejected', async () => {
  const created = await graphql('mutation { createBarber(name: "Noor") { id hours { weekday } } }');
  const { id } = created.data.createBarber;
  assert.deepEqual(created.data.createBarber.hours, []);

  const set = await graphql(
    `mutation ($id: ID!, $hours: [WorkingHoursInput!]!) {
      setBarberHours(barberId: $id, hours: $hours) { hours { weekday start end } }
    }`,
    { id, hours: [{ weekday: 'SATURDAY', start: '10:00', end: '12:00' }] },
  );
  assert.deepEqual(JSON.parse(JSON.stringify(set.data.setBarberHours.hours)), [
    { weekday: 'SATURDAY', start: '10:00', end: '12:00' },
  ]);

  const reversed = await graphql(
    `mutation ($id: ID!, $hours: [WorkingHoursInput!]!) {
      setBarberHours(barberId: $id, hours: $hours) { id }
    }`,
    { id, hours: [{ weekday: 'SATURDAY', start: '12:00', end: '10:00' }] },
  );
  assert.match(reversed.errors[0].message, /before they start/);
});

test('bookings can be filtered by barber, by client, or both', async () => {
  const all = await graphql('{ bookings { id } }');
  const byBarber = await graphql('{ bookings(barberId: "barber-lena") { barber { id } } }');
  const byClient = await graphql('{ bookings(clientId: "client-ada") { client { id } } }');
  const both = await graphql('{ bookings(barberId: "barber-lena", clientId: "client-ada") { startsAt } }');

  assert.ok(all.data.bookings.length >= 6);
  assert.ok(byBarber.data.bookings.every((booking) => booking.barber.id === 'barber-lena'));
  assert.ok(byClient.data.bookings.every((booking) => booking.client.id === 'client-ada'));
  assert.deepEqual(
    both.data.bookings.map((booking) => booking.startsAt),
    ['2026-10-01T18:00'],
  );
});

test('cancelling a booking frees its slot, and cancelling it again returns false', async () => {
  const slots = () =>
    graphql('{ availableSlots(barberId: "barber-lena", date: "2026-10-01") }').then(
      (result) => result.data.availableSlots,
    );
  assert.ok(!(await slots()).includes('2026-10-01T18:00'));

  const cancelled = await graphql('mutation { cancelBooking(id: "booking-5") }');
  assert.equal(cancelled.data.cancelBooking, true);
  assert.ok((await slots()).includes('2026-10-01T18:00'));

  const again = await graphql('mutation { cancelBooking(id: "booking-5") }');
  assert.equal(again.data.cancelBooking, false);
});

test('a new client is stored with a lower-cased email and can be booked', async () => {
  const created = await graphql(
    'mutation { createClient(name: "  Alan Turing ", email: "Alan@Example.com") { id name email } }',
  );
  assert.equal(created.errors, undefined);
  assert.equal(created.data.createClient.name, 'Alan Turing');
  assert.equal(created.data.createClient.email, 'alan@example.com');

  const client = await graphql('query ($id: ID!) { client(id: $id) { name bookings { id } } }', {
    id: created.data.createClient.id,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(client.data.client)), { name: 'Alan Turing', bookings: [] });
});

test('blank names, unknown clients, and bad dates are rejected', async () => {
  const blank = await graphql('mutation { createBarber(name: "   ") { id } }');
  assert.match(blank.errors[0].message, /name is required/);

  const unknownClient = await graphql(
    'mutation { bookHaircut(barberId: "barber-marco", clientId: "nobody", startsAt: "2026-10-05T09:30") { id } }',
  );
  assert.equal(unknownClient.errors[0].extensions.code, 'NOT_FOUND');
  assert.match(unknownClient.errors[0].message, /client nobody not found/);

  const badDate = await graphql('{ availableSlots(barberId: "barber-marco", date: "2026-02-30") }');
  assert.match(badDate.errors[0].message, /is not a calendar day/);

  const lookups = await graphql('{ barber(id: "nope") { id } client(id: "nope") { id } }');
  assert.deepEqual(JSON.parse(JSON.stringify(lookups.data)), { barber: null, client: null });
});

test('unknown ids and duplicate client emails are reported', async () => {
  const missing = await graphql('{ availableSlots(barberId: "nope", date: "2026-10-05") }');
  assert.equal(missing.errors[0].extensions.code, 'NOT_FOUND');

  const duplicate = await graphql('mutation { createClient(name: "Ada", email: "ADA@example.com") { id } }');
  assert.match(duplicate.errors[0].message, /already exists/);
});
