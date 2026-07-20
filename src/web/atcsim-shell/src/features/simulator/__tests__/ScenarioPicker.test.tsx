import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AppStateProvider } from '../../../state/AppStateContext';
import { ScenarioPicker } from '../ScenarioPicker';
import '../../../i18n';

vi.mock('../scenarioApi', () => ({
  fetchScenarios: vi.fn().mockResolvedValue([
    { id: 'EX-01', title: { en: 'Instruction to airliner' }, aircraftClass: 'airliner', expectedCommands: [] },
  ]),
}));

beforeAll(() => {
  // Fluent listbox needs these browser APIs (copy from BottomRibbon.test.tsx).
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } } as unknown as typeof IntersectionObserver;
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } })) as unknown as typeof window.matchMedia;
  }
});

describe('ScenarioPicker', () => {
  it('renders a searchable combobox labelled Scenario', async () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <AppStateProvider>
          <ScenarioPicker voiceBaseUrl="" />
        </AppStateProvider>
      </FluentProvider>,
    );
    expect(await screen.findByRole('combobox', { name: /scenario/i })).toBeInTheDocument();
  });
});
