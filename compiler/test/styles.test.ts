import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Styles } from '../src/schema.ts';
import { resolveClassName, swatchProblems } from '../src/styles.ts';

test('base comes first and references expand in place', () => {
  const styles: Styles = {
    Button: {
      base: ['inline-flex', 'rounded-md'],
      primary: ['bg-black', 'text-white', 'px-6'],
      'primary-sm': ['$primary', 'px-4', 'text-sm'],
    },
  };

  assert.equal(
    resolveClassName(styles, 'Button', ['$primary-sm', 'shadow']),
    'inline-flex rounded-md bg-black text-white px-6 px-4 text-sm shadow',
  );
  assert.equal(resolveClassName(styles, 'Button'), 'inline-flex rounded-md');
  assert.equal(resolveClassName(styles, 'Text'), undefined);
});

test('reports dangling references and cycles', () => {
  const problems = swatchProblems('Button', { a: ['$b'], b: ['$a'], c: ['$missing', ''] }).join('\n');

  assert.match(problems, /swatch cycle: a -> b -> a/);
  assert.match(problems, /references "\$missing"/);
  assert.match(problems, /styles\.Button\.c has an empty token/);
});
