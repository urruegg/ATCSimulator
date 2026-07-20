import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppStateProvider, useAppState } from '../AppStateContext';

const STORAGE_KEYS = {
  language: 'atcsim.language',
} as const;

function wrapper({ children }: { children: ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}

describe('AppStateContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rejects an unknown airport code and keeps ZRH', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setAirport('XXX');
    });
    expect(result.current.airport).toBe('ZRH');
  });

  it('switches to a valid airport (GVA) and resets the selected flight', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setSelectedFlight({ callsign: 'SWR123' });
    });
    act(() => {
      result.current.setAirport('GVA');
    });
    expect(result.current.airport).toBe('GVA');
    expect(result.current.selectedFlight).toBeNull();
  });

  it('defaults to light theme and toggles to dark', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.themeMode).toBe('light');
    act(() => {
      result.current.toggleThemeMode();
    });
    expect(result.current.themeMode).toBe('dark');
  });

  it('stores the selected flight callsign', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setSelectedFlight({ callsign: 'SWR123' });
    });
    expect(result.current.selectedFlight?.callsign).toBe('SWR123');
  });

  it('records the flights-updated time', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    const now = new Date();
    act(() => result.current.setFlightsUpdatedAt(now));
    expect(result.current.flightsUpdatedAt).toBe(now);
  });
});
