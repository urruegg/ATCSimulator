export type FeedState = 'connected' | 'no_credit' | 'offline';

export interface FeedStatus {
  state: FeedState;
  checkedAt: string;
}

export interface SnapshotInfo {
  id: string;
  capturedAt: string;
}

function baseUrl(): string {
  return (import.meta.env.VITE_FLIGHT_API_BASE_URL ?? '').replace(/\/$/, '');
}

export async function fetchFeedStatus(): Promise<FeedStatus> {
  const response = await fetch(`${baseUrl()}/api/flight-feed/status`, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`flight_feed_status_error_${response.status}`);
  }
  return response.json();
}

export async function fetchSnapshots(): Promise<SnapshotInfo[]> {
  const response = await fetch(`${baseUrl()}/api/flight-snapshots`, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`flight_snapshots_error_${response.status}`);
  }
  return response.json();
}
