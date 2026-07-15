import { Link } from 'react-router-dom';
import {
  Text,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

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
});

export function VoiceAgentPage() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Title2>PoC 2 — Voice agent</Title2>
      <nav className={styles.nav}>
        <Link to="/">Aircraft map</Link>
        <Link to="/voice">Voice agent</Link>
      </nav>
      <Text>
        Voice-in and voice-out conversational latency proof is implemented in a
        later task. This placeholder confirms routing to the PoC 2 surface.
      </Text>
    </div>
  );
}
