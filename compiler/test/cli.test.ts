import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { Diagnostics } from '../src/diagnostics.ts';
import { compileRoot } from '../src/emit.ts';

const cli = join(import.meta.dirname, '..', 'src', 'cli.ts');
const catalog = join(import.meta.dirname, '..', '..', 'components', 'catalog.json');
let root: string;

before(() => {
  root = mkdtempSync(join(tmpdir(), 'page-compiler-'));
  mkdirSync(join(root, 'components'));
  mkdirSync(join(root, 'pages'));
  cpSync(catalog, join(root, 'components', 'catalog.json'));
  writeFileSync(
    join(root, 'pages', 'home.json'),
    JSON.stringify({ name: 'home', root: 'title', elements: { title: { type: 'Text', props: { children: 'Hi' } } } }),
  );
  writeFileSync(join(root, 'pages', 'broken.json'), JSON.stringify({ name: 'home', root: 'a', elements: {} }));
});

after(() => {
  rmSync(root, { recursive: true, force: true });
});

function run(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

test('compileRoot writes the app to root/site', () => {
  const out = compileRoot(root, 'pages/home.json');

  assert.equal(out, join(root, 'site'));
  assert.match(readFileSync(join(out, 'app', 'page.tsx'), 'utf8'), /<Text>\{"Hi"\}<\/Text>/);
  for (const file of ['package.json', 'next.config.ts', 'app/layout.tsx', 'app/globals.css', '.gitignore']) {
    assert.ok(existsSync(join(out, file)), `${file} was written`);
  }
});

test('--out writes each page to its own folder', () => {
  const result = run('compile', '--root', root, '--page', 'pages/home.json', '--out', 'site-home');

  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(join(root, 'site-home', 'app', 'page.tsx'), 'utf8'), /<Text>\{"Hi"\}<\/Text>/);
});

test('--out must be a folder directly inside the project', () => {
  for (const out of ['../elsewhere', 'a/b', '..', 'components']) {
    const result = run('compile', '--root', root, '--page', 'pages/home.json', '--out', out);
    assert.equal(result.status, 1, out);
    assert.match(result.stderr, /--out must be a folder name inside the project/);
  }
});

test('compileRoot reports a page file that does not exist', () => {
  assert.throws(
    () => compileRoot(root, 'pages/nope.json'),
    (error: unknown) => error instanceof Diagnostics && /^failed to read .*nope\.json: ENOENT/.test(error.message),
  );
});

test('compile writes the app and exits 0, ignoring the pnpm -- separator', () => {
  const result = run('compile', '--', '--root', root, '--page', 'pages/home.json');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), `wrote ${join(root, 'site')}`);
});

test('an invalid page exits 1 with every problem on stderr', () => {
  const result = run('compile', '--root', root, '--page', 'pages/broken.json');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /page has no elements/);
  assert.match(result.stderr, /root "a" does not match an element/);
});

test('usage errors exit 1 with a message', () => {
  assert.match(run('compile').stderr, /--page is required/);
  assert.equal(run('compile').status, 1);
  assert.match(run('publish', '--page', 'x').stderr, /unknown command "publish"/);
  assert.match(run('compile', '--page', 'x', '--verbose').stderr, /Unknown option '--verbose'/);
  assert.match(
    run('serve', '--root', root, '--page', 'pages/home.json', '--port', 'eighty').stderr,
    /--port must be a number/,
  );
});

test('help prints the usage', () => {
  const result = run('--help');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /page-compiler compile --page <file>/);
});
