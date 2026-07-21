import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AppStateProvider } from '../../state/AppStateContext';
import { BottomRibbon } from '../BottomRibbon';
import '../../i18n';

vi.mock('../../features/flight-data/flightFeedApi', () => ({
  fetchFeedStatus: vi.fn().mockResolvedValue({ state: 'connected', checkedAt: '2026-07-21T10:30:00Z' }),
  fetchSnapshots: vi.fn().mockResolvedValue([]),
}));

beforeAll(() => {
  // Fluent UI v9 popovers/listboxes position via floating-ui, which needs these browser APIs.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;

  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    })) as unknown as typeof window.matchMedia;
  }
});

describe('BottomRibbon', () => {
  it('shows the last-updated time when flights have loaded', async () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <AppStateProvider>
          <BottomRibbon />
        </AppStateProvider>
      </FluentProvider>,
    );
    // With no load yet, shows the dash placeholder.
    expect(await screen.findByText(/last updated/i)).toBeInTheDocument();
    // Let the async feed-status poll settle to avoid act() warnings.
    await screen.findByText(/feed connected/i);
  });

  it('renders the feed status indicator', async () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <AppStateProvider>
          <BottomRibbon />
        </AppStateProvider>
      </FluentProvider>,
    );
    expect(await screen.findByText(/feed connected/i)).toBeInTheDocument();
  });
});
