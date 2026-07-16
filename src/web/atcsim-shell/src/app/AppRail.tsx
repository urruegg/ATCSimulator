import { NavLink } from 'react-router-dom';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { Chat24Regular, Map24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

const useStyles = makeStyles({
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '64px',
    flexShrink: 0,
    rowGap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalM,
    borderRight: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: tokens.spacingVerticalXXS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    borderRadius: tokens.borderRadiusMedium,
  },
  itemActive: {
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorNeutralBackground1Selected,
    fontWeight: tokens.fontWeightSemibold,
  },
});

interface RailItem {
  to: string;
  labelKey: string;
  icon: JSX.Element;
}

export function AppRail() {
  const styles = useStyles();
  const { t } = useTranslation();

  const items: RailItem[] = [
    { to: '/', labelKey: 'nav.map', icon: <Map24Regular aria-hidden /> },
    { to: '/chat', labelKey: 'nav.chat', icon: <Chat24Regular aria-hidden /> },
  ];

  return (
    <nav className={styles.rail} aria-label={t('app.title')}>
      {items.map((item) => {
        const label = t(item.labelKey);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              mergeClasses(styles.item, isActive && styles.itemActive)
            }
          >
            {item.icon}
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}