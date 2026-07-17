import { Button } from '@fluentui/react-components';
import { WeatherMoon24Regular, WeatherSunny24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../../state/AppStateContext';

/** Header control to switch between the ATCSimulator light and dark brand themes. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { themeMode, toggleThemeMode } = useAppState();
  const isDark = themeMode === 'dark';
  const label = isDark ? t('header.lightMode') : t('header.darkMode');
  return (
    <Button
      appearance="subtle"
      icon={isDark ? <WeatherSunny24Regular /> : <WeatherMoon24Regular />}
      aria-label={label}
      title={label}
      onClick={toggleThemeMode}
    />
  );
}
