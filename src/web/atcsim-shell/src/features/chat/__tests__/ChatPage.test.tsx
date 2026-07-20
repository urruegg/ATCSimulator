import { describe, expect, it, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ChatPage } from '../ChatPage';
import { AppStateProvider } from '../../../state/AppStateContext';
import '../../../i18n';

// Deterministic transcript: one ATC line, one Pilot line.
vi.mock('../useLiveTranscript', () => ({
  useLiveTranscript: () => [
    { role: 'atc', text: 'Swiss 123 turn right heading 270', ts: 1 },
    { role: 'pilot', text: 'Turning right heading 270, Swiss 123', ts: 2 },
  ],
}));

// Keep MicControl's voice client inert so the component mounts cleanly.
const { startVoiceSessionMock } = vi.hoisted(() => ({
  startVoiceSessionMock: vi.fn(),
}));

vi.mock('../../../voice/voiceLiveClient', () => ({
  startVoiceSession: startVoiceSessionMock,
}));

vi.mock('../../simulator/scenarioApi', () => ({
  fetchScenarios: vi.fn().mockResolvedValue([]),
  fetchCapabilities: vi.fn().mockResolvedValue({ liveAvailable: false, mockAvailable: true }),
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

beforeEach(() => {
  startVoiceSessionMock.mockReset();
  startVoiceSessionMock.mockResolvedValue({ stop: vi.fn() });
});

function renderChatPage() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <AppStateProvider>
        <ChatPage />
      </AppStateProvider>
    </FluentProvider>,
  );
}

describe('ChatPage', () => {
  it('renders both column headers (ATC and Pilot)', () => {
    renderChatPage();
    expect(screen.getByText('ATC')).toBeInTheDocument();
    expect(screen.getByText('Pilot')).toBeInTheDocument();
  });

  it('renders the ATC transcript line and the Pilot transcript line', () => {
    renderChatPage();
    expect(screen.getByText('Swiss 123 turn right heading 270')).toBeInTheDocument();
    expect(screen.getByText('Turning right heading 270, Swiss 123')).toBeInTheDocument();
  });

  it('renders the synthetic-voice disclosure from MicControl', () => {
    renderChatPage();
    // SelectedFlightHeader also uses role="note" (advisory) when no flight is
    // selected, so disambiguate by the disclosure text.
    const notes = screen.getAllByRole('note');
    const disclosure = notes.find((n) =>
      n.textContent?.includes('The virtual pilot voice is synthetic (AI-generated).'),
    );
    expect(disclosure).toBeDefined();
  });
});
