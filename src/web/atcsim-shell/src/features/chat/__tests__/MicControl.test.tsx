import { describe, expect, it, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { useEffect } from 'react';
import { MicControl } from '../MicControl';
import { AppStateProvider, useAppState } from '../../../state/AppStateContext';
import '../../../i18n';

const { startVoiceSessionMock, stopMock } = vi.hoisted(() => ({
  startVoiceSessionMock: vi.fn(),
  stopMock: vi.fn(),
}));

vi.mock('../../../voice/voiceLiveClient', () => ({
  startVoiceSession: startVoiceSessionMock,
}));

vi.mock('../../simulator/scenarioApi', () => ({
  fetchCapabilities: vi.fn().mockResolvedValue({ liveAvailable: true, mockAvailable: true }),
  fetchSpeechToken: vi.fn().mockResolvedValue({ token: 't', region: 'switzerlandnorth' }),
  postScenarioTurn: vi.fn().mockResolvedValue({
    accepted: true,
    command: 'SET_HEADING',
    readBackText: 'ok',
    phraseologyFlags: [],
  }),
}));

vi.mock('../speechClient', () => ({
  createSpeechClient: vi.fn(() => ({
    recognizeOnce: vi.fn().mockResolvedValue('heading 290'),
    speak: vi.fn().mockResolvedValue(undefined),
  })),
}));

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
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
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

function SetSelections() {
  const { setSelectedFlight, setSelectedScenario } = useAppState();
  useEffect(() => {
    setSelectedFlight({
      callsign: 'SWR1',
      aircraftType: 'A320',
      latitude: 47,
      longitude: 8,
      altitudeFt: 10000,
      headingDeg: 90,
      groundSpeedKt: 300,
    });
    setSelectedScenario({
      id: 'EX-01',
      title: { en: 'x' },
      aircraftClass: 'airliner',
      expectedCommands: [],
    });
  }, [setSelectedFlight, setSelectedScenario]);
  return null;
}

function renderWithProviders(withSelections = false) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <AppStateProvider>
        {withSelections && <SetSelections />}
        <MicControl brokerBaseUrl="https://voice" />
      </AppStateProvider>
    </FluentProvider>,
  );
}

beforeEach(() => {
  stopMock.mockClear();
  startVoiceSessionMock.mockReset();
  startVoiceSessionMock.mockResolvedValue({ stop: stopMock });
});

describe('MicControl', () => {
  it('renders the synthetic-voice disclosure on mount', () => {
    renderWithProviders();
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('The virtual pilot voice is synthetic (AI-generated).');
  });

  it('renders the talk button', () => {
    renderWithProviders();
    expect(screen.getByRole('button', { name: /Talk/i })).toBeInTheDocument();
  });

  it('disables the talk button until a flight and scenario are selected', () => {
    renderWithProviders(false);
    const button = screen.getByRole('button', { name: /Talk/i });
    expect(button).toBeDisabled();
  });

  it('with flight+scenario selected and live engine enabled: toggles live session', async () => {
    renderWithProviders(true);

    // Wait for the Switch to become enabled (capabilities resolve)
    const switchControl = await waitFor(() => {
      const sw = screen.getByRole('switch', { name: /Live voice engine/i });
      expect(sw).not.toBeDisabled();
      return sw;
    });

    // Toggle live engine on
    fireEvent.click(switchControl);

    // Click Talk button
    const button = screen.getByRole('button', { name: /Talk/i });
    fireEvent.click(button);

    await screen.findByText('connected');
    expect(startVoiceSessionMock).toHaveBeenCalledTimes(1);
    expect(startVoiceSessionMock).toHaveBeenCalledWith('https://voice');

    // Click again to stop
    fireEvent.click(button);
    await screen.findByText('idle');
    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  it('stops an active live session when the engine is switched back to mock', async () => {
    renderWithProviders(true);

    const switchControl = await waitFor(() => {
      const sw = screen.getByRole('switch', { name: /Live voice engine/i });
      expect(sw).not.toBeDisabled();
      return sw;
    });

    // Turn live on and start a session
    fireEvent.click(switchControl);
    const button = screen.getByRole('button', { name: /Talk/i });
    fireEvent.click(button);
    await screen.findByText('connected');
    expect(startVoiceSessionMock).toHaveBeenCalledTimes(1);

    // Flip the engine back to mock while the session is active
    fireEvent.click(switchControl);
    await screen.findByText('idle');
    expect(stopMock).toHaveBeenCalledTimes(1);
  });
});
