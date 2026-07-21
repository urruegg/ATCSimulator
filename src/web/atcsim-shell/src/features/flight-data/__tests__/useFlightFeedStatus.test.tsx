import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFlightFeedStatus } from '../useFlightFeedStatus';
import { fetchFeedStatus } from '../flightFeedApi';

vi.mock('../flightFeedApi', () => ({ fetchFeedStatus: vi.fn() }));
const fetchFeedStatusMock = vi.mocked(fetchFeedStatus);

describe('useFlightFeedStatus', () => {
  beforeEach(() => {
    fetchFeedStatusMock.mockReset();
    fetchFeedStatusMock.mockResolvedValue({ state: 'connected', checkedAt: '2026-07-21T10:30:00Z' });
  });

  it('fetches status on mount', async () => {
    const { result } = renderHook(() => useFlightFeedStatus());
    await waitFor(() => expect(result.current.status.state).toBe('connected'));
    expect(fetchFeedStatusMock).toHaveBeenCalledTimes(1);
  });

  it('re-polls after 60 seconds', async () => {
    vi.useFakeTimers();
    try {
      renderHook(() => useFlightFeedStatus());
      await act(async () => { await Promise.resolve(); }); // flush mount fetch
      expect(fetchFeedStatusMock).toHaveBeenCalledTimes(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(fetchFeedStatusMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('falls back to offline when the status fetch fails', async () => {
    fetchFeedStatusMock.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useFlightFeedStatus());
    await waitFor(() => expect(result.current.status.state).toBe('offline'));
  });
});
