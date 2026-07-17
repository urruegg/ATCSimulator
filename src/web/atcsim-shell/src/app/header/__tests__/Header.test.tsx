import { render, screen, fireEvent } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AppStateProvider } from '../../../state/AppStateContext';
import { Header } from '../../Header';

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: { logoutRedirect: vi.fn(), loginRedirect: vi.fn() },
    accounts: [{ name: 'U. Ruegg', username: 'u@x' }],
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

function renderHeader() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <AppStateProvider>
        <Header />
      </AppStateProvider>
    </FluentProvider>,
  );
}

describe('Header', () => {
  it('renders the brand logo', () => {
    renderHeader();
    const logo = screen.getByAltText('ATCSimulator');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/brand/atcsimulator-icon.svg');
  });

  it('airport control lists Swiss airports as "<IATA> <Name>"', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('combobox', { name: /airport/i }));

    expect(screen.getByRole('option', { name: 'ZRH Zurich Airport' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'GVA Geneva Airport' })).toBeInTheDocument();
  });

  it('user menu shows the sign-out and switch-account items when opened', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /U\. Ruegg/ }));

    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(2);
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
  });
});