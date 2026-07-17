// ATCSimulator - Fluent UI v9 theme. PRIMARY brand = Sky Blue #0E72B4; SECONDARY = Control Navy #15324F.
import { BrandVariants, createLightTheme, createDarkTheme, Theme } from '@fluentui/react-components';

export const atcSimulatorBrand: BrandVariants = {
  10: '#031724',
  20: '#05273D',
  30: '#073655',
  40: '#08436A',
  50: '#0A507E',
  60: '#0B5B90',
  70: '#0D67A2',
  80: '#0E72B4',
  90: '#398BC2',
  100: '#65A5CF',
  110: '#8BBBDB',
  120: '#ABCEE5',
  130: '#C5DDED',
  140: '#DDEBF4',
  150: '#EEF5FA',
  160: '#FAFAFB'
};          // #0E72B4 = brand[80]
export const atcSimulatorSecondary = {"10": "#040A10", "20": "#07111B", "30": "#0A1825", "40": "#0C1E2F", "50": "#0F2337", "60": "#11283F", "70": "#132D47", "80": "#15324F", "90": "#3F576F", "100": "#697C8E", "110": "#8F9DAB", "120": "#ADB7C1", "130": "#C7CED5", "140": "#DEE2E6", "150": "#EFF1F3", "160": "#FAFAFB"};        // navy: nav/headers/wordmark/white-text CTAs

// Sky Blue #0E72B4 supports WHITE text (5.14:1, AA). Green/amber status fills use dark text.
const brandFix: Partial<Theme> = {
  colorNeutralForegroundOnBrand: '#FFFFFF',
  colorBrandForegroundLink: '#0E72B4',
  colorBrandForegroundLinkHover: '#0D67A2',
} as Partial<Theme>;

const statusLight: Partial<Theme> = {
  colorStatusSuccessForeground1: '#187B56', colorStatusSuccessBackground3: '#22B07B', colorStatusSuccessBackground1: '#F0F9F6',
  colorStatusDangerForeground1: '#E8333D', colorStatusDangerBackground3: '#E30613', colorStatusDangerBackground1: '#FDEEEE',
  colorStatusWarningForeground1: '#ECB32E', colorStatusWarningBackground3: '#E8A200',
} as Partial<Theme>;

export const atcSimulatorLightTheme: Theme = { ...createLightTheme(atcSimulatorBrand), ...brandFix, ...statusLight };
export const atcSimulatorDarkTheme:  Theme = { ...createDarkTheme(atcSimulatorBrand), ...brandFix };
// <FluentProvider theme={atcSimulatorLightTheme}><App/></FluentProvider>
