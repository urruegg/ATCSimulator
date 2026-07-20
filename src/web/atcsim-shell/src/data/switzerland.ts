// Country-wide bounding box for the one-shot flight load. Format is
// "N,S,W,E" decimal degrees, matching the flight API's `bounds` query param
// (see features/flight-data/aircraftApi.ts). Covers mainland Switzerland with
// a small margin so border traffic is included.
export const SWITZERLAND_BOUNDS = '47.95,45.75,5.85,10.55';
