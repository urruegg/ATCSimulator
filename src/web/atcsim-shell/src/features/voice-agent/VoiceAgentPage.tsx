import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Spinner,
  Text,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useVoiceSession } from './useVoiceSession';

const SAMPLE_TRANSCRIPT = 'What does the aircraft selection PoC prove?';

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
  answer: {
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
});

export function VoiceAgentPage() {
  const styles = useStyles();
  const { latencyMs, pending, submitTranscript } = useVoiceSession();
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function runProof() {
    setError(null);
    try {
      const response = await submitTranscript(SAMPLE_TRANSCRIPT);
      setAnswer(response.answerText);
    } catch {
      setError('Voice turn failed. Ensure the voice-agent API is running.');
    }
  }

  return (
    <div className={styles.root}>
      <Title2>PoC 2 — Voice agent</Title2>
      <nav className={styles.nav}>
        <Link to="/">Aircraft map</Link>
        <Link to="/voice">Voice agent</Link>
      </nav>

      <Text>Sample prompt: “{SAMPLE_TRANSCRIPT}”</Text>

      <Button appearance="primary" disabled={pending} onClick={runProof}>
        {pending ? 'Running…' : 'Start voice proof'}
      </Button>

      {pending && <Spinner label="Awaiting agent response…" />}
      {error && <Text>{error}</Text>}

      {answer && (
        <div className={styles.answer}>
          <Text weight="semibold">Agent answer</Text>
          <br />
          <Text>{answer}</Text>
        </div>
      )}

      <Text>
        {latencyMs !== null
          ? `Round-trip latency: ${Math.round(latencyMs)} ms`
          : 'Latency pending'}
      </Text>
    </div>
  );
}
