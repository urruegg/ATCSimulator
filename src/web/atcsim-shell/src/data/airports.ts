// Swiss airports with published reference-point coordinates (see docs/AIRPORTS.md
// sections 1-4: national, regional, other public/mixed, principal military). The
// appendix (small airfields/gliding/heliports) is omitted here because it has no
// coordinates to anchor the map on. Coordinates are WGS84 decimal degrees.

export interface Airport {
  /** ICAO location indicator (unique; all Swiss codes start with LS). */
  icao: string;
  /** IATA code where the airport has one. */
  iata?: string;
  name: string;
  lat: number;
  lon: number;
}

export const AIRPORTS: readonly Airport[] = [
  // National airports
  { icao: 'LSZH', iata: 'ZRH', name: 'Zurich Airport', lat: 47.46472, lon: 8.54917 },
  { icao: 'LSGG', iata: 'GVA', name: 'Geneva Airport', lat: 46.23756, lon: 6.10921 },
  { icao: 'LFSB', iata: 'BSL', name: 'EuroAirport Basel-Mulhouse-Freiburg', lat: 47.59, lon: 7.52917 },
  // Regional airports
  { icao: 'LSZB', iata: 'BRN', name: 'Bern Airport', lat: 46.91222, lon: 7.49917 },
  { icao: 'LSZF', name: 'Birrfeld', lat: 47.44333, lon: 8.23389 },
  { icao: 'LSZQ', name: 'Bressaucourt', lat: 47.3925, lon: 7.02889 },
  { icao: 'LSGE', name: 'Fribourg-Ecuvillens', lat: 46.75528, lon: 7.07583 },
  { icao: 'LSZG', name: 'Grenchen', lat: 47.18139, lon: 7.41694 },
  { icao: 'LSGL', name: 'Lausanne-La Blecherette', lat: 46.54528, lon: 6.61667 },
  { icao: 'LSGC', name: 'Les Eplatures', lat: 47.08389, lon: 6.79278 },
  { icao: 'LSZA', iata: 'LUG', name: 'Lugano', lat: 46.00361, lon: 8.91028 },
  { icao: 'LSZR', iata: 'ACH', name: 'St. Gallen-Altenrhein', lat: 47.48553, lon: 9.56111 },
  { icao: 'LSZS', iata: 'SMV', name: 'Samedan', lat: 46.53389, lon: 9.88389 },
  { icao: 'LSGS', iata: 'SIR', name: 'Sion', lat: 46.21959, lon: 7.32676 },
  // Other notable public / mixed-use
  { icao: 'LSZL', iata: 'QYZ', name: 'Locarno', lat: 46.1653, lon: 8.8778 },
  { icao: 'LSZC', iata: 'BXO', name: 'Buochs', lat: 46.97444, lon: 8.39694 },
  // Principal military air bases
  { icao: 'LSME', iata: 'EML', name: 'Emmen', lat: 47.09222, lon: 8.30444 },
  { icao: 'LSMP', iata: 'VIP', name: 'Payerne', lat: 46.84333, lon: 6.915 },
  { icao: 'LSMM', name: 'Meiringen', lat: 46.74028, lon: 8.11 },
  { icao: 'LSMA', name: 'Alpnach', lat: 46.93861, lon: 8.28417 },
  { icao: 'LSMD', name: 'Dubendorf', lat: 47.39861, lon: 8.64806 },
] as const;

export const DEFAULT_AIRPORT_CODE = 'ZRH';

/** Stable selection key: IATA where present, else ICAO. */
export function airportCode(a: Airport): string {
  return a.iata ?? a.icao;
}

/** Dropdown label: "<IATA-or-ICAO> <Name>", e.g. "ZRH Zurich Airport". */
export function airportLabel(a: Airport): string {
  return `${airportCode(a)} ${a.name}`;
}

export function findAirport(code: string): Airport | undefined {
  return AIRPORTS.find((a) => airportCode(a) === code);
}

/** FR24 bounding box "N,S,W,E" around an airport (~±0.25° ≈ 28 km each way). */
export function airportBounds(a: Airport): string {
  const pad = 0.25;
  return `${(a.lat + pad).toFixed(4)},${(a.lat - pad).toFixed(4)},${(a.lon - pad).toFixed(4)},${(a.lon + pad).toFixed(4)}`;
}
