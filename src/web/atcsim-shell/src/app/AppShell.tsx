import type { CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { AppRail } from './AppRail';
import { BottomRibbon } from './BottomRibbon';

// Structural layout kept as inline styles so the full-height contract is
// deterministic (and testable) regardless of the CSS-in-JS runtime.
const rootStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
};

const contentStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
};

export function AppShell() {
  return (
    <div data-testid="app-shell" style={rootStyle}>
      <Header />
      <div style={bodyStyle}>
        <AppRail />
        <main style={contentStyle}>
          <Outlet />
        </main>
      </div>
      <BottomRibbon />
    </div>
  );
}