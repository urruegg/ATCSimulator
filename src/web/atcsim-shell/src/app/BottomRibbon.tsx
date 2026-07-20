import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../state/AppStateContext';

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

/** Full-width bottom ribbon. Shows when the flight set was last loaded. */
export function BottomRibbon() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { flightsUpdatedAt } = useAppState();
  const time = flightsUpdatedAt ? flightsUpdatedAt.toLocaleTimeString() : '—';

  return (
    <footer className={styles.root}>
      <div className={styles.spacer} />
      <Text size={200}>{t('map.lastUpdated', { time })}</Text>
    </footer>
  );
}
