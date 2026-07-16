import { useTranslation } from 'react-i18next';
import { Info24Regular, Live24Regular } from '@fluentui/react-icons';
import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { useAppState } from '../../state/AppStateContext';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  advisoryText: {
    color: tokens.colorNeutralForeground2,
  },
  liveIcon: {
    color: tokens.colorPaletteRedForeground1,
    flexShrink: 0,
  },
  metrics: {
    color: tokens.colorNeutralForeground2,
  },
});

/**
 * Compact, real-time header for the ZRH real-flight scenario.
 *
 * Renders an advisory note (with an info icon) while no flight is selected, and
 * a single-line live summary of the selected flight otherwise. Optional fields
 * are omitted gracefully when undefined so a partially-seeded selection still
 * renders cleanly (see `SelectedFlight` in `state/AppStateContext.tsx`).
 */
export function SelectedFlightHeader() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { selectedFlight } = useAppState();

  if (selectedFlight === null) {
    return (
      <div role="note" className={styles.row}>
        <Info24Regular aria-hidden="true" />
        <Text className={styles.advisoryText}>{t('map.selectAdvisory')}</Text>
      </div>
    );
  }

  const {
    callsign,
    aircraftType,
    registration,
    latitude,
    longitude,
    altitudeFt,
    headingDeg,
    groundSpeedKt,
  } = selectedFlight;

  const identity = [callsign, aircraftType, registration].filter(Boolean).join(' · ');

  const metrics: string[] = [];
  if (altitudeFt !== undefined) metrics.push(`FL${Math.round(altitudeFt / 100)}`);
  if (headingDeg !== undefined) metrics.push(`${headingDeg}°`);
  if (groundSpeedKt !== undefined) metrics.push(`${groundSpeedKt} kt`);
  if (latitude !== undefined && longitude !== undefined) {
    metrics.push(`${latitude}, ${longitude}`);
  }

  return (
    <div className={styles.row}>
      <Live24Regular className={styles.liveIcon} aria-label="live" />
      <Text weight="semibold">{identity}</Text>
      {metrics.length > 0 && <Text className={styles.metrics}>{metrics.join(' · ')}</Text>}
    </div>
  );
}
