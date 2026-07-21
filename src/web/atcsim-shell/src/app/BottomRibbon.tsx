import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../state/AppStateContext';
import { FeedStatusIndicator } from '../features/flight-data/FeedStatusIndicator';
import { SnapshotSelector } from '../features/flight-data/SnapshotSelector';
import { useFlightFeedStatus } from '../features/flight-data/useFlightFeedStatus';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  spacer: { flexGrow: 1 },
});

/**
 * Full-width bottom ribbon. Left: live feed status (green/yellow/red) and, when
 * the feed is in snapshot fallback, a selector to pick a saved snapshot. Right:
 * the time the flight set was last loaded.
 */
export function BottomRibbon() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { flightsUpdatedAt, feedSource } = useAppState();
  const { status } = useFlightFeedStatus();
  const time = flightsUpdatedAt ? flightsUpdatedAt.toLocaleTimeString() : '—';

  return (
    <footer className={styles.root}>
      <FeedStatusIndicator state={status.state} />
      {feedSource === 'snapshot' && <SnapshotSelector />}
      <div className={styles.spacer} />
      <Text size={200}>{t('map.lastUpdated', { time })}</Text>
    </footer>
  );
}
