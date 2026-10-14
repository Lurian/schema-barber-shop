import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Diagnostics } from './diagnostics.ts';
import { type ComponentCatalog, own, type Page, pageFunctionName, parseCatalog, parsePage } from './schema.ts';
import { resolveClassName } from './styles.ts';
import {
  GLOBALS_CSS,
  NEXT_CONFIG,
  PACKAGE_JSON,
  PNPM_WORKSPACE,
  POSTCSS,
  SITE_GITIGNORE,
  TSCONFIG,
} from './templates.ts';
import { validate } from './validate.ts';

/** Relative path -> file contents of the generated Next.js app. */
type GeneratedApp = Map<string, string>;

export function compileSources(pageSource: string, catalogSource: string): GeneratedApp {
  const page = parsePage(pageSource);
  const catalog = parseCatalog(catalogSource);
  validate(page, catalog);
  return emitApp(page, catalog);
}

/**
 * Compiles `page` (relative to `root`) and writes the app to `root/<outDir>`. The app links
 * `../components`, so `outDir` must be a folder directly inside `root`.
 */
export function compileRoot(root: string, page: string, outDir = 'site'): string {
  if (!/^[A-Za-z0-9._-]+$/.test(outDir) || outDir === '.' || outDir === '..' || outDir === 'components') {
    throw Diagnostics.one(`--out must be a folder name inside the project, such as site-barber; got "${outDir}"`);
  }
  const pageSource = readSource(resolve(root, page));
  const catalogSource = readSource(join(root, 'components/catalog.json'));
  const app = compileSources(pageSource, catalogSource);
  const out = join(root, outDir);
  writeApp(app, out);
  return out;
}

function writeApp(app: GeneratedApp, out: string): void {
  for (const [name, contents] of app) {
    const path = join(out, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  }
}

function readSource(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    throw Diagnostics.one(`failed to read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function emitApp(page: Page, catalog: ComponentCatalog): GeneratedApp {
  return new Map([
    ['package.json', PACKAGE_JSON],
    ['pnpm-workspace.yaml', PNPM_WORKSPACE],
    ['next.config.ts', NEXT_CONFIG],
    ['tsconfig.json', TSCONFIG],
    ['postcss.config.mjs', POSTCSS],
    ['.gitignore', SITE_GITIGNORE],
    ['app/globals.css', GLOBALS_CSS],
    ['app/layout.tsx', emitLayout(page)],
    ['app/page.tsx', emitPage(page, catalog)],
  ]);
}

function emitPage(page: Page, catalog: ComponentCatalog): string {
  const lines: string[] = [];
  for (const [importPath, names] of collectImports(page, catalog)) {
    lines.push(`import { ${names.join(', ')} } from '${importPath}';`);
  }

  return [
    ...lines,
    '',
    `export default function ${pageFunctionName(page.name)}() {`,
    '  return (',
    emitElement(page, catalog, page.root, 4),
    '  );',
    '}',
    '',
  ].join('\n');
}

/** Import path -> sorted component names, for every component reachable from the root. */
function collectImports(page: Page, catalog: ComponentCatalog): [string, string[]][] {
  const grouped = new Map<string, Set<string>>();
  const seen = new Set<string>();
  const pending = [page.root];

  while (pending.length > 0) {
    const id = pending.pop() as string;
    const element = own(page.elements, id);
    if (seen.has(id) || !element) {
      continue;
    }
    seen.add(id);

    const entry = own(catalog, element.type);
    if (entry) {
      const names = grouped.get(entry.importPath) ?? new Set();
      grouped.set(entry.importPath, names.add(entry.name));
    }
    pending.push(...(element.children ?? []));
  }

  return [...grouped]
    .sort(([left], [right]) => compare(left, right))
    .map(([importPath, names]) => [importPath, [...names].sort(compare)]);
}

function emitElement(page: Page, catalog: ComponentCatalog, id: string, indent: number): string {
  const element = own(page.elements, id);
  const entry = element && own(catalog, element.type);
  if (!element || !entry) {
    throw new Error(`element "${id}" was not validated`);
  }

  const pad = ' '.repeat(indent);
  const attributes: string[] = [];
  let label: string | undefined;

  for (const [key, value] of Object.entries(element.props ?? {})) {
    if (key === 'children') {
      if (typeof value === 'string') {
        label = `{${JSON.stringify(value)}}`;
      }
      continue;
    }
    const attribute = jsxAttribute(key, value);
    if (attribute) {
      attributes.push(attribute);
    }
  }

  const className = resolveClassName(page.styles, element.type, element.style);
  if (className !== undefined) {
    attributes.push(jsxAttribute('className', className) as string);
  }

  const name = entry.name;
  const opening = [name, ...attributes].join(' ');
  const children = element.children ?? [];

  if (children.length === 0) {
    return label === undefined ? `${pad}<${opening} />` : `${pad}<${opening}>${label}</${name}>`;
  }

  return [
    `${pad}<${opening}>`,
    ...children.map((child) => emitElement(page, catalog, child, indent + 2)),
    ...(label === undefined ? [] : [`${' '.repeat(indent + 2)}${label}`]),
    `${pad}</${name}>`,
  ].join('\n');
}

/**
 * `true` is a bare attribute. A string is a bare literal when its source form needs no escape,
 * since JSX attribute strings do not process escape sequences; otherwise it is a `{"..."}`
 * expression. Values other than strings, numbers, and booleans are not emitted.
 */
function jsxAttribute(name: string, value: unknown): string | undefined {
  if (value === true) {
    return name;
  }
  if (typeof value === 'string') {
    const literal = JSON.stringify(value);
    return literal === `"${value}"` ? `${name}=${literal}` : `${name}={${literal}}`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${name}={${value}}`;
  }
  return undefined;
}

function emitLayout(page: Page): string {
  const title = JSON.stringify(page.metadata?.title?.default || page.name);
  const description = page.metadata?.description;
  const descriptionLine = description === undefined ? '' : `  description: ${JSON.stringify(description)},\n`;

  return `import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: ${title},
${descriptionLine}};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

/** Code-unit order, so output does not depend on the host locale. */
function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
