import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VoicePanel } from '../VoicePanel';

describe('VoicePanel', () => {
  it('shows the synthetic-voice disclosure (DP-16)', () => {
    render(<VoicePanel brokerBaseUrl="https://broker" />);
    expect(screen.getByText(/synthetic/i)).toBeInTheDocument();
  });
});
