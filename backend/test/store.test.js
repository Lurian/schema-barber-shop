import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createFileStore } from '../src/store.js';

let directory;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'barber-store-'));
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

test('without a seed file the store starts empty, in a directory it creates', async () => {
  const path = join(directory, 'nested', 'store.json');
  const store = createFileStore({ path, seedPath: join(directory, 'missing-seed.json') });

  assert.deepEqual(await store.read(), { barbers: [], clients: [], bookings: [] });
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), { barbers: [], clients: [], bookings: [] });
});

test('concurrent updates are applied one after another, and a failed update leaves the file intact', async () => {
  const store = createFileStore({ path: join(directory, 'queue.json') });

  await Promise.all(
    ['a', 'b', 'c'].map((name) =>
      store.update((data) => {
        data.clients.push({ id: name });
      }),
    ),
  );
  await assert.rejects(
    store.update(() => {
      throw new Error('boom');
    }),
    /boom/,
  );
  await store.update((data) => {
    data.clients.push({ id: 'd' });
  });

  assert.deepEqual(
    (await store.read()).clients.map((client) => client.id),
    ['a', 'b', 'c', 'd'],
  );
});
