import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import { Person24Regular } from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import { useTranslation } from 'react-i18next';

export function UserMenu() {
  const { t } = useTranslation();
  const { instance, accounts } = useMsal();
  const displayName = accounts[0]?.name ?? accounts[0]?.username ?? '';

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button appearance="subtle" icon={<Person24Regular />}>
          {displayName}
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem onClick={() => void instance.logoutRedirect()}>
            {t('header.signOut')}
          </MenuItem>
          <MenuItem onClick={() => void instance.loginRedirect()}>
            {t('header.switchAccount')}
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}