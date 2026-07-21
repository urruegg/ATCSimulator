import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_AIRPORT_CODE, findAirport, type Airport } from '../data/airports';
import type { ScenarioSummary } from '../features/simulator/types';
import type { FeedSource } from '../features/flight-data/types';

/**
 * A flight selected by the trainee/instructor for the ZRH real-flight scenario.
 *
 * Fields other than `callsign` are optional so a selection can be seeded from a
 * partial source (e.g. a map click that only knows the callsign) and enriched
 * later. This intentionally differs from the stricter `Aircraft` type in
 * `features/flight-data/types.ts` (which requires all fields); see the task
 * note in the accompanying test.
 */
export interface SelectedFlight {
  callsign: string;
  aircraftType?: string;
  registration?: string;
  latitude?: number;
  longitude?: number;
  altitudeFt?: number;
  headingDeg?: number;
  groundSpeedKt?: number;
}

export type ThemeMode = 'light' | 'dark';

const DEFAULT_LANGUAGE = 'en';
const DEFAULT_THEME_MODE: ThemeMode = 'light';

const STORAGE_KEYS = {
  language: 'atcsim.language',
  themeMode: 'atcsim.themeMode',
  railExpanded: 'atcsim.railExpanded',
  airport: 'atcsim.airport',
} as const;

export interface AppState {
  airport: string;
  selectedAirport: Airport;
  selectedFlight: SelectedFlight | null;
  selectedScenario: ScenarioSummary | null;
  language: string;
  themeMode: ThemeMode;
  railExpanded: boolean;
  flightsUpdatedAt: Date | null;
  selectedSnapshotId: string | null;
  feedSource: FeedSource;
  setAirport: (code: string) => void;
  setSelectedFlight: (flight: SelectedFlight | null) => void;
  setSelectedScenario: (s: ScenarioSummary | null) => void;
  setLanguage: (lang: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  setRailExpanded: (expanded: boolean) => void;
  toggleRail: () => void;
  setFlightsUpdatedAt: (d: Date) => void;
  setSelectedSnapshotId: (id: string | null) => void;
  setFeedSource: (s: FeedSource) => void;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

function readStoredString(key: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (e.g. private mode) — non-fatal for the demo */
  }
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [airport, setAirportState] = useState<string>(() => {
    const stored = readStoredString(STORAGE_KEYS.airport, DEFAULT_AIRPORT_CODE);
    return findAirport(stored) ? stored : DEFAULT_AIRPORT_CODE;
  });
  const [selectedFlight, setSelectedFlightState] = useState<SelectedFlight | null>(null);
  const [selectedScenario, setSelectedScenarioState] = useState<ScenarioSummary | null>(null);
  const [language, setLanguageState] = useState<string>(() =>
    readStoredString(STORAGE_KEYS.language, DEFAULT_LANGUAGE),
  );
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    readStoredString(STORAGE_KEYS.themeMode, DEFAULT_THEME_MODE) === 'dark' ? 'dark' : 'light',
  );
  const [railExpanded, setRailExpandedState] = useState<boolean>(() =>
    readStoredBoolean(STORAGE_KEYS.railExpanded, false),
  );
  const [flightsUpdatedAt, setFlightsUpdatedAtState] = useState<Date | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotIdState] = useState<string | null>(null);
  const [feedSource, setFeedSourceState] = useState<FeedSource>('live');

  const setAirport = useCallback((code: string) => {
    if (!findAirport(code)) return; // reject unknown airports
    setAirportState((current) => {
      if (current === code) return current;
      setSelectedFlightState(null); // reset selection when the airport changes
      setSelectedScenarioState(null); // reset scenario when the airport changes
      writeStored(STORAGE_KEYS.airport, code);
      return code;
    });
  }, []);

  const setSelectedFlight = useCallback((flight: SelectedFlight | null) => {
    setSelectedFlightState(flight);
    if (flight === null) {
      setSelectedScenarioState(null); // reset scenario when flight is cleared
    }
  }, []);

  const setSelectedScenario = useCallback((s: ScenarioSummary | null) => {
    setSelectedScenarioState(s);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    writeStored(STORAGE_KEYS.language, lang);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    writeStored(STORAGE_KEYS.themeMode, mode);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeModeState((current) => {
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      writeStored(STORAGE_KEYS.themeMode, next);
      return next;
    });
  }, []);

  const setRailExpanded = useCallback((expanded: boolean) => {
    setRailExpandedState(expanded);
    writeStored(STORAGE_KEYS.railExpanded, String(expanded));
  }, []);

  const toggleRail = useCallback(() => {
    setRailExpandedState((current) => {
      const next = !current;
      writeStored(STORAGE_KEYS.railExpanded, String(next));
      return next;
    });
  }, []);

  const setFlightsUpdatedAt = useCallback((d: Date) => setFlightsUpdatedAtState(d), []);

  const setSelectedSnapshotId = useCallback(
    (id: string | null) => setSelectedSnapshotIdState(id),
    [],
  );

  const setFeedSource = useCallback((s: FeedSource) => setFeedSourceState(s), []);

  const selectedAirport = useMemo<Airport>(
    () => findAirport(airport) ?? findAirport(DEFAULT_AIRPORT_CODE)!,
    [airport],
  );

  const value = useMemo<AppState>(
    () => ({
      airport,
      selectedAirport,
      selectedFlight,
      selectedScenario,
      language,
      themeMode,
      railExpanded,
      flightsUpdatedAt,
      selectedSnapshotId,
      feedSource,
      setAirport,
      setSelectedFlight,
      setSelectedScenario,
      setLanguage,
      setThemeMode,
      toggleThemeMode,
      setRailExpanded,
      toggleRail,
      setFlightsUpdatedAt,
      setSelectedSnapshotId,
      setFeedSource,
    }),
    [
      airport,
      selectedAirport,
      selectedFlight,
      selectedScenario,
      language,
      themeMode,
      railExpanded,
      flightsUpdatedAt,
      selectedSnapshotId,
      feedSource,
      setAirport,
      setSelectedFlight,
      setSelectedScenario,
      setLanguage,
      setThemeMode,
      toggleThemeMode,
      setRailExpanded,
      toggleRail,
      setFlightsUpdatedAt,
      setSelectedSnapshotId,
      setFeedSource,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (ctx === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return ctx;
}
