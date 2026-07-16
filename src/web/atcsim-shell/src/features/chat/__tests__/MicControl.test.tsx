import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { MicControl } from '../MicControl';
import '../../../i18n';

const { startVoiceSessionMock, stopMock } = vi.hoisted(() => ({
  startVoiceSessionMock: vi.fn(),
  stopMock: vi.fn(),
}));

vi.mock('../../../voice/voiceLiveClient', () => ({
  startVoiceSession: startVoiceSessionMock,
}));

function renderWithProviders() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <MicControl brokerBaseUrl="https://voice" />
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
    expect(screen.getByRole('button', { name: /Talk/ })).toBeInTheDocument();
  });

  it('starts a session on click and stops it on the next click', async () => {
    renderWithProviders();
    const button = screen.getByRole('button', { name: /Talk/ });

    fireEvent.click(button);
    await screen.findByText('connected');
    expect(startVoiceSessionMock).toHaveBeenCalledTimes(1);
    expect(startVoiceSessionMock).toHaveBeenCalledWith('https://voice');

    fireEvent.click(button);
    await screen.findByText('idle');
    expect(stopMock).toHaveBeenCalledTimes(1);
  });
});
