import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

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

export interface AirportOption {
  code: string;
  enabled: boolean;
}

/** Only ZRH is enabled for the demo; GVA is a "coming soon" placeholder. */
export const AIRPORTS: readonly AirportOption[] = [
  { code: 'ZRH', enabled: true },
  { code: 'GVA', enabled: false },
] as const;

const DEFAULT_AIRPORT = 'ZRH';
const DEFAULT_REFRESH_CADENCE_SEC = 5;
const DEFAULT_LANGUAGE = 'en';

const STORAGE_KEYS = {
  refreshCadenceSec: 'atcsim.refreshCadenceSec',
  language: 'atcsim.language',
} as const;

export interface AppState {
  airport: string;
  selectedFlight: SelectedFlight | null;
  language: string;
  refreshCadenceSec: number;
  setAirport: (code: string) => void;
  setSelectedFlight: (flight: SelectedFlight | null) => void;
  setLanguage: (lang: string) => void;
  setRefreshCadenceSec: (n: number) => void;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

function readStoredNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

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

function isAirportEnabled(code: string): boolean {
  return AIRPORTS.some((a) => a.code === code && a.enabled);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [airport, setAirportState] = useState<string>(DEFAULT_AIRPORT);
  const [selectedFlight, setSelectedFlightState] = useState<SelectedFlight | null>(null);
  const [language, setLanguageState] = useState<string>(() =>
    readStoredString(STORAGE_KEYS.language, DEFAULT_LANGUAGE),
  );
  const [refreshCadenceSec, setRefreshCadenceSecState] = useState<number>(() => {
    const initial = readStoredNumber(STORAGE_KEYS.refreshCadenceSec, DEFAULT_REFRESH_CADENCE_SEC);
    // Persist the effective default so it is present on first load.
    writeStored(STORAGE_KEYS.refreshCadenceSec, String(initial));
    return initial;
  });

  const setAirport = useCallback((code: string) => {
    if (!isAirportEnabled(code)) return; // reject disabled/unknown airports
    setAirportState((current) => {
      if (current === code) return current;
      setSelectedFlightState(null); // reset selection when the airport changes
      return code;
    });
  }, []);

  const setSelectedFlight = useCallback((flight: SelectedFlight | null) => {
    setSelectedFlightState(flight);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    writeStored(STORAGE_KEYS.language, lang);
  }, []);

  const setRefreshCadenceSec = useCallback((n: number) => {
    setRefreshCadenceSecState(n);
    writeStored(STORAGE_KEYS.refreshCadenceSec, String(n));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      airport,
      selectedFlight,
      language,
      refreshCadenceSec,
      setAirport,
      setSelectedFlight,
      setLanguage,
      setRefreshCadenceSec,
    }),
    [
      airport,
      selectedFlight,
      language,
      refreshCadenceSec,
      setAirport,
      setSelectedFlight,
      setLanguage,
      setRefreshCadenceSec,
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
