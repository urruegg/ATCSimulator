import { NavLink } from 'react-router-dom';
import { Button, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { Chat24Regular, Map24Regular, Navigation24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../state/AppStateContext';

const useStyles = makeStyles({
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '56px',
    flexShrink: 0,
    rowGap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
    borderRight: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    transitionProperty: 'width',
    transitionDuration: tokens.durationNormal,
  },
  railExpanded: {
    width: '208px',
  },
  toggle: {
    alignSelf: 'flex-start',
    marginBottom: tokens.spacingVerticalXS,
  },
  item: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    borderRadius: tokens.borderRadiusMedium,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  itemCollapsed: {
    justifyContent: 'center',
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
  const { railExpanded, toggleRail } = useAppState();

  const items: RailItem[] = [
    { to: '/', labelKey: 'nav.map', icon: <Map24Regular aria-hidden /> },
    { to: '/chat', labelKey: 'nav.chat', icon: <Chat24Regular aria-hidden /> },
  ];

  return (
    <nav
      className={mergeClasses(styles.rail, railExpanded && styles.railExpanded)}
      aria-label={t('app.title')}
    >
      <Button
        className={styles.toggle}
        appearance="subtle"
        icon={<Navigation24Regular />}
        aria-label={railExpanded ? t('nav.collapse') : t('nav.expand')}
        aria-expanded={railExpanded}
        title={railExpanded ? t('nav.collapse') : t('nav.expand')}
        onClick={toggleRail}
      />
      {items.map((item) => {
        const label = t(item.labelKey);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            aria-label={label}
            title={label}
            className={({ isActive }) =>
              mergeClasses(
                styles.item,
                !railExpanded && styles.itemCollapsed,
                isActive && styles.itemActive,
              )
            }
          >
            {item.icon}
            {railExpanded && <span>{label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}