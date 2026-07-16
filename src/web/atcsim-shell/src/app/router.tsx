import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AircraftMapPage } from '../features/flight-data/AircraftMapPage';
import { ChatPage } from '../features/chat/ChatPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <AircraftMapPage /> },
      { path: 'chat', element: <ChatPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
