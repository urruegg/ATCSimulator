import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { AppStateProvider } from '../../state/AppStateContext';
import { AppShell } from '../AppShell';
import i18n from '../../i18n';

// Header -> UserMenu reads MSAL accounts; the shell itself needs no live auth.
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: { logoutRedirect: vi.fn(), loginRedirect: vi.fn() },
    accounts: [{ name: 'U. Ruegg', username: 'u@x' }],
  }),
  useIsAuthenticated: () => true,
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

function renderShell() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <div>map-body</div> },
          { path: 'chat', element: <div>chat-body</div> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );

  return render(
    <FluentProvider theme={webLightTheme}>
      <AppStateProvider>
        <RouterProvider router={router} />
      </AppStateProvider>
    </FluentProvider>,
  );
}

describe('AppShell', () => {
  it('exposes rail items labelled per i18n for Map and Chat', () => {
    renderShell();
    expect(
      screen.getByRole('link', { name: i18n.t('nav.map') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: i18n.t('nav.chat') }),
    ).toBeInTheDocument();
  });

  it('renders a full-height shell root (min-height: 100vh)', () => {
    renderShell();
    expect(screen.getByTestId('app-shell')).toHaveStyle({ minHeight: '100vh' });
  });

  it('renders the active route body through the Outlet', () => {
    renderShell();
    expect(screen.getByText('map-body')).toBeInTheDocument();
  });
});