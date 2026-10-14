import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import {
  AddBookingDrawer,
  AddHours,
  BarberName,
  BarberRoot,
  BarberSelect,
  BookingBarber,
  BookingClient,
  BookingDate,
  BookingLabel,
  BookingList,
  BookingSlot,
  BookingTime,
  CancelButton,
  ClientName,
  ClientPicker,
  ClientRoot,
  ConfirmBooking,
  Container,
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  DrawerViewport,
  EditHoursDrawer,
  HoursBarber,
  HoursEnd,
  HoursList,
  HoursStart,
  HoursWeekday,
  ScopeBarber,
  ScopeClient,
  ShopRoot,
  Text,
} from '../src';

afterEach(cleanup);

function Row() {
  return (
    <div data-testid="row">
      <BookingLabel>
        <ClientName />
        <Text> with </Text>
        <BarberName />
      </BookingLabel>
      <Container>
        , <BookingTime />
      </Container>
      <CancelButton>Cancel</CancelButton>
    </div>
  );
}

function rows(container: HTMLElement = document.body) {
  return within(container)
    .queryAllByTestId('row')
    .map((row) => row.textContent?.replace('Cancel', '').trim());
}

function choose(name: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
}

describe('BookingList', () => {
  test('directly under ShopRoot it lists every booking, oldest first', () => {
    render(
      <ShopRoot>
        <BookingList>
          <Row />
        </BookingList>
      </ShopRoot>,
    );

    expect(rows()).toEqual([
      'Ada Lovelace with Marco, Tue, 29 Sept 2026, 10:00–10:30',
      'Grace Hopper with Lena, Tue, 29 Sept 2026, 14:00–14:30',
      'Grace Hopper with Marco, Wed, 30 Sept 2026, 15:00–15:30',
      'Ada Lovelace with Lena, Thu, 1 Oct 2026, 18:00–18:30',
      'Ada Lovelace with Marco, Fri, 9 Oct 2026, 11:00–11:30',
      'Grace Hopper with Lena, Sat, 10 Oct 2026, 09:00–09:30',
    ]);
  });

  test('inside ClientRoot it waits for a selection, then lists that client’s bookings', () => {
    render(
      <ShopRoot>
        <ClientRoot>
          <ClientPicker />
          <BookingList emptyText="No bookings.">
            <Row />
          </BookingList>
        </ClientRoot>
      </ShopRoot>,
    );

    expect(screen.getByText('Select a client to see their bookings.')).toBeTruthy();

    choose('Grace Hopper');
    expect(rows()).toHaveLength(3);
    expect(rows().every((row) => row?.startsWith('Grace Hopper'))).toBe(true);

    for (const button of screen.getAllByRole('button', { name: 'Cancel' })) {
      fireEvent.click(button);
    }
    expect(screen.getByText('No bookings.')).toBeTruthy();
  });

  test('cancelling a row removes only that booking', () => {
    render(
      <ShopRoot>
        <BarberRoot>
          <BarberSelect />
          <BookingList>
            <Row />
          </BookingList>
        </BarberRoot>
      </ShopRoot>,
    );

    choose('Lena');
    const [first] = screen.getAllByRole('button', { name: 'Cancel' });
    fireEvent.click(first);

    expect(rows()).toEqual([
      'Ada Lovelace with Lena, Thu, 1 Oct 2026, 18:00–18:30',
      'Grace Hopper with Lena, Sat, 10 Oct 2026, 09:00–09:30',
    ]);
  });

  test('ScopeClient points a nested list at the row’s client, and each row opens its own drawer', async () => {
    render(
      <ShopRoot>
        <BarberRoot>
          <BarberSelect />
          <BookingList>
            <Row />
            <Drawer>
              <DrawerTrigger>View</DrawerTrigger>
              <DrawerPortal>
                <DrawerViewport>
                  <DrawerPopup>
                    <ScopeClient>
                      <BookingList>
                        <Row />
                      </BookingList>
                    </ScopeClient>
                  </DrawerPopup>
                </DrawerViewport>
              </DrawerPortal>
            </Drawer>
          </BookingList>
        </BarberRoot>
      </ShopRoot>,
    );

    choose('Lena');
    // Lena's second booking is Ada's; the panel lists all of Ada's bookings, with either barber.
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[1]);

    const popup = await waitFor(() => {
      const element = document.querySelector<HTMLElement>('[data-ui-drawer-popup]');
      expect(element).toBeTruthy();
      return element as HTMLElement;
    });
    expect(document.querySelectorAll('[data-ui-drawer-popup]')).toHaveLength(1);
    expect(rows(popup)).toEqual([
      'Ada Lovelace with Marco, Tue, 29 Sept 2026, 10:00–10:30',
      'Ada Lovelace with Lena, Thu, 1 Oct 2026, 18:00–18:30',
      'Ada Lovelace with Marco, Fri, 9 Oct 2026, 11:00–11:30',
    ]);
  });
});

