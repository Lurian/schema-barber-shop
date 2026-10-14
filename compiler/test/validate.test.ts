import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Diagnostics } from '../src/diagnostics.ts';
import { parseCatalog, parsePage } from '../src/schema.ts';
import { validate } from '../src/validate.ts';

const CATALOG = JSON.stringify({
  Button: {
    name: 'Button',
    importPath: '@schema-barber-shop/components',
    acceptsChildren: true,
    schema: { children: { type: 'string' } },
  },
  Separator: {
    name: 'Separator',
    importPath: '@schema-barber-shop/components',
    schema: { orientation: { type: ['horizontal', 'vertical'] } },
  },
  BookingRoot: {
    name: 'BookingRoot',
    importPath: '@schema-barber-shop/components',
    acceptsChildren: true,
    providesContext: 'booking',
    schema: {},
  },
  SlotPicker: {
    name: 'SlotPicker',
    importPath: '@schema-barber-shop/components',
    requiresContext: 'booking',
    schema: {},
  },
});

function check(page: object): void {
  validate(parsePage(JSON.stringify(page)), parseCatalog(CATALOG));
}

function messages(page: object): string {
  try {
    check(page);
  } catch (error) {
    assert.ok(error instanceof Diagnostics);
    return error.messages.join('\n');
  }
  assert.fail('expected the page to be rejected');
}

test('rejects unknown components, cycles, and dangling swatches', () => {
  const errors = messages({
    name: 'home',
    root: 'a',
    styles: {
      Button: { base: ['$loop'], loop: ['$base'] },
      Ghost: { base: ['hidden'] },
    },
    elements: {
      a: { type: 'Button', children: ['b'], style: ['$brand'] },
      b: { type: 'Missing', children: ['a'] },
      rule: { type: 'Separator', props: { orientation: 'diagonal' } },
    },
  });

  assert.match(errors, /unknown type "Missing"/);
  assert.match(errors, /cycle in elements/);
  assert.match(errors, /references "\$brand", which styles\.Button does not define/);
  assert.match(errors, /styles\.Button has a swatch cycle: base -> loop -> base/);
  assert.match(errors, /styles\.Ghost styles a component that is not in the catalog/);
  assert.match(errors, /not reachable/);
  assert.match(errors, /got "diagonal"/);
});

test('accepts swatches the page defines', () => {
  check({
    name: 'home',
    root: 'a',
    styles: { Button: { base: ['inline-flex'], primary: ['bg-black'] } },
    elements: { a: { type: 'Button', style: ['$primary', 'mt-2'] } },
  });
});

test('a context consumer must sit under its provider', () => {
  const orphan = messages({
    name: 'home',
    root: 'wrap',
    elements: {
      wrap: { type: 'Button', children: ['slots'] },
      slots: { type: 'SlotPicker' },
    },
  });
  assert.match(orphan, /requires context "booking" but no ancestor provides it/);
  assert.match(orphan, /Components that provide "booking": BookingRoot\./);

  check({
    name: 'home',
    root: 'booking',
    elements: {
      booking: { type: 'BookingRoot', children: ['wrap'] },
      wrap: { type: 'Button', children: ['slots'] },
      slots: { type: 'SlotPicker' },
    },
  });
});

test('rejects a bad page name, an empty page, and a root that names no element', () => {
  assert.match(messages({ name: '9 lives', root: 'a', elements: { a: { type: 'Separator' } } }), /cannot become/);

  const empty = messages({ name: 'home', root: '', elements: {} });
  assert.match(empty, /page has no elements/);
  assert.match(empty, /root is empty/);

  assert.match(
    messages({ name: 'home', root: 'missing', elements: { a: { type: 'Separator' } } }),
    /root "missing" does not match an element/,
  );
});

test('rejects missing and repeated children, and children on a leaf', () => {
  const errors = messages({
    name: 'home',
    root: 'a',
    elements: {
      a: { type: 'Button', children: ['b', 'c', 'ghost'] },
      b: { type: 'Button', children: ['c'] },
      c: { type: 'Separator', children: ['d'] },
      d: { type: 'Separator' },
    },
  });

  assert.match(errors, /element "a" lists missing child "ghost"/);
  assert.match(errors, /element "c" is listed more than once \(by "a" and "b"\)/);
  assert.match(errors, /element "c" type "Separator" does not accept children/);
});

test('rejects className, props outside the schema, and props of the wrong type', () => {
  const errors = messages({
    name: 'home',
    root: 'a',
    elements: {
      a: { type: 'Button', props: { className: 'x', size: 'lg', children: 3 }, children: ['b'], style: [' '] },
      b: { type: 'Separator', props: { orientation: 1 } },
    },
  });

  assert.match(errors, /element "a" sets className; put Tailwind classes in the style array/);
  assert.match(errors, /element "a" prop "size" is not in the Button schema/);
  assert.match(errors, /element "a" prop "children" must be a string/);
  assert.match(errors, /element "a" has an empty style token/);
  assert.match(errors, /element "b" prop "orientation" must be a string/);
});

test('rejects catalog entries the compiler cannot emit', () => {
  const catalog = JSON.stringify({
    Button: { name: 'Buttons', importPath: '', schema: { 'aria-label': { type: 'string' }, items: { type: 'array' } } },
    'my-box': { name: 'my-box', importPath: 'x', schema: { tone: { type: [] }, when: { type: 'date' } } },
  });
  const page = parsePage(JSON.stringify({ name: 'home', root: 'a', elements: { a: { type: 'my-box' } } }));
  const errors = (() => {
    try {
      validate(page, parseCatalog(catalog));
    } catch (error) {
      assert.ok(error instanceof Diagnostics);
      return error.messages.join('\n');
    }
    assert.fail('expected the catalog to be rejected');
  })();

  assert.match(errors, /catalog key "Button" declares name "Buttons"/);
  assert.match(errors, /catalog component "Button" is missing importPath/);
  assert.match(errors, /catalog "Button" prop "aria-label" is not a JavaScript identifier/);
  assert.match(errors, /catalog "Button" prop "items": object and array props are not emitted/);
  assert.match(errors, /catalog component "my-box" is not a JavaScript identifier/);
  assert.match(errors, /catalog "my-box" prop "tone": enum has no options/);
  assert.match(errors, /catalog "my-box" prop "when": unsupported prop type "date"/);
});

test('a context no component provides says so', () => {
  const catalog = JSON.stringify({
    Orphan: { name: 'Orphan', importPath: 'x', requiresContext: 'nowhere' },
  });
  const page = parsePage(JSON.stringify({ name: 'home', root: 'a', elements: { a: { type: 'Orphan' } } }));

  assert.throws(
    () => validate(page, parseCatalog(catalog)),
    (error: unknown) =>
      error instanceof Diagnostics &&
      error.messages[0].endsWith(
        'requires context "nowhere" but no ancestor provides it. No component in the catalog provides "nowhere".',
      ),
  );
});

test('rejects fields the page schema does not define', () => {
  const page = JSON.stringify({ name: 'home', root: 'a', extra: 1, elements: { a: { type: 'Button', css: 'x' } } });

  assert.throws(
    () => parsePage(page),
    (error: unknown) =>
      error instanceof Diagnostics &&
      error.messages.includes('page.json: unknown field "extra"') &&
      error.messages.includes('page.json: element "a": unknown field "css"'),
  );
});
