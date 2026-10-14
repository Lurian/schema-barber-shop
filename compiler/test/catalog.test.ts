import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const components = join(import.meta.dirname, '..', '..', 'components');

test('every catalog component is exported by its name, and nothing else is', () => {
  const catalog = Object.keys(JSON.parse(readFileSync(join(components, 'catalog.json'), 'utf8'))).sort();
  const index = readFileSync(join(components, 'src/index.ts'), 'utf8');
  const exported = [...index.matchAll(/export \{([^}]*)\}/g)]
    .flatMap((match) => match[1].split(','))
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .sort();

  assert.deepEqual(exported, catalog);
});
