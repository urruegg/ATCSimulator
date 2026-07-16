import { makeStyles, tokens } from '@fluentui/react-components';
import { AirportPicker } from './header/AirportPicker';
import { LanguagePicker } from './header/LanguagePicker';
import { UserMenu } from './header/UserMenu';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  spacer: {
    flexGrow: 1,
  },
});

export function Header() {
  const styles = useStyles();
  return (
    <header className={styles.root}>
      <img src="/brand/atcsimulator-logo.svg" alt="ATCSimulator" height={28} />
      <div className={styles.spacer} />
      <LanguagePicker />
      <AirportPicker />
      <UserMenu />
    </header>
  );
}