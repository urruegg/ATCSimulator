import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AircraftMapPage } from '../features/flight-data/AircraftMapPage';
import { VoiceAgentPage } from '../features/voice-agent/VoiceAgentPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <AircraftMapPage /> },
      { path: 'chat', element: <VoiceAgentPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
