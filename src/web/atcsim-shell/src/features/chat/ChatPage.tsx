import { useTranslation } from 'react-i18next';
import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { Airplane24Regular, Headset24Regular } from '@fluentui/react-icons';
import { SelectedFlightHeader } from '../flight-data/SelectedFlightHeader';
import { MicControl } from './MicControl';
import { useLiveTranscript, type TranscriptEntry } from './useLiveTranscript';

const VOICE_BASE_URL = import.meta.env.VITE_VOICE_API_BASE_URL ?? '';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    rowGap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalM,
    boxSizing: 'border-box',
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    columnGap: tokens.spacingHorizontalM,
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    rowGap: tokens.spacingVerticalS,
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    position: 'sticky',
    top: 0,
    paddingBottom: tokens.spacingVerticalXS,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  messages: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalS,
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  bubbleRight: {
    alignSelf: 'flex-end',
    maxWidth: '90%',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
  },
});

/** ATC = trainee/controller side (left column). */
function isAtc(role: string): boolean {
  const r = role.toLowerCase();
  return r.startsWith('atc') || r.startsWith('controller');
}

/** Pilot = virtual-pilot/agent side (right column). */
function isPilot(role: string): boolean {
  const r = role.toLowerCase();
  return r.startsWith('pilot') || r.startsWith('agent');
}

/**
 * Two-column live chat view for the ZRH real-flight scenario.
 *
 * Left column = ATC (trainee/controller R/T); right column = virtual pilot
 * read-back. Transcript entries stream in via `useLiveTranscript`; the
 * synthetic-voice disclosure lives in `MicControl` (DP-16). No personal audio
 * is rendered — text transcripts only.
 */
export function ChatPage() {
  const styles = useStyles();
  const { t } = useTranslation();
  const entries = useLiveTranscript(VOICE_BASE_URL);

  const atcEntries = entries.filter((e) => isAtc(e.role));
  const pilotEntries = entries.filter((e) => isPilot(e.role));

  const renderBubbles = (list: TranscriptEntry[], side: 'left' | 'right') => (
    <div className={styles.messages}>
      {list.map((entry, index) => (
        <div
          key={`${entry.ts}-${index}`}
          className={side === 'left' ? styles.bubbleLeft : styles.bubbleRight}
        >
          <Text>{entry.text}</Text>
        </div>
      ))}
    </div>
  );

  return (
    <div data-testid="chat-page" className={styles.root}>
      <SelectedFlightHeader />
      <div className={styles.columns}>
        <section className={styles.column} aria-label={t('chat.atc')}>
          <div className={styles.columnHeader}>
            <Headset24Regular aria-hidden="true" />
            <Text weight="semibold">{t('chat.atc')}</Text>
          </div>
          {renderBubbles(atcEntries, 'left')}
        </section>
        <section className={styles.column} aria-label={t('chat.pilot')}>
          <div className={styles.columnHeader}>
            <Airplane24Regular aria-hidden="true" />
            <Text weight="semibold">{t('chat.pilot')}</Text>
          </div>
          {renderBubbles(pilotEntries, 'right')}
        </section>
      </div>
      <MicControl brokerBaseUrl={VOICE_BASE_URL} />
    </div>
  );
}

