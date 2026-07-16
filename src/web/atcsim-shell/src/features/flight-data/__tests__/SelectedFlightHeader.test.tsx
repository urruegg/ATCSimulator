import { describe, expect, it } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AppStateProvider, useAppState } from '../../../state/AppStateContext';
import { SelectedFlightHeader } from '../SelectedFlightHeader';
import '../../../i18n';

function renderWithProviders(ui: ReactNode) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <AppStateProvider>{ui}</AppStateProvider>
    </FluentProvider>,
  );
}

/** Seeds a selection through the real context so the header reads it back. */
function SelectHarness() {
  const { setSelectedFlight } = useAppState();
  useEffect(() => {
    setSelectedFlight({
      callsign: 'SWR123',
      aircraftType: 'A320',
      altitudeFt: 12000,
      headingDeg: 270,
      groundSpeedKt: 240,
    });
  }, [setSelectedFlight]);
  return <SelectedFlightHeader />;
}

describe('SelectedFlightHeader', () => {
  it('renders the advisory note when no flight is selected', () => {
    renderWithProviders(<SelectedFlightHeader />);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Select an aircraft on the map to begin');
  });

  it('renders a live header for the selected flight', () => {
    renderWithProviders(<SelectHarness />);
    expect(screen.getByText(/SWR123/)).toBeInTheDocument();
    expect(screen.getByText(/A320/)).toBeInTheDocument();
    expect(screen.getByText(/270/)).toBeInTheDocument();
  });
});
