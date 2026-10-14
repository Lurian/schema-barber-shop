import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const EMPTY = { barbers: [], clients: [], bookings: [] };

/**
 * JSON-file storage. Reads parse the whole file; writes go through one queue so two
 * mutations never interleave, and land via rename so a crash leaves the old file intact.
 */
export function createFileStore({ path, seedPath }) {
  let queue = Promise.resolve();

  async function ensureFile() {
    if (existsSync(path)) {
      return;
    }
    await mkdir(dirname(path), { recursive: true });
    if (seedPath && existsSync(seedPath)) {
      await copyFile(seedPath, path);
    } else {
      await writeFile(path, serialize(EMPTY));
    }
  }

  async function read() {
    await ensureFile();
    return JSON.parse(await readFile(path, 'utf8'));
  }

  function update(mutate) {
    const run = queue.then(async () => {
      const data = await read();
      const result = await mutate(data);
      const temporary = `${path}.tmp`;
      await writeFile(temporary, serialize(data));
      await rename(temporary, path);
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  return { read, update };
}

function serialize(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}
