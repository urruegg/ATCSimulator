import { useEffect, useMemo, useState } from 'react';
import { Combobox, Field, Option, makeStyles, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../../state/AppStateContext';
import { fetchScenarios } from './scenarioApi';
import type { ScenarioSummary } from './types';

const useStyles = makeStyles({
  root: { paddingBottom: tokens.spacingVerticalS },
});

export interface ScenarioPickerProps {
  voiceBaseUrl: string;
}

/** Localized title for the current UI language, falling back to English. */
function titleFor(scenario: ScenarioSummary, lang: string): string {
  return scenario.title[lang] ?? scenario.title[lang.split('-')[0]] ?? scenario.title.en ?? scenario.id;
}

/**
 * Searchable dropdown of simulator scenarios. Placed on the Chat/simulator
 * view between the selected-flight header and the mic. Selecting a scenario is
 * a prerequisite for arming the microphone (gating: aircraft → scenario → mic).
 */
export function ScenarioPicker({ voiceBaseUrl }: ScenarioPickerProps) {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const { selectedScenario, setSelectedScenario } = useAppState();
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);

  useEffect(() => {
    let active = true;
    void fetchScenarios(voiceBaseUrl)
      .then((list) => { if (active) setScenarios(list); })
      .catch(() => { if (active) setScenarios([]); });
    return () => { active = false; };
  }, [voiceBaseUrl]);

  const lang = i18n.language;
  const selectedText = useMemo(
    () => (selectedScenario ? titleFor(selectedScenario, lang) : ''),
    [selectedScenario, lang],
  );

  return (
    <div className={styles.root}>
      <Field label={t('scenario.label')}>
        <Combobox
          aria-label={t('scenario.label')}
          placeholder={t('scenario.placeholder')}
          value={selectedText}
          selectedOptions={selectedScenario ? [selectedScenario.id] : []}
          onOptionSelect={(_, data) => {
            const next = scenarios.find((s) => s.id === data.optionValue) ?? null;
            setSelectedScenario(next);
          }}
        >
          {scenarios.map((s) => (
            <Option key={s.id} value={s.id} text={titleFor(s, lang)}>
              {titleFor(s, lang)}
            </Option>
          ))}
        </Combobox>
      </Field>
    </div>
  );
}
