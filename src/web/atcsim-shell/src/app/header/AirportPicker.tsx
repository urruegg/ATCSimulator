import { Dropdown, Option, makeStyles, tokens } from '@fluentui/react-components';
import { Location24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../../state/AppStateContext';
import { AIRPORTS, airportCode, airportLabel } from '../../data/airports';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
  },
});

export function AirportPicker() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { airport, selectedAirport, setAirport } = useAppState();

  return (
    <div className={styles.root}>
      <Location24Regular aria-hidden="true" />
      <Dropdown
        aria-label={t('header.airport')}
        value={airportLabel(selectedAirport)}
        selectedOptions={[airport]}
        onOptionSelect={(_, data) => {
          if (data.optionValue) setAirport(data.optionValue);
        }}
      >
        {AIRPORTS.map((a) => (
          <Option key={a.icao} value={airportCode(a)} text={airportLabel(a)}>
            {airportLabel(a)}
          </Option>
        ))}
      </Dropdown>
    </div>
  );
}