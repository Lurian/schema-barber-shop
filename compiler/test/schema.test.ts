import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Diagnostics } from '../src/diagnostics.ts';
import { pageFunctionName, parseCatalog, parsePage } from '../src/schema.ts';

function problems(parse: () => unknown): string[] {
  try {
    parse();
  } catch (error) {
    assert.ok(error instanceof Diagnostics);
    return error.messages;
  }
  assert.fail('expected the document to be rejected');
}

test('invalid JSON and a non-object document are reported with the file name', () => {
  assert.match(problems(() => parsePage('{ nope'))[0], /^page\.json: /);
  assert.deepEqual(
    problems(() => parsePage('[]')),
    ['page.json: expected an object'],
  );
  assert.deepEqual(
    problems(() => parseCatalog('"x"')),
    ['components/catalog.json: expected an object'],
  );
});

test('every malformed page field is reported at once', () => {
  const page = JSON.stringify({
    name: 1,
    elements: {
      a: 'not an element',
      b: { props: [], children: 'c', style: [1] },
      c: { type: 'Text', props: {}, children: [], style: [] },
    },
    metadata: { title: 'x', description: 2, keywords: [] },
    styles: { Text: { base: 'bold' }, Button: [] },
  });

  assert.deepEqual(
    problems(() => parsePage(page)).sort(),
    [
      'page.json: "metadata": unknown field "keywords"',
      'page.json: "metadata".title must be an object',
      'page.json: "metadata": "description" must be a string',
      'page.json: "name" must be a string',
      'page.json: "root" must be a string',
      'page.json: element "a" must be an object',
      'page.json: element "b": "type" must be a string',
      'page.json: styles.Button must map swatch names to class lists',
      'page.json: styles.Text.base must be a list of strings',
    ].sort(),
  );
});

test('element fields of the wrong shape are reported when the element has a type', () => {
  const page = JSON.stringify({
    name: 'home',
    root: 'a',
    elements: { a: { type: 'Text', props: [], children: 'b', style: 'bold' } },
    metadata: { title: { default: 3, other: true } },
    styles: [],
  });

  assert.deepEqual(problems(() => parsePage(page)).sort(), [
    'page.json: "metadata".title: "default" must be a string',
    'page.json: "metadata".title: unknown field "other"',
    'page.json: "styles" must map component types to swatches',
    'page.json: element "a": "children" must be a list of element ids',
    'page.json: element "a": "props" must be an object',
    'page.json: element "a": "style" must be a list of strings',
  ]);
});

test('a page without metadata or styles parses with empty styles', () => {
  const page = parsePage(JSON.stringify({ name: 'home', root: 'a', elements: { a: { type: 'Text' } } }));
  assert.deepEqual(page.styles, {});
  assert.equal(page.metadata, undefined);
});

test('every malformed catalog entry is reported at once', () => {
  const catalog = JSON.stringify({
    A: 'not an entry',
    B: { importPath: 'x', acceptsChildren: 'yes', guideline: 1, requiresContext: 2 },
    C: { name: 'C', importPath: 'x', providesContext: 3, schema: [] },
    D: { name: 'D', importPath: 'x', schema: { size: { type: 4 }, tone: 'loud' } },
  });

  assert.deepEqual(problems(() => parseCatalog(catalog)).sort(), [
    'components/catalog.json: "A" must be an object',
    'components/catalog.json: "B": "acceptsChildren" must be a boolean',
    'components/catalog.json: "B": "guideline" must be a string',
    'components/catalog.json: "B": "name" must be a string',
    'components/catalog.json: "B": "requiresContext" must be a string',
    'components/catalog.json: "C": "providesContext" must be a context name or a list of them',
    'components/catalog.json: "C": "schema" must be an object',
    'components/catalog.json: "D": prop "size" must declare a type, a type name or a list of options',
    'components/catalog.json: "D": prop "tone" must declare a type, a type name or a list of options',
  ]);
});

test('providesContext accepts one name or a list, and entries default to no children', () => {
  const catalog = parseCatalog(
    JSON.stringify({
      One: { name: 'One', importPath: 'x', providesContext: 'a' },
      Many: { name: 'Many', importPath: 'x', providesContext: ['a', 'b'], requiresContext: 'c' },
    }),
  );
  assert.deepEqual(catalog.One, {
    name: 'One',
    importPath: 'x',
    acceptsChildren: false,
    schema: {},
    providesContext: ['a'],
  });
  assert.deepEqual(catalog.Many.providesContext, ['a', 'b']);
  assert.equal(catalog.Many.requiresContext, 'c');
});

test('page names become PascalCase component names ending in Page', () => {
  assert.equal(pageFunctionName('client'), 'ClientPage');
  assert.equal(pageFunctionName('barber-shop'), 'BarberShopPage');
  assert.equal(pageFunctionName('landing page'), 'LandingPage');
  assert.throws(() => pageFunctionName('9 lives'), /cannot become a React component name/);
  assert.throws(() => pageFunctionName('---'), /cannot become a React component name/);
});
