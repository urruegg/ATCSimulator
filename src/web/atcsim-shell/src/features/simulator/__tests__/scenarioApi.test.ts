import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchScenarios, postScenarioTurn } from '../scenarioApi';

describe('scenarioApi', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('fetches scenarios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => [{ id: 'EX-01', title: { en: 'x' }, aircraftClass: 'airliner', expectedCommands: [] }],
    }));
    const list = await fetchScenarios('');
    expect(list[0].id).toBe('EX-01');
  });

  it('posts a scenario turn', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ accepted: true, command: 'SET_HEADING', readBackText: 'ok', phraseologyFlags: [] }),
    }));
    const r = await postScenarioTurn('', 'EX-01', 'heading 290');
    expect(r.accepted).toBe(true);
  });
});
