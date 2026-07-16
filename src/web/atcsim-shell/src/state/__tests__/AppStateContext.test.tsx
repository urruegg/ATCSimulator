import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppStateProvider, useAppState } from '../AppStateContext';

const STORAGE_KEYS = {
  refreshCadenceSec: 'atcsim.refreshCadenceSec',
  language: 'atcsim.language',
} as const;

function wrapper({ children }: { children: ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}

describe('AppStateContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults refreshCadenceSec to 5 and persists it to localStorage', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.refreshCadenceSec).toBe(5);
    expect(localStorage.getItem(STORAGE_KEYS.refreshCadenceSec)).toBe('5');
  });

  it('rejects a disabled airport (GVA) and keeps airport as ZRH', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setAirport('GVA');
    });
    expect(result.current.airport).toBe('ZRH');
  });

  it('stores the selected flight callsign', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setSelectedFlight({ callsign: 'SWR123' });
    });
    expect(result.current.selectedFlight?.callsign).toBe('SWR123');
  });

  it('persists refreshCadenceSec to localStorage when changed', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setRefreshCadenceSec(10);
    });
    expect(result.current.refreshCadenceSec).toBe(10);
    expect(localStorage.getItem(STORAGE_KEYS.refreshCadenceSec)).toBe('10');
  });
});
