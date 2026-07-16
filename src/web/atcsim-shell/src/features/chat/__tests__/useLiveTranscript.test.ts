import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLiveTranscript } from '../useLiveTranscript';

class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((e: { data: string }) => void) | null = null;
  close = vi.fn();
  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useLiveTranscript', () => {
  it('appends transcript entries in order with mapped ts', () => {
    const { result } = renderHook(() => useLiveTranscript('https://voice'));

    const instance = MockEventSource.instances[0];
    expect(instance).toBeDefined();
    expect(instance.url).toMatch(/\/api\/voice\/transcript\/stream$/);

    act(() => {
      instance.onmessage?.({ data: JSON.stringify({ role: 'atc', text: 'hi', timestampMs: 1 }) });
    });
    act(() => {
      instance.onmessage?.({
        data: JSON.stringify({ role: 'pilot', text: 'roger', timestampMs: 2 }),
      });
    });

    expect(result.current).toHaveLength(2);
    expect(result.current.map((e) => e.role)).toEqual(['atc', 'pilot']);
    expect(result.current).toEqual([
      { role: 'atc', text: 'hi', ts: 1 },
      { role: 'pilot', text: 'roger', ts: 2 },
    ]);
  });

  it('ignores non-JSON keep-alive payloads', () => {
    const { result } = renderHook(() => useLiveTranscript('https://voice'));
    const instance = MockEventSource.instances[0];

    act(() => {
      instance.onmessage?.({ data: ': keep-alive' });
    });

    expect(result.current).toHaveLength(0);
  });

  it('closes the EventSource on unmount', () => {
    const { unmount } = renderHook(() => useLiveTranscript('https://voice'));
    const instance = MockEventSource.instances[0];

    unmount();

    expect(instance.close).toHaveBeenCalledTimes(1);
  });
});
