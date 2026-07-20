import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Switch, Text, makeStyles, tokens } from '@fluentui/react-components';
import { Mic24Regular, MicOff24Regular, Speaker224Regular } from '@fluentui/react-icons';
import { startVoiceSession, type VoiceSession } from '../../voice/voiceLiveClient';
import { useAppState } from '../../state/AppStateContext';
import { fetchCapabilities, fetchSpeechToken, postScenarioTurn } from '../simulator/scenarioApi';
import { createSpeechClient } from './speechClient';

type Status = 'idle' | 'connecting' | 'connected' | 'listening' | string;

const DEFAULT_BROKER_BASE_URL = import.meta.env.VITE_VOICE_API_BASE_URL ?? '';

const VOICE_BY_LANG: Record<string, { language: string; voice: string }> = {
  en: { language: 'en-US', voice: 'en-US-JennyNeural' },
  de: { language: 'de-CH', voice: 'de-CH-LeniNeural' },
  fr: { language: 'fr-CH', voice: 'fr-CH-ArianeNeural' },
  it: { language: 'it-IT', voice: 'it-IT-ElsaNeural' },
};

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalS },
  status: { color: tokens.colorNeutralForeground2 },
  disclosure: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalXS, color: tokens.colorNeutralForeground3 },
});

export interface MicControlProps {
  brokerBaseUrl?: string;
}

export function MicControl({ brokerBaseUrl = DEFAULT_BROKER_BASE_URL }: MicControlProps) {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const { selectedFlight, selectedScenario } = useAppState();
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [useLive, setUseLive] = useState(false);

  const armed = selectedFlight !== null && selectedScenario !== null;

  useEffect(() => {
    let active = true;
    void fetchCapabilities(brokerBaseUrl)
      .then((c) => { if (active) setLiveAvailable(c.liveAvailable); })
      .catch(() => { if (active) setLiveAvailable(false); });
    return () => { active = false; };
  }, [brokerBaseUrl]);

  const runMockTurn = useCallback(async () => {
    if (!selectedScenario) return;
    setStatus('listening');
    const { token, region } = await fetchSpeechToken(brokerBaseUrl);
    const langKey = i18n.language.split('-')[0];
    const voice = VOICE_BY_LANG[langKey] ?? VOICE_BY_LANG.en;
    const speech = createSpeechClient({ token, region, ...voice });
    const atcTranscript = await speech.recognizeOnce();
    const turn = await postScenarioTurn(brokerBaseUrl, selectedScenario.id, atcTranscript);
    if (turn.readBackText) await speech.speak(turn.readBackText);
    setStatus('connected');
  }, [brokerBaseUrl, selectedScenario, i18n.language]);

  const handleClick = useCallback(async () => {
    if (!armed) return;
    if (useLive) {
      if (session) { session.stop(); setSession(null); setStatus('idle'); return; }
      setStatus('connecting');
      try {
        const next = await startVoiceSession(brokerBaseUrl);
        setSession(next);
        setStatus('connected');
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    try {
      await runMockTurn();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }, [armed, useLive, session, brokerBaseUrl, runMockTurn]);

  const active = session !== null;

  return (
    <div className={styles.root}>
      <Switch
        label={t('voice.engineLive')}
        checked={useLive}
        disabled={!liveAvailable}
        onChange={(_, d) => {
          // Tear down an active live session when switching back to mock so the
          // mic/connection don't leak (the mock path never calls session.stop()).
          if (!d.checked && session) {
            session.stop();
            setSession(null);
            setStatus('idle');
          }
          setUseLive(d.checked);
        }}
      />
      <Button
        appearance="primary"
        disabled={!armed}
        icon={active ? <MicOff24Regular /> : <Mic24Regular />}
        onClick={() => { void handleClick(); }}
      >
        {t('chat.talk')}
      </Button>
      <Text className={styles.status}>{armed ? status : t('chat.selectScenarioFirst')}</Text>
      <div role="note" className={styles.disclosure}>
        <Speaker224Regular aria-hidden="true" />
        <Text>{t('chat.syntheticDisclosure')}</Text>
      </div>
    </div>
  );
}