describe('AddBookingDrawer', () => {
  function renderClientPage() {
    render(
      <ShopRoot>
        <ClientRoot>
          <ClientPicker />
          <BookingList>
            <Row />
          </BookingList>
          <AddBookingDrawer>
            <DrawerTrigger>Add booking</DrawerTrigger>
            <DrawerPortal>
              <DrawerBackdrop />
              <DrawerViewport>
                <DrawerPopup>
                  <DrawerTitle>Add booking</DrawerTitle>
                  <DrawerClose>Close</DrawerClose>
                  <BookingClient />
                  <BookingBarber />
                  <BookingDate />
                  <BookingSlot />
                  <ConfirmBooking>Confirm booking</ConfirmBooking>
                </DrawerPopup>
              </DrawerViewport>
            </DrawerPortal>
          </AddBookingDrawer>
        </ClientRoot>
      </ShopRoot>,
    );
  }

  async function openDrawer() {
    fireEvent.click(screen.getByRole('button', { name: 'Add booking' }));
    await screen.findByRole('button', { name: 'Confirm booking' });
  }

  function setDate(date: string) {
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: date } });
  }

  test('the trigger stays disabled until a client is selected', () => {
    renderClientPage();
    expect(screen.getByRole('button', { name: 'Add booking' }).hasAttribute('disabled')).toBe(true);

    choose('Ada Lovelace');
    expect(screen.getByRole('button', { name: 'Add booking' }).hasAttribute('disabled')).toBe(false);
  });

  test('booking a free slot adds it to the client’s list and closes the drawer', async () => {
    renderClientPage();
    choose('Ada Lovelace');
    await openDrawer();

    expect(screen.getByText('Booking for Ada Lovelace.')).toBeTruthy();
    expect(screen.getByText('Choose a barber first.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm booking' }).hasAttribute('disabled')).toBe(true);

    choose('Marco');
    setDate('2026-10-05');
    fireEvent.click(screen.getByRole('button', { name: '09:00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm booking' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirm booking' })).toBeNull());
    expect(rows()).toContain('Ada Lovelace with Marco, Mon, 5 Oct 2026, 09:00–09:30');
  });

  test('taken slots are disabled and a day off shows no slots', async () => {
    renderClientPage();
    choose('Grace Hopper');
    await openDrawer();
    choose('Marco');

    setDate('2026-09-29');
    expect(screen.getByRole('button', { name: '10:00' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '10:30' }).hasAttribute('disabled')).toBe(false);

    setDate('2026-10-04');
    expect(screen.getByText('Marco does not work on this day.')).toBeTruthy();
  });

  test('the close button dismisses the drawer without booking', async () => {
    renderClientPage();
    choose('Ada Lovelace');
    await openDrawer();
    expect(document.querySelector('[data-ui-drawer-backdrop]')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Add booking' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirm booking' })).toBeNull());
    expect(rows()).toHaveLength(3);
  });

  test('changing the date clears the chosen slot', async () => {
    renderClientPage();
    choose('Ada Lovelace');
    await openDrawer();
    choose('Marco');
    setDate('2026-10-05');
    fireEvent.click(screen.getByRole('button', { name: '09:00' }));
    expect(screen.getByRole('button', { name: 'Confirm booking' }).hasAttribute('disabled')).toBe(false);

    setDate('2026-10-06');
    expect(screen.getByRole('button', { name: 'Confirm booking' }).hasAttribute('disabled')).toBe(true);
  });
});

