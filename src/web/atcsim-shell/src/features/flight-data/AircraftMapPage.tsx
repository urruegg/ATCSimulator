import { useEffect, useRef } from 'react';
import * as atlas from 'azure-maps-control';
import 'azure-maps-control/dist/atlas.min.css';
import { Dropdown, Option, Text, makeStyles, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../../state/AppStateContext';
import { fetchMapsToken } from './mapAuth';
import { useFlightPolling } from './useFlightPolling';
import { SelectedFlightHeader } from './SelectedFlightHeader';

// ZRH bounding box as N,S,W,E (matches the flight-data API contract).
const ZRH_BOUNDS = '47.7,47.2,8.3,8.8';
// Map center as [lon, lat] (Azure Maps position order).
const ZRH_CENTER: [number, number] = [8.55, 47.45];
const CADENCE_OPTIONS = [2, 5, 10] as const;

// Same-origin when unset; the flight-data API also brokers the Maps token.
const flightBase = (import.meta.env.VITE_FLIGHT_API_BASE_URL ?? '').replace(/\/$/, '');

const useStyles = makeStyles({
  root: {
    position: 'relative',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  overlayTop: {
    position: 'absolute',
    top: tokens.spacingVerticalM,
    left: tokens.spacingHorizontalM,
    right: tokens.spacingHorizontalM,
    zIndex: 1,
    // Let map pan/zoom gestures pass through the advisory strip.
    pointerEvents: 'none',
  },
  cadence: {
    position: 'absolute',
    right: tokens.spacingHorizontalM,
    bottom: tokens.spacingVerticalM,
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
  },
});

export function AircraftMapPage() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { setSelectedFlight, refreshCadenceSec, setRefreshCadenceSec } = useAppState();

  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<atlas.Map | null>(null);

  const { aircraft } = useFlightPolling(ZRH_BOUNDS, refreshCadenceSec);

  // Create the Azure Maps instance once. The SDK needs a real DOM host + WebGL,
  // so under jsdom it is mocked (see the test); the host guard keeps init a
  // no-op when there is no element to mount into.
  useEffect(() => {
    const host = mapHostRef.current;
    if (!host) return;

    const map = new atlas.Map(host, {
      center: ZRH_CENTER,
      zoom: 8,
      authOptions: {
        // String is erased to the enum member at build; runtime stays a plain
        // string so the mocked SDK (no AuthenticationType export) still works.
        authType: 'anonymous' as atlas.AuthenticationType,
        clientId: import.meta.env.VITE_MAPS_CLIENT_ID,
        getToken: async (resolve, reject) => {
          try {
            resolve(await fetchMapsToken(flightBase));
          } catch (e) {
            reject(e as Error);
          }
        },
      },
    });
    mapRef.current = map;

    return () => {
      map.dispose();
      mapRef.current = null;
    };
  }, []);

  // Refresh HTML markers whenever the live aircraft set changes. Selecting a
  // marker is advisory only — it never commands the simulator directly.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.markers.clear();
    for (const a of aircraft) {
      const marker = new atlas.HtmlMarker({ position: [a.longitude, a.latitude] });
      map.events.add('click', marker, () => {
        setSelectedFlight({
          callsign: a.callsign,
          aircraftType: a.aircraftType,
          registration: a.registration ?? undefined,
          latitude: a.latitude,
          longitude: a.longitude,
          altitudeFt: a.altitudeFt,
          headingDeg: a.headingDeg,
          groundSpeedKt: a.groundSpeedKt,
        });
      });
      map.markers.add(marker);
    }
  }, [aircraft, setSelectedFlight]);

  return (
    <div className={styles.root}>
      <div id="azure-map-host" ref={mapHostRef} style={{ position: 'absolute', inset: 0 }} />

      <div className={styles.overlayTop}>
        <SelectedFlightHeader />
      </div>

      <div className={styles.cadence}>
        <Text size={200}>{t('settings.refresh')}</Text>
        <Dropdown
          aria-label={t('settings.refresh')}
          value={`${refreshCadenceSec}s`}
          selectedOptions={[String(refreshCadenceSec)]}
          onOptionSelect={(_, data) => {
            if (data.optionValue) setRefreshCadenceSec(Number(data.optionValue));
          }}
        >
          {CADENCE_OPTIONS.map((c) => (
            <Option key={c} value={String(c)} text={`${c}s`}>
              {`${c}s`}
            </Option>
          ))}
        </Dropdown>
      </div>
    </div>
  );
}
