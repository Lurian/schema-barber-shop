import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApolloServer } from '@apollo/server';
import { createResolvers } from './resolvers.js';
import { createFileStore } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));

export const defaultPaths = {
  storePath: join(here, '..', 'data', 'store.json'),
  seedPath: join(here, '..', 'data', 'seed.json'),
};

export function createApp({ storePath, seedPath } = defaultPaths) {
  const store = createFileStore({ path: storePath, seedPath });
  return new ApolloServer({
    typeDefs: readFileSync(join(here, 'schema.graphql'), 'utf8'),
    resolvers: createResolvers(store),
  });
}
