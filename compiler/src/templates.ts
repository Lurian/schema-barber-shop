/** Files of the generated Next.js app that do not depend on the page. */

export const PACKAGE_JSON = `{
  "name": "@schema-barber-shop/site",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@schema-barber-shop/components": "link:../components",
    "next": "^16.2.9",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^25.5.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^4",
    "typescript": "^5.9.3"
  }
}
`;

export const PNPM_WORKSPACE = `# Standalone generated app — intentionally not part of any parent workspace.
packages: []

verifyDepsBeforeRun: false
confirmModulesPurge: false
strictDepBuilds: false
allowBuilds:
  sharp: true
`;

export const NEXT_CONFIG = `import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const appRoot = dirname(fileURLToPath(import.meta.url));
// @schema-barber-shop/components is linked from ../components. Turbopack refuses to bundle files outside
// its root, so the root is the parent directory that contains both site/ and components/.
const workspaceRoot = resolve(appRoot, '..');

const nextConfig: NextConfig = {
  transpilePackages: ['@schema-barber-shop/components'],
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
};

export default nextConfig;
`;

export const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;

export const POSTCSS = `const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
`;

// Only app/page.tsx is scanned. Components carry no classes (docs/adr/0001), so a class written in
// one gets no CSS.
export const GLOBALS_CSS = `@import "tailwindcss";
`;

export const SITE_GITIGNORE = `node_modules
.next
`;
