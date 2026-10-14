import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { compileSources } from '../src/emit.ts';

const CATALOG = JSON.stringify({
  Button: {
    name: 'Button',
    importPath: '@schema-barber-shop/components',
    acceptsChildren: true,
    schema: { children: { type: 'string' }, disabled: { type: 'boolean' }, title: { type: 'string' } },
  },
});

test('emits a single page component with resolved swatches', () => {
  const app = compileSources(
    JSON.stringify({
      name: 'home',
      root: 'submit',
      styles: { Button: { base: ['inline-flex', 'rounded-md'], primary: ['bg-black', 'text-white'] } },
      elements: { submit: { type: 'Button', props: { children: 'Send' }, style: ['$primary', 'mt-4'] } },
    }),
    CATALOG,
  );

  assert.equal(
    app.get('app/page.tsx'),
    [
      "import { Button } from '@schema-barber-shop/components';",
      '',
      'export default function HomePage() {',
      '  return (',
      '    <Button className="inline-flex rounded-md bg-black text-white mt-4">{"Send"}</Button>',
      '  );',
      '}',
      '',
    ].join('\n'),
  );
});

test('an element without styles gets no className', () => {
  const app = compileSources(
    JSON.stringify({
      name: 'home',
      root: 'submit',
      elements: { submit: { type: 'Button', props: { children: 'Send' } } },
    }),
    CATALOG,
  );

  assert.match(app.get('app/page.tsx') ?? '', /<Button>\{"Send"\}<\/Button>/);
});

test('true is a bare attribute and a string that needs escaping is an expression', () => {
  const app = compileSources(
    JSON.stringify({
      name: 'home',
      root: 'submit',
      elements: { submit: { type: 'Button', props: { disabled: true, title: 'Say "hi"' } } },
    }),
    CATALOG,
  );

  assert.match(app.get('app/page.tsx') ?? '', /<Button disabled title=\{"Say \\"hi\\""\} \/>/);
});

for (const page of ['pages/client.json', 'pages/barber.json']) {
  test(`${page} compiles to one route`, () => {
    const root = join(import.meta.dirname, '..', '..');
    const app = compileSources(
      readFileSync(join(root, page), 'utf8'),
      readFileSync(join(root, 'components/catalog.json'), 'utf8'),
    );
    const source = app.get('app/page.tsx') ?? '';

    assert.match(source, /from '@schema-barber-shop\/components'/);
    assert.match(source, /^ {4}<ShopRoot>$/m);
    assert.match(
      source,
      /<DrawerViewport className="fixed inset-0 flex justify-end">\n\s*<DrawerPopup className="flex h-full w-full max-w-md /,
    );
    assert.equal([...app.keys()].filter((path) => path.endsWith('page.tsx')).length, 1);
  });
}

test('the client page resolves swatches and literal props', () => {
  const root = join(import.meta.dirname, '..', '..');
  const app = compileSources(
    readFileSync(join(root, 'pages/client.json'), 'utf8'),
    readFileSync(join(root, 'components/catalog.json'), 'utf8'),
  );
  const source = app.get('app/page.tsx') ?? '';

  assert.match(source, /export default function ClientPage\(\)/);
  assert.ok(source.includes('<Text as="h1" className="text-3xl font-semibold text-neutral-900">{"Clients"}</Text>'));
  assert.ok(
    source.includes('<Text as="h2" className="text-lg font-semibold text-neutral-900 mt-2">{"Bookings"}</Text>'),
  );
  assert.ok(
    source.includes(
      '<DrawerTrigger className="inline-flex items-center justify-center rounded-md text-sm bg-neutral-900',
    ),
  );
  assert.ok(source.includes('<BookingDate label="Date" className="flex flex-col gap-1 '));
  assert.match(app.get('app/layout.tsx') ?? '', /title: "Clients"/);
});
