import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AppStateProvider } from '../../../state/AppStateContext';
import { AircraftMapPage } from '../AircraftMapPage';
import '../../../i18n';

// Azure Maps needs WebGL + a real DOM host, neither of which exists under
// jsdom, so the SDK (and its CSS side-effect import) are mocked.
vi.mock('azure-maps-control', () => ({
  Map: vi.fn(() => ({
    events: { add: vi.fn() },
    markers: { add: vi.fn(), clear: vi.fn() },
    dispose: vi.fn(),
  })),
  HtmlMarker: vi.fn(() => ({})),
  control: {},
  data: {},
}));
vi.mock('azure-maps-control/dist/atlas.min.css', () => ({}));

// Keep the page deterministic: no live polling in the test.
vi.mock('../useFlightPolling', () => ({
  useFlightPolling: () => ({ aircraft: [], error: null }),
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

function renderPage() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <AppStateProvider>
        <AircraftMapPage />
      </AppStateProvider>
    </FluentProvider>,
  );
}

describe('AircraftMapPage', () => {
  it('mounts the Azure Maps host element', () => {
    const { container } = renderPage();
    expect(container.querySelector('#azure-map-host')).toBeInTheDocument();
  });

  it('shows the advisory selected-flight header while nothing is selected', () => {
    renderPage();
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('renders the refresh-cadence control', () => {
    renderPage();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});