import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFlightPolling } from '../useFlightPolling';
import { fetchAircraft } from '../aircraftApi';

vi.mock('../aircraftApi', () => ({
  fetchAircraft: vi.fn(),
}));

const fetchAircraftMock = vi.mocked(fetchAircraft);

describe('useFlightPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchAircraftMock.mockReset();
    fetchAircraftMock.mockResolvedValue([{ callsign: 'SWR123' } as any]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls immediately, then on cadence, and stops on unmount', async () => {
    const { result, unmount } = renderHook(() => useFlightPolling('47.7,47.2,8.3,8.8', 5));

    // Flush microtasks from the immediate poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchAircraftMock).toHaveBeenCalledTimes(1);
    expect(result.current.aircraft).toEqual([{ callsign: 'SWR123' }]);
    expect(result.current.error).toBeNull();

    // Advance one cadence -> second poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchAircraftMock).toHaveBeenCalledTimes(2);

    // After unmount the interval is cleared -> no further polls.
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchAircraftMock).toHaveBeenCalledTimes(2);
  });
});
