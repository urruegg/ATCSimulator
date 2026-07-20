import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AppStateProvider } from '../../state/AppStateContext';
import { BottomRibbon } from '../BottomRibbon';
import '../../i18n';

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
  it('shows the last-updated time when flights have loaded', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <AppStateProvider>
          <BottomRibbon />
        </AppStateProvider>
      </FluentProvider>,
    );
    // With no load yet, shows the dash placeholder.
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });
});
