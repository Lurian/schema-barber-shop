# schema-barber-shop

A barber shop built from page schemas: a component catalog, JSON page documents, and a Node compiler that turns a page into a Next.js app. A GraphQL backend serves the same shop. There is no routing and no theme.

## Start a page

```bash
./start-barber.sh     # barber page on http://localhost:3200
./start-client.sh     # client page on http://localhost:3100
```

Each command checks for Node 24 or later and pnpm, installs whatever is missing, checks that its port is free, compiles the page, installs the generated app, and starts `next dev`. The two use separate output folders (`site-barber/`, `site-client/`), so both can run at once. Set `PORT` to use another port: `PORT=4100 ./start-client.sh`.

## Compile a page

The commands above wrap the compiler, which you can also run directly after `pnpm install`:

```bash
pnpm compile -- --page pages/barber.json                        # writes site/
pnpm compile -- --page pages/barber.json --out site-barber      # writes site-barber/
pnpm serve -- --page pages/client.json --out site-client --port 3100
```

`compile` only writes the Next.js app; `serve` also installs it and starts `next dev`. `--out` names the output folder, which must sit directly inside the project; it defaults to `site/`. One folder holds one page, so compiling another page into the same folder replaces it on screen. The compiler stops with a list of every problem in the page if it finds any.

## How it fits together

```text
pages/client.json ─┐
                   ├─> compiler ─> site/app/page.tsx ─> imports @schema-barber-shop/components
catalog.json ──────┘   parse → validate → emit
```

The compiler reads one page document and `components/catalog.json`, rejects the page if anything is wrong, and writes `site/`, a Next.js app with a single `app/page.tsx`. That file is the page as JSX: one catalog component per element, props as attributes, and every class resolved from the page's swatches. `app/layout.tsx` is only the document shell Next.js requires.

The components hold mocked shop data in the browser. The backend in `backend/` serves the same domain over GraphQL, but the site does not call it yet.

## Pages

Both pages are staff screens for the same shop, working on the same mocked barbers, clients, and bookings. They are built from the same parts and mirror each other; the difference is who the page is about.

### Clients (`pages/client.json`)

For front-desk staff booking on behalf of a client.

- **Content, top to bottom:** a title and intro, the list of clients with their emails, the selected client's bookings, and an "Add booking" button.
- **Actions:**
  - select a client;
  - cancel one of their bookings;
  - open "View" on a booking to see every booking of that booking's barber;
  - open "Add booking" to choose a barber, a date, and a free 30-minute slot, then confirm.
- **Structure:** `ClientRoot` holds the selected client, so the bookings list and the add-booking drawer act on that client. "Add booking" stays disabled until a client is selected. The "View" panel uses `ScopeBarber`.

### Barbers (`pages/barber.json`)

For a barber, or the shop manager, looking after a barber's week.

- **Content, top to bottom:** a title and intro, the list of barbers with the days they work, the selected barber's bookings, and an "Edit hours" button.
- **Actions:**
  - select a barber;
  - cancel one of their bookings;
  - open "View" on a booking to see every booking of that booking's client;
  - open "Edit hours" to remove a working range or add one (weekday, start, end). Overlapping or reversed ranges are refused with a message.
- **Structure:** `BarberRoot` holds the selected barber, so the bookings list and the hours drawer act on that barber. "Edit hours" stays disabled until a barber is selected. The "View" panel uses `ScopeClient`.

Changes on one page are not seen by the other: each page is compiled on its own and keeps its state in the browser, and neither calls the backend.

## Page document

