import { useEffect, useRef } from 'react';
import * as atlas from 'azure-maps-control';
import 'azure-maps-control/dist/atlas.min.css';
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import { Add24Regular, Subtract24Regular, Target24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../../state/AppStateContext';
import { fetchMapsToken } from './mapAuth';
import { useFlightPolling } from './useFlightPolling';
import { SelectedFlightHeader } from './SelectedFlightHeader';
import { airportBounds } from '../../data/airports';

// Runway-level zoom so the selected airport and its runways are in view.
const AIRPORT_ZOOM = 14;

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
  // Bottom-right stack of map controls.
  controls: {
    position: 'absolute',
    right: tokens.spacingHorizontalM,
    bottom: tokens.spacingVerticalM,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    rowGap: tokens.spacingVerticalS,
  },
  mapButtons: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
    overflow: 'hidden',
  },
  feedError: {
    alignSelf: 'flex-start',
    pointerEvents: 'auto',
    marginTop: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorStatusWarningBackground2,
    color: tokens.colorStatusWarningForeground2,
  },
});

export function AircraftMapPage() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { setSelectedFlight, refreshCadenceSec, selectedAirport } = useAppState();

  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<atlas.Map | null>(null);

  const { aircraft, error } = useFlightPolling(airportBounds(selectedAirport), refreshCadenceSec);

  // Create the Azure Maps instance once. The SDK needs a real DOM host + WebGL,
  // so under jsdom it is mocked (see the test); the host guard keeps init a
  // no-op when there is no element to mount into.
  useEffect(() => {
    const host = mapHostRef.current;
    if (!host) return;

    const map = new atlas.Map(host, {
      center: [selectedAirport.lon, selectedAirport.lat],
      zoom: AIRPORT_ZOOM,
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

  // Recenter the camera when the selected airport changes.
  useEffect(() => {
    mapRef.current?.setCamera({
      center: [selectedAirport.lon, selectedAirport.lat],
      zoom: AIRPORT_ZOOM,
    });
  }, [selectedAirport]);

  // Map controls: recenter to the current airport anchor, and zoom in/out.
  const recenter = () =>
    mapRef.current?.setCamera({
      center: [selectedAirport.lon, selectedAirport.lat],
      zoom: AIRPORT_ZOOM,
    });
  const zoomIn = () => {
    const map = mapRef.current;
    if (map) map.setCamera({ zoom: (map.getCamera().zoom ?? AIRPORT_ZOOM) + 1 });
  };
  const zoomOut = () => {
    const map = mapRef.current;
    if (map) map.setCamera({ zoom: (map.getCamera().zoom ?? AIRPORT_ZOOM) - 1 });
  };

  return (
    <div className={styles.root}>
      <div id="azure-map-host" ref={mapHostRef} style={{ position: 'absolute', inset: 0 }} />

      <div className={styles.overlayTop}>
        <SelectedFlightHeader />
        {error && (
          <Text size={200} className={styles.feedError}>
            {t('map.feedError')}
          </Text>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.mapButtons} role="group" aria-label={t('map.controls')}>
          <Button
            appearance="subtle"
            icon={<Target24Regular />}
            aria-label={t('map.recenter')}
            onClick={recenter}
          />
          <Button
            appearance="subtle"
            icon={<Add24Regular />}
            aria-label={t('map.zoomIn')}
            onClick={zoomIn}
          />
          <Button
            appearance="subtle"
            icon={<Subtract24Regular />}
            aria-label={t('map.zoomOut')}
            onClick={zoomOut}
          />
        </div>
      </div>
    </div>
  );
}
