export interface ScenarioSummary {
  id: string;
  title: Record<string, string>; // language code -> localized title
  aircraftClass: string;
  expectedCommands: string[];
}

export interface ScenarioTurnResponse {
  accepted: boolean;
  command: string | null;
  readBackText: string;
  phraseologyFlags: string[];
}

export interface Capabilities {
  liveAvailable: boolean;
  mockAvailable: boolean;
}

export interface SpeechTokenResponse {
  token: string;
  region: string;
}