describe('EditHoursDrawer', () => {
  test('adds a range to the selected barber and reports an overlap', async () => {
    render(
      <ShopRoot>
        <BarberRoot>
          <BarberSelect />
          <EditHoursDrawer>
            <DrawerTrigger>Edit hours</DrawerTrigger>
            <DrawerPortal>
              <DrawerViewport>
                <DrawerPopup>
                  <HoursBarber />
                  <HoursList />
                  <HoursWeekday />
                  <HoursStart />
                  <HoursEnd />
                  <AddHours>Add hours</AddHours>
                </DrawerPopup>
              </DrawerViewport>
            </DrawerPortal>
          </EditHoursDrawer>
        </BarberRoot>
      </ShopRoot>,
    );

    expect(screen.getByRole('button', { name: 'Edit hours' }).hasAttribute('disabled')).toBe(true);
    choose('Lena');
    fireEvent.click(screen.getByRole('button', { name: 'Edit hours' }));
    await screen.findByRole('button', { name: 'Add hours' });
    expect(screen.getByText("Editing Lena's hours.")).toBeTruthy();

    const ranges = () => [...document.querySelectorAll('[data-ui-hours-list-range]')].map((range) => range.textContent);
    expect(ranges()).toEqual(['Tue12:00–20:00', 'Thu12:00–20:00', 'Sat09:00–15:00']);

    fireEvent.click(screen.getByRole('button', { name: 'Add hours' }));
    expect(ranges()[0]).toBe('Mon09:00–12:00');
    // The open drawer hides the page from accessibility queries, so read the selected option by its hook.
    const selected = document.querySelector('[data-ui-barber-select-option][aria-pressed="true"]');
    expect(selected?.textContent).toBe('LenaMon · Tue · Thu · Sat');

    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '13:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add hours' }));
    expect(screen.getByText('hours on Mon overlap')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(ranges()).toEqual(['Tue12:00–20:00', 'Thu12:00–20:00', 'Sat09:00–15:00']);
  });
});

describe('scopes and placement', () => {
  test('ScopeBarber points a nested list at the row’s barber', () => {
    render(
      <ShopRoot>
        <ClientRoot>
          <ClientPicker />
          <BookingList>
            <ScopeBarber>
              <div data-testid="scoped">
                <BookingList>
                  <Row />
                </BookingList>
              </div>
            </ScopeBarber>
          </BookingList>
        </ClientRoot>
      </ShopRoot>,
    );

    choose('Grace Hopper');
    // Grace's first booking is with Lena, so the first nested list holds every Lena booking.
    const [first] = screen.getAllByTestId('scoped');
    expect(rows(first)).toEqual([
      'Grace Hopper with Lena, Tue, 29 Sept 2026, 14:00–14:30',
      'Ada Lovelace with Lena, Thu, 1 Oct 2026, 18:00–18:30',
      'Grace Hopper with Lena, Sat, 10 Oct 2026, 09:00–09:30',
    ]);
  });

  test('a component outside its provider fails with the provider’s name', () => {
    const quiet = console.error;
    console.error = () => {};
    try {
      expect(() => render(<BookingList />)).toThrow('This component must be placed inside ShopRoot.');
      expect(() => render(<ClientName />)).toThrow('This component must be placed inside BookingList.');
      expect(() =>
        render(
          <ShopRoot>
            <BookingSlot />
          </ShopRoot>,
        ),
      ).toThrow('This component must be placed inside AddBookingDrawer.');
      expect(() => render(<HoursStart />)).toThrow('This component must be placed inside EditHoursDrawer.');
      expect(() => render(<DrawerTrigger />)).toThrow(/must be placed inside Drawer/);
      expect(() =>
        render(
          <ShopRoot>
            <ClientPicker />
          </ShopRoot>,
        ),
      ).toThrow('This component must be placed inside ClientRoot.');
      expect(() =>
        render(
          <ShopRoot>
            <BarberSelect />
          </ShopRoot>,
        ),
      ).toThrow('This component must be placed inside BarberRoot.');
    } finally {
      console.error = quiet;
    }
  });
});
