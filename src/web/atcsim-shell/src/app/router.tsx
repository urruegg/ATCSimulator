import { createBrowserRouter } from 'react-router-dom';
import { AircraftMapPage } from '../features/flight-data/AircraftMapPage';
import { VoiceAgentPage } from '../features/voice-agent/VoiceAgentPage';

export const router = createBrowserRouter([
  { path: '/', element: <AircraftMapPage /> },
  { path: '/voice', element: <VoiceAgentPage /> },
]);
