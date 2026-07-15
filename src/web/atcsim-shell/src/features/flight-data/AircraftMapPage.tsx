import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  Spinner,
  Text,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { fetchAircraft } from './aircraftApi';
import type { Aircraft } from './types';

const SWITZERLAND_BOUNDS = '47.7,8.3,47.2,8.8';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalL,
  },
  nav: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
  },
  mapHost: {
    height: '480px',
    width: '100%',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  selected: {
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
});

export function AircraftMapPage() {
  const styles = useStyles();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [selected, setSelected] = useState<Aircraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchAircraft(SWITZERLAND_BOUNDS)
      .then((items) => {
        if (active) {
          setAircraft(items);
        }
      })
      .catch(() => {
        if (active) {
          setError('Unable to load aircraft from the flight-data API.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={styles.root}>
      <Title2>PoC 1 — Aircraft selection</Title2>
      <nav className={styles.nav}>
        <Link to="/">Aircraft map</Link>
        <Link to="/voice">Voice agent</Link>
      </nav>

      <div id="azure-map-host" className={styles.mapHost}>
        <Text>Azure Maps host</Text>
      </div>

      {loading && <Spinner label="Loading aircraft…" />}
      {error && <Text>{error}</Text>}

      <div className={styles.list}>
        {aircraft.map((item) => (
          <Card key={item.callsign} onClick={() => setSelected(item)}>
            <CardHeader
              header={<Text weight="semibold">{item.callsign}</Text>}
              description={<Text>{item.aircraftType}</Text>}
            />
          </Card>
        ))}
      </div>

      {selected && (
        <div className={styles.selected}>
          <Text weight="semibold">
            {selected.callsign} · {selected.aircraftType}
          </Text>
          <br />
          <Text>
            {selected.latitude.toFixed(3)}, {selected.longitude.toFixed(3)} · FL
            {Math.round(selected.altitudeFt / 100)} · {selected.headingDeg}° ·{' '}
            {selected.groundSpeedKt} kt
          </Text>
        </div>
      )}
    </div>
  );
}
