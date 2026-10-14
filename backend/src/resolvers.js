import { randomUUID } from 'node:crypto';
import { availableSlots, badInput, notFound, parseDate, reserveSlot, validateHours } from './scheduling.js';

export function createResolvers(store) {
  return {
    Query: {
      barbers: async () => (await store.read()).barbers,
      barber: async (_parent, { id }) => (await store.read()).barbers.find((barber) => barber.id === id) ?? null,
      clients: async () => (await store.read()).clients,
      client: async (_parent, { id }) => (await store.read()).clients.find((client) => client.id === id) ?? null,
      bookings: async (_parent, { barberId, clientId }) => {
        const { bookings } = await store.read();
        return bookings.filter(
          (booking) => (!barberId || booking.barberId === barberId) && (!clientId || booking.clientId === clientId),
        );
      },
      availableSlots: async (_parent, { barberId, date }) => {
        const data = await store.read();
        return availableSlots(requireBarber(data, barberId), parseDate(date), data.bookings);
      },
    },

    Mutation: {
      createBarber: (_parent, { name }) =>
        store.update((data) => {
          const barber = { id: randomUUID(), name: requireText('name', name), hours: [] };
          data.barbers.push(barber);
          return barber;
        }),

      setBarberHours: (_parent, { barberId, hours }) =>
        store.update((data) => {
          const barber = requireBarber(data, barberId);
          barber.hours = validateHours(hours);
          return barber;
        }),

      createClient: (_parent, { name, email }) =>
        store.update((data) => {
          const normalizedEmail = requireText('email', email).toLowerCase();
          if (data.clients.some((client) => client.email === normalizedEmail)) {
            throw badInput(`a client with email ${normalizedEmail} already exists`);
          }
          const client = { id: randomUUID(), name: requireText('name', name), email: normalizedEmail };
          data.clients.push(client);
          return client;
        }),

      bookHaircut: (_parent, { barberId, clientId, startsAt }) =>
        store.update((data) => {
          const barber = requireBarber(data, barberId);
          const client = requireClient(data, clientId);
          const slot = reserveSlot(barber, startsAt, data.bookings);
          const booking = { id: randomUUID(), barberId: barber.id, clientId: client.id, ...slot };
          data.bookings.push(booking);
          return booking;
        }),

      cancelBooking: (_parent, { id }) =>
        store.update((data) => {
          const index = data.bookings.findIndex((booking) => booking.id === id);
          if (index === -1) {
            return false;
          }
          data.bookings.splice(index, 1);
          return true;
        }),
    },

    Barber: {
      bookings: async (barber) => (await store.read()).bookings.filter((booking) => booking.barberId === barber.id),
    },

    Client: {
      bookings: async (client) => (await store.read()).bookings.filter((booking) => booking.clientId === client.id),
    },

    Booking: {
      barber: async (booking) => requireBarber(await store.read(), booking.barberId),
      client: async (booking) => requireClient(await store.read(), booking.clientId),
    },
  };
}

function requireBarber(data, id) {
  const barber = data.barbers.find((candidate) => candidate.id === id);
  if (!barber) {
    throw notFound('barber', id);
  }
  return barber;
}

function requireClient(data, id) {
  const client = data.clients.find((candidate) => candidate.id === id);
  if (!client) {
    throw notFound('client', id);
  }
  return client;
}

function requireText(field, value) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw badInput(`${field} is required`);
  }
  return text;
}
