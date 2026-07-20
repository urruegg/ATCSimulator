import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AppStateProvider } from '../../../state/AppStateContext';
import { AircraftMapPage } from '../AircraftMapPage';
import '../../../i18n';

// Shared camera spies so tests can assert recenter/zoom behaviour.
const { setCamera, getCamera } = vi.hoisted(() => ({
  setCamera: vi.fn(),
  getCamera: vi.fn(() => ({ zoom: 14 })),
}));

// Azure Maps needs WebGL + a real DOM host, neither of which exists under
// jsdom, so the SDK (and its CSS side-effect import) are mocked.
vi.mock('azure-maps-control', () => ({
  Map: vi.fn(() => ({
    events: { add: vi.fn() },
    markers: { add: vi.fn(), clear: vi.fn() },
    setCamera,
    getCamera,
    dispose: vi.fn(),
  })),
  HtmlMarker: vi.fn(() => ({})),
  control: {},
  data: {},
}));
vi.mock('azure-maps-control/dist/atlas.min.css', () => ({}));

// Keep the page deterministic: no live polling in the test.
vi.mock('../useFlightData', () => ({
  useFlightData: () => ({
    aircraft: [],
    error: null,
    loading: false,
    lastUpdated: new Date(),
    refresh: vi.fn(),
  }),
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

  it('renders map controls and recenters to the airport anchor on click', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /recenter/i }));
    expect(setCamera).toHaveBeenCalledWith({ center: [8.54917, 47.46472], zoom: 14 });
  });

  it('renders a refresh flights control', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /refresh flights/i })).toBeInTheDocument();
  });
});