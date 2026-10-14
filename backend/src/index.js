import { startStandaloneServer } from '@apollo/server/standalone';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4000);
const server = createApp();
const { url } = await startStandaloneServer(server, { listen: { port } });

console.log(`@schema-barber-shop/backend GraphQL at ${url}`);
