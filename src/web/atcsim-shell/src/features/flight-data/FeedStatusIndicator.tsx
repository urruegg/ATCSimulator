import { Text, Tooltip, makeStyles, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import type { FeedState } from './flightFeedApi';

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  connected: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },
  noCredit: {
    backgroundColor: tokens.colorPaletteYellowBackground3,
  },
  offline: {
    backgroundColor: tokens.colorPaletteRedBackground3,
  },
});

const LABEL_KEY: Record<FeedState, string> = {
  connected: 'feed.status.connected',
  no_credit: 'feed.status.noCredit',
  offline: 'feed.status.offline',
};

const TOOLTIP_KEY: Record<FeedState, string> = {
  connected: 'feed.tooltip.connected',
  no_credit: 'feed.tooltip.noCredit',
  offline: 'feed.tooltip.offline',
};

const DOT_CLASS: Record<FeedState, keyof ReturnType<typeof useStyles>> = {
  connected: 'connected',
  no_credit: 'noCredit',
  offline: 'offline',
};

export interface FeedStatusIndicatorProps {
  state: FeedState;
}

export function FeedStatusIndicator({ state }: FeedStatusIndicatorProps): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();

  return (
    <Tooltip content={t(TOOLTIP_KEY[state])} relationship="label">
      <span className={styles.root} role="status" aria-label={t('feed.status.label')}>
        <span className={`${styles.dot} ${styles[DOT_CLASS[state]]}`} aria-hidden="true" />
        <Text size={200}>{t(LABEL_KEY[state])}</Text>
      </span>
    </Tooltip>
  );
}
