import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { FeedStatusIndicator } from '../FeedStatusIndicator';
import '../../../i18n';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {},
      dispatchEvent() { return false; },
    })) as unknown as typeof window.matchMedia;
  }
});

function renderWith(state: 'connected' | 'no_credit' | 'offline') {
  return render(
    <FluentProvider theme={webLightTheme}>
      <FeedStatusIndicator state={state} />
    </FluentProvider>,
  );
}

describe('FeedStatusIndicator', () => {
  it('renders the connected label', () => {
    renderWith('connected');
    expect(screen.getByText(/feed connected/i)).toBeInTheDocument();
  });

  it('renders the no-credit label', () => {
    renderWith('no_credit');
    expect(screen.getByText(/no fr24 credit/i)).toBeInTheDocument();
  });

  it('renders the offline label', () => {
    renderWith('offline');
    expect(screen.getByText(/feed offline/i)).toBeInTheDocument();
  });

  it('exposes an accessible status role', () => {
    renderWith('connected');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
