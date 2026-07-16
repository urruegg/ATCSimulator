import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import { Mic24Regular, MicOff24Regular, Speaker224Regular } from '@fluentui/react-icons';
import { startVoiceSession, type VoiceSession } from '../../voice/voiceLiveClient';

/**
 * Connection status for the push-to-talk session.
 *
 * `idle` | `connecting` | `connected` are the lifecycle states; any other
 * string is an error message surfaced verbatim to the operator.
 */
type Status = 'idle' | 'connecting' | 'connected' | string;

const DEFAULT_BROKER_BASE_URL = import.meta.env.VITE_VOICE_API_BASE_URL ?? '';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalS,
  },
  status: {
    color: tokens.colorNeutralForeground2,
  },
  disclosure: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground3,
  },
});

export interface MicControlProps {
  /**
   * Base URL of the voice broker. Defaults to `VITE_VOICE_API_BASE_URL`
   * (empty string → same-origin).
   */
  brokerBaseUrl?: string;
}

/**
 * Push-to-talk control for the Voice Live session (AG-F-01/02/05 on the demo
 * plane). The synthetic-voice disclosure is always visible per DP-16.
 */
export function MicControl({ brokerBaseUrl = DEFAULT_BROKER_BASE_URL }: MicControlProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const active = session !== null;

  const handleClick = useCallback(async () => {
    if (session) {
      session.stop();
      setSession(null);
      setStatus('idle');
      return;
    }

    setStatus('connecting');
    try {
      const next = await startVoiceSession(brokerBaseUrl);
      setSession(next);
      setStatus('connected');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }, [session, brokerBaseUrl]);

  return (
    <div className={styles.root}>
      <Button
        appearance="primary"
        icon={active ? <MicOff24Regular /> : <Mic24Regular />}
        onClick={() => {
          void handleClick();
        }}
      >
        {t('chat.talk')}
      </Button>
      <Text className={styles.status}>{status}</Text>
      <div role="note" className={styles.disclosure}>
        <Speaker224Regular aria-hidden="true" />
        <Text>{t('chat.syntheticDisclosure')}</Text>
      </div>
    </div>
  );
}
