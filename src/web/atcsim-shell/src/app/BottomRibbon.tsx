import { Dropdown, Option, Text, makeStyles, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../state/AppStateContext';

const CADENCE_OPTIONS = [2, 5, 10] as const;

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
  spacer: {
    flexGrow: 1,
  },
  refresh: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
  },
});

/**
 * Full-width bottom ribbon (mirrors the header). Hosts the global refresh-cadence
 * control that drives live flight-data polling.
 */
export function BottomRibbon() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { refreshCadenceSec, setRefreshCadenceSec } = useAppState();

  return (
    <footer className={styles.root}>
      <div className={styles.spacer} />
      <div className={styles.refresh}>
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
    </footer>
  );
}
