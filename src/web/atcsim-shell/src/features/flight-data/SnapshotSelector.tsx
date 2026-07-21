import { useEffect, useMemo, useState, type JSX } from 'react';
import { Combobox, Field, Option, makeStyles, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../../state/AppStateContext';
import { fetchSnapshots, type SnapshotInfo } from './flightFeedApi';

const useStyles = makeStyles({
  root: { paddingBottom: tokens.spacingVerticalS },
  empty: { color: tokens.colorNeutralForeground3 },
});

function labelFor(snapshot: SnapshotInfo): string {
  const date = new Date(snapshot.capturedAt);
  return Number.isNaN(date.getTime()) ? snapshot.id : date.toLocaleString();
}

export function SnapshotSelector(): JSX.Element | null {
  const styles = useStyles();
  const { t } = useTranslation();
  const { selectedSnapshotId, setSelectedSnapshotId } = useAppState();
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);

  useEffect(() => {
    let active = true;
    void fetchSnapshots()
      .then((list) => { if (active) setSnapshots(list); })
      .catch(() => { if (active) setSnapshots([]); });
    return () => { active = false; };
  }, []);

  const recentSnapshots = useMemo(() => snapshots.slice(0, 10), [snapshots]);
  const selectedText = useMemo(() => {
    const selected = recentSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId);
    return selected ? labelFor(selected) : '';
  }, [recentSnapshots, selectedSnapshotId]);

  if (recentSnapshots.length === 0) {
    return (
      <div className={styles.root}>
        <Field label={t('feed.snapshot.label')}>
          <div className={styles.empty}>{t('feed.snapshot.none')}</div>
        </Field>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Field label={t('feed.snapshot.label')}>
        <Combobox
          aria-label={t('feed.snapshot.label')}
          placeholder={t('feed.snapshot.placeholder')}
          value={selectedText}
          selectedOptions={selectedSnapshotId ? [selectedSnapshotId] : []}
          onOptionSelect={(_, data) => {
            setSelectedSnapshotId(data.optionValue ?? null);
          }}
        >
          {recentSnapshots.map((snapshot) => {
            const label = labelFor(snapshot);
            return (
              <Option key={snapshot.id} value={snapshot.id} text={label}>
                {label}
              </Option>
            );
          })}
        </Combobox>
      </Field>
    </div>
  );
}
