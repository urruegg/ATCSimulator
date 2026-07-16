import { Dropdown, Option, makeStyles, tokens } from '@fluentui/react-components';
import { Globe24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useAppState } from '../../state/AppStateContext';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Fran\u00e7ais' },
  { code: 'it', label: 'Italiano' },
] as const;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
  },
});

export function LanguagePicker() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language, setLanguage } = useAppState();

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const handleSelect = (code?: string): void => {
    if (!code) return;
    void i18n.changeLanguage(code);
    setLanguage(code);
  };

  return (
    <div className={styles.root}>
      <Globe24Regular aria-hidden="true" />
      <Dropdown
        aria-label={t('header.language')}
        value={current.label}
        selectedOptions={[current.code]}
        onOptionSelect={(_, data) => handleSelect(data.optionValue)}
      >
        {LANGUAGES.map((l) => (
          <Option key={l.code} value={l.code} text={l.label}>
            {l.label}
          </Option>
        ))}
      </Dropdown>
    </div>
  );
}