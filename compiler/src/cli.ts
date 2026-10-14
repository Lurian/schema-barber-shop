import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { Diagnostics } from './diagnostics.ts';
import { compileRoot } from './emit.ts';

const USAGE = `Compile one page document into a Next.js app.

Usage:
  page-compiler compile --page <file> [--root <dir>] [--out <folder>]
  page-compiler serve --page <file> [--root <dir>] [--out <folder>] [--port <port>]

  compile  Write the Next.js app to <root>/<out>
  serve    Compile, install, and serve the app

  --page   Page document to compile, relative to --root. For example pages/client.json
  --root   Directory that contains components/catalog.json (default: .)
  --out    Folder inside --root to write the app to (default: site). Give each page its own
           folder to serve several pages at once
  --port   Port for serve (default: 3000)`;

function run(argv: string[]): void {
  // `pnpm compile -- --page x` forwards the separator; it carries no meaning here.
  const [command, ...rest] = argv.filter((arg) => arg !== '--');
  if (command === undefined || command === 'help' || command === '--help') {
    console.log(USAGE);
    return;
  }

  const { values } = parseArgs({
    args: rest,
    options: {
      page: { type: 'string' },
      root: { type: 'string', default: '.' },
      out: { type: 'string', default: 'site' },
      port: { type: 'string', default: '3000' },
    },
  });
  if (values.page === undefined) {
    throw Diagnostics.one('--page is required. For example --page pages/client.json');
  }

  switch (command) {
    case 'compile': {
      console.log(`wrote ${compileRoot(values.root, values.page, values.out)}`);
      return;
    }
    case 'serve': {
      if (!/^\d+$/.test(values.port)) {
        throw Diagnostics.one(`--port must be a number, got "${values.port}"`);
      }
      const out = compileRoot(values.root, values.page, values.out);
      console.log(`wrote ${out}`);
      runCommand('pnpm', ['install'], out);
      console.log(`serving http://localhost:${values.port}`);
      runCommand('pnpm', ['exec', 'next', 'dev', '--port', values.port], out);
      return;
    }
    default:
      throw Diagnostics.one(`unknown command "${command}"\n\n${USAGE}`);
  }
}

function runCommand(program: string, args: string[], cwd: string): void {
  const result = spawnSync(program, args, { cwd, stdio: 'inherit' });
  if (result.error) {
    throw Diagnostics.one(`failed to run ${program}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw Diagnostics.one(`${program} ${args.join(' ')} exited with ${result.signal ?? `code ${result.status}`}`);
  }
}

try {
  run(process.argv.slice(2));
} catch (error) {
  if (error instanceof Diagnostics || (error instanceof TypeError && 'code' in error)) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
