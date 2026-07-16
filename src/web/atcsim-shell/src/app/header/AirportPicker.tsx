import { Dropdown, Option, makeStyles, tokens } from '@fluentui/react-components';
import { Location24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { AIRPORTS, useAppState } from '../../state/AppStateContext';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
  },
});

function airportLabel(code: string, enabled: boolean): string {
  return enabled ? code : `${code} \u2014 coming soon`;
}

export function AirportPicker() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { airport, setAirport } = useAppState();

  return (
    <div className={styles.root}>
      <Location24Regular aria-hidden="true" />
      <Dropdown
        aria-label={t('header.airport')}
        value={airport}
        selectedOptions={[airport]}
        onOptionSelect={(_, data) => {
          if (data.optionValue) setAirport(data.optionValue);
        }}
      >
        {AIRPORTS.map((a) => (
          <Option
            key={a.code}
            value={a.code}
            text={airportLabel(a.code, a.enabled)}
            disabled={!a.enabled}
          >
            {airportLabel(a.code, a.enabled)}
          </Option>
        ))}
      </Dropdown>
    </div>
  );
}