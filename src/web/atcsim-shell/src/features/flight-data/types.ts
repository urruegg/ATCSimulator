export interface Aircraft {
  callsign: string;
  aircraftType: string;
  registration: string | null;
  latitude: number;
  longitude: number;
  altitudeFt: number;
  headingDeg: number;
  groundSpeedKt: number;
}

export type FeedSource = 'live' | 'snapshot';

export interface AircraftFeed {
  source: FeedSource;
  snapshotAt: string | null;
  aircraft: Aircraft[];
}
