import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFlightData } from '../useFlightData';
import { fetchAircraft } from '../aircraftApi';

vi.mock('../aircraftApi', () => ({ fetchAircraft: vi.fn() }));
const fetchAircraftMock = vi.mocked(fetchAircraft);

describe('useFlightData', () => {
  beforeEach(() => {
    fetchAircraftMock.mockReset();
    fetchAircraftMock.mockResolvedValue([{ callsign: 'SWR123' } as any]);
  });

  it('fetches once on mount and exposes lastUpdated', async () => {
    const { result } = renderHook(() => useFlightData('47.95,45.75,5.85,10.55'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchAircraftMock).toHaveBeenCalledTimes(1);
    expect(result.current.aircraft).toEqual([{ callsign: 'SWR123' }]);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('does NOT poll again on its own', async () => {
    vi.useFakeTimers();
    renderHook(() => useFlightData('47.95,45.75,5.85,10.55'));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(fetchAircraftMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('refresh() refetches', async () => {
    const { result } = renderHook(() => useFlightData('47.95,45.75,5.85,10.55'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.refresh(); });
    expect(fetchAircraftMock).toHaveBeenCalledTimes(2);
  });

  it('keeps last-known aircraft on error', async () => {
    const { result } = renderHook(() => useFlightData('47.95,45.75,5.85,10.55'));
    await waitFor(() => expect(result.current.aircraft.length).toBe(1));
    fetchAircraftMock.mockRejectedValueOnce(new Error('429'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.aircraft).toEqual([{ callsign: 'SWR123' }]);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