| Field | Meaning |
| :-- | :-- |
| `name` | Becomes the page component's name: `client` → `ClientPage` |
| `root` | Id of the top element |
| `elements` | Id → element. An element has a `type` (a catalog name), `props` (string, number, or boolean literals), `children` (element ids), and `style` (Tailwind classes and `$swatch` tokens) |
| `styles` | Component type → named swatches; see [Styling](#styling) |
| `metadata` | `title.default` and `description`, written into `app/layout.tsx` |

Any other field, in the page or in an element, is rejected. The compiler reports every problem at once: unknown types, props not in the component's schema, missing or repeated children, cycles, unreachable elements, dangling `$` tokens, and components placed outside their provider.

A prop named `children` with a string value is label text, as on `DrawerTrigger`. Element `children` may only be nested in a component whose catalog entry sets `acceptsChildren`.

## Composition

Pages are assembled in the document, not inside components ([ADR 0002](docs/adr/0002-components-compose-in-the-schema.md)). Roots hold state and render nothing; small components read that state from context and are placed freely. The compiler checks that every component sits under a provider of the context it requires:

| Context | Provided by | Required by |
| :-- | :-- | :-- |
| `shop` | `ShopRoot` | `ClientRoot`, `BarberRoot`, `BookingList` |
| `client` | `ClientRoot` | `ClientPicker`, `AddBookingDrawer` |
| `barber` | `BarberRoot` | `BarberSelect`, `EditHoursDrawer` |
| `bookingRow` | `BookingList`, once per booking | `ClientName`, `BarberName`, `BookingLabel`, `BookingTime`, `CancelButton`, `ScopeClient`, `ScopeBarber` |
| `bookingDraft` | `AddBookingDrawer` | `BookingClient`, `BookingBarber`, `BookingDate`, `BookingSlot`, `ConfirmBooking` |
| `hoursDraft` | `EditHoursDrawer` | `HoursBarber`, `HoursList`, `HoursWeekday`, `HoursStart`, `HoursEnd`, `AddHours` |
| `drawer` | `Drawer`, `AddBookingDrawer`, `EditHoursDrawer` | `DrawerTrigger`, `DrawerPortal`, `DrawerBackdrop`, `DrawerViewport`, `DrawerPopup`, `DrawerTitle`, `DrawerClose` |

`Container` and `Text` need no context.

`BookingList` lists every booking under `ShopRoot`, the selected client's inside `ClientRoot`, and the selected barber's inside `BarberRoot`. Its children are the row, repeated per booking. Inside a row, `ScopeClient` or `ScopeBarber` points a nested `BookingList` at that row's client or barber.

A side panel is composed from parts: a root holding the open state (`Drawer`, or `AddBookingDrawer` / `EditHoursDrawer`, which also carry a draft), with `DrawerTrigger` and `DrawerPortal` inside it, `DrawerBackdrop` and `DrawerViewport` inside the portal, and `DrawerPopup` inside the viewport. The viewport positions the panel and handles swipe and touch scroll locking. The popup is portaled out of the trigger's subtree, so it is a page element of its own; that is what lets its swatch reach it.

## Styling

Components carry no CSS and no Tailwind classes ([ADR 0001](docs/adr/0001-schema-owns-component-css.md)). Each renders `data-ui-*` hooks and forwards `className`; every visual class comes from the page document.

The page's `styles` key is a map of component type to named swatches, each a list of Tailwind classes. The `base` swatch of a type applies to every element of that type. A `$name` token, in a swatch or in an element's `style`, pulls in another swatch of the same type. The compiler flattens `base` plus the element's `style` into one `className`:

```json
"styles": {
  "DrawerTrigger": {
    "base": ["inline-flex", "rounded-md", "text-sm"],
    "primary": ["bg-neutral-900", "px-4", "py-2", "text-white"]
  }
},
"elements": {
  "add-trigger": { "type": "DrawerTrigger", "props": { "children": "Add booking" }, "style": ["$primary", "mt-2"] }
}
```

A component's root carries `data-ui-{component}`; a part inside it carries `data-ui-{component}-{part}`. Swatches reach parts and states with Tailwind variants, never with classes written in the component: `**:data-ui-booking-slot-option:rounded-md` styles every option inside a `BookingSlot`, `**:data-ui-booking-slot-option:aria-pressed:bg-neutral-900` styles the selected one, and `data-ui-booking-list-empty:text-neutral-500` styles a `BookingList` when it renders its empty message. The compiler rejects a `$` token that no swatch defines, a `styles` key that names no catalog component, and swatch cycles.

Only the generated `app/page.tsx` is scanned by Tailwind, so a class written inside a component gets no CSS. Swatches are per page, so the two pages each declare the ones they use.

## Source layout

- `pages/` — the page documents you can compile: `client.json` and `barber.json`
- `components/`
  - `catalog.json` — the contract: every component the compiler accepts, its props, its contexts, and a `guideline` for authors
  - `src/index.ts` — exports every catalog component by its catalog name
  - `src/shop/` — the roots (`ShopRoot`, `ClientRoot`, `BarberRoot`), their contexts, the pickers, and the booking and hours drafts with their fields
  - `src/booking/` — `BookingList` and the row components, plus `scheduling.ts` (slot and hours rules) and `mock-data.ts` (the same records as `backend/data/seed.json`)
  - `src/drawer/` — `Drawer`, its parts, and the shell the draft drawers reuse
  - `src/container.tsx`, `src/text.tsx` — layout box and text
- `compiler/src/`
  - `cli.ts` — the `compile` and `serve` commands
  - `schema.ts` — reads the page and the catalog, and rejects malformed JSON shapes
  - `validate.ts` — checks the page against the catalog: types, props, tree, contexts, swatches
  - `styles.ts` — swatch resolution and swatch checks
  - `emit.ts`, `templates.ts` — writes the Next.js app
- `compiler/test/` — compiler tests, including both real pages and a catalog-to-exports check
- `backend/` — a GraphQL server for a barber shop, backed by a JSON file
- `docs/adr/` — decisions about this project
- `start-barber.sh`, `start-client.sh` — start one page each; both call `scripts/start-page.sh`
- `site/`, `site-barber/`, `site-client/` — generated apps, not committed

## Adding a component

1. Write it in `components/src`. Render a `data-ui-{kebab-name}` hook on the root and on each part a page might style, forward `className` to the root, and write no classes. Read shared state from a context rather than taking it as props.
2. Add an entry to `components/catalog.json` under the component's name: `importPath`, `acceptsChildren`, its props in `schema`, `requiresContext` / `providesContext` if it reads or provides a context, and a `guideline` telling authors where it goes.
3. Export it by that name from `components/src/index.ts`.
4. Place it in a page and give it swatches in that page's `styles`.

`pnpm test` compiles both pages, so a catalog entry that disagrees with a page fails there, and it fails when the catalog and the exports of `index.ts` differ.

## Checks

The compiler needs Node 24 or later, which runs its TypeScript sources directly. `pnpm typecheck` checks the compiler and the components, and `pnpm lint` runs Biome with the rules in `biome.json` (`pnpm lint:fix` applies its fixes).

## Testing

`pnpm test` runs all three suites; `pnpm coverage` runs them with coverage.

- `compiler/test/` — `node:test`. Parsing and validation errors, swatch resolution, emitted JSX for both real pages, file output, and the CLI run as a child process.
- `components/test/` — Vitest with jsdom and Testing Library. `scheduling.test.ts` uses the same cases as `backend/test/scheduling.test.js`, so the two copies of the slot and hours rules cannot drift apart unnoticed. `shop.test.tsx` renders the page compositions and drives them: selecting, scoping, cancelling, booking through the drawer, and editing hours.
- `backend/test/` — `node:test` against an in-process Apollo server and a temporary store file.

## Backend

`pnpm backend` serves GraphQL with Apollo Server at <http://localhost:4000/graphql> (Apollo Sandbox opens in a browser).

The domain is a barber shop. Barbers set weekly working hours; clients pick a barber and a start time to book a 30-minute haircut. Every time value is a plain wall-clock string with no timezone: `YYYY-MM-DD`, `HH:MM`, or `YYYY-MM-DDTHH:MM`.

Data lives in `backend/data/store.json`. The file is created from `backend/data/seed.json` on first start and is not committed, so deleting it resets the shop. Writes are queued and land through a rename, so an interrupted write leaves the previous file intact.

The seed holds five barbers, 146 clients, and 726 bookings over four weeks, from Monday 28 September to Sunday 25 October 2026. Each barber is 50–60% booked over that window. A client sees a given barber at most once a week, though they may see several barbers in the same week, and is never booked with two barbers at the same time. Those two rules shape the seed only; `bookHaircut` does not enforce them. `backend/scripts/generate-seed.js` writes the file from a fixed random seed; run `pnpm --filter @schema-barber-shop/backend seed` after changing it. `backend/test/seed.test.js` checks those rules, that the committed file is what the script writes, and that the site's mock data (`components/src/booking/mock-data.ts`) is a subset of it. The API tests use the smaller `backend/test/fixtures/seed.json`.

```graphql
query {
  barbers { id name hours { weekday start end } }
  availableSlots(barberId: "barber-marco", date: "2026-10-05")
}

mutation {
  bookHaircut(barberId: "barber-marco", clientId: "client-grace", startsAt: "2026-10-05T09:00") {
    id startsAt endsAt
  }
}
```

Relationships go both ways: `barber.bookings`, `booking.client`, `client.bookings`, and `booking.barber` can be followed in a loop.

Run the backend tests alone with `pnpm --filter @schema-barber-shop/backend test`.
