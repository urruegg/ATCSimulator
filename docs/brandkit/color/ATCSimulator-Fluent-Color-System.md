# ATCSimulator — Fluent UI Color System (Brand Kit extension)

## Fluent 2 / Fluent UI v9 colour schema — **primary = Sky Blue `#0E72B4`**, secondary = Control Navy `#15324F`

| Field | Value |
| --- | --- |
| **Prepared for** | Urs Rüegg — Sr Solution Engineer Hub, Microsoft |
| **Primary brand** | Sky Blue `#0E72B4` = `brand[80]` (Fluent `colorBrandBackground`) |
| **Secondary brand** | Control Navy `#15324F` (nav, headers, wordmark, white-text actions) |
| **Status** | Draft v1.0 |

---

## 1. Overview

The palette is built for a **Swiss air-traffic-control training** product. **Sky Blue `#0E72B4`** (radar / sky / control) is the **primary** brand at `brand[80]`; **Control Navy `#15324F`** is the **secondary** (navigation, headers, wordmark). **Swiss Red `#E30613`** is the flag accent and the danger colour; **Clearance Green `#22B07B`** marks success / "cleared".

> **Accessibility, computed:** Sky Blue `#0E72B4` **supports white text** (5.14:1 — AA), so primary buttons can use white labels. Clearance Green is a status fill — use **dark text on green** (4.70:1) since white on green is 2.78:1. Green **text/links** on white use `success[50]` `#187B56`. Sky-Blue **links** on white use `brand[80]` `#0E72B4` (5.14:1).

## 2. Colour ramps (10 → 160)

| Step | Sky Blue (PRIMARY) | Navy | Green | Teal | Violet | Red | Amber | Grey |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **10** | `#031724` | `#040A10` | `#072319` | `#06222B` | `#121630` | `#2D0104` | `#2E2000` | `#161819` |
| **20** | `#05273D` | `#07111B` | `#0C3C2A` | `#0B3949` | `#1F2552` | `#4D0206` | `#4F3700` | `#25282B` |
| **30** | `#073655` | `#0A1825` | `#10533A` | `#0F4F65` | `#2A3371` | `#6B0309` | `#6D4C00` | `#33373C` |
| **40** | `#08436A` | `#0C1E2F` | `#146849` | `#12647E` | `#35408E` | `#86040B` | `#896000` | `#40464B` |
| **50** | `#0A507E` | `#0F2337` | `#187B56` | `#167696` | `#3F4CA8` | `#9F040D` | `#A27100` | `#4C5359` |
| **60** | `#0B5B90` | `#11283F` | `#1B8D62` | `#1987AB` | `#4856C0` | `#B6050F` | `#BA8200` | `#565E66` |
| **70** | `#0D67A2` | `#132D47` | `#1F9E6F` | `#1C98C1` | `#5161D8` | `#CC0511` | `#D19200` | `#616A72` |
| **80** | `#0E72B4` | `#15324F` | `#22B07B` | `#1FA9D6` | `#5A6CF0` | `#E30613` | `#E8A200` | `#6C767F` |
| **90** | `#398BC2` | `#3F576F` | `#4ABE93` | `#47B8DD` | `#7886F3` | `#E8333D` | `#ECB32E` | `#868F96` |
| **100** | `#65A5CF` | `#697C8E` | `#72CCAB` | `#70C8E5` | `#95A1F5` | `#ED6068` | `#F0C35C` | `#A1A7AD` |
| **110** | `#8BBBDB` | `#8F9DAB` | `#95D9C0` | `#93D6EB` | `#B0B8F8` | `#F2878E` | `#F4D285` | `#B8BDC2` |
| **120** | `#ABCEE5` | `#ADB7C1` | `#B2E3D1` | `#B1E1F1` | `#C5CCFA` | `#F5A8AC` | `#F7DEA6` | `#CCCFD2` |
| **130** | `#C5DDED` | `#C7CED5` | `#CAECDF` | `#C9EAF5` | `#D7DCFB` | `#F8C3C6` | `#F9E9C2` | `#DCDEE0` |
| **140** | `#DDEBF4` | `#DEE2E6` | `#E0F4ED` | `#E0F3F9` | `#E8EAFD` | `#FBDCDE` | `#FCF2DB` | `#EAECED` |
| **150** | `#EEF5FA` | `#EFF1F3` | `#F0F9F6` | `#EFF9FC` | `#F3F5FE` | `#FDEEEE` | `#FDF8ED` | `#F5F5F6` |
| **160** | `#FAFAFB` | `#FAFAFB` | `#FAFAFB` | `#FAFAFB` | `#FAFAFB` | `#FAFAFB` | `#FAFAFB` | `#FAFAFB` |

## 3. Semantic token mapping (Fluent v9)

`createLightTheme(atcSimulatorBrand)` sets brand tokens; the theme file overrides on-brand text + status tokens (`atcsimulator-theme.ts`).

| Fluent token | Value | Use |
| --- | --- | --- |
| `colorBrandBackground` | `#0E72B4` | Primary buttons / selection — **white text OK** |
| `colorBrandBackgroundHover` | `#0D67A2` | Primary hover |
| `colorBrandBackgroundPressed` | `#0B5B90` | Primary pressed |
| `colorNeutralForegroundOnBrand` | `#FFFFFF` | Text/icon on Sky Blue |
| `colorBrandForegroundLink` | `#0E72B4` | Sky-Blue links/text on white (accessible) |
| `secondary · background` | `#15324F` | Nav, headers, white-text buttons (navy) |
| `secondary · foreground` | `#3F576F` | Secondary text/links on white |
| `colorNeutralForeground1` | `#173250` | Primary text (Ink) |
| `colorNeutralForeground2` | `#5D6C7B` | Secondary text (Slate) |
| `colorStatusSuccessForeground1` | `#187B56` | Success text (green) |
| `colorStatusSuccessBackground3` | `#22B07B` | Success fill (dark text) |
| `colorStatusDangerForeground1` | `#E8333D` | Error text |
| `colorStatusDangerBackground3` | `#E30613` | Error/critical fill (white text) |
| `colorStatusWarningForeground1` | `#ECB32E` | Warning text |
| `custom · info` | `#1FA9D6` | Informational chips (teal) |
| `custom · accent` | `#5A6CF0` | Decorative / data-viz (violet) |

## 4. Data-visualization palette (Power BI & charts)

`atcsimulator-powerbi-theme.json` ships these `dataColors` (Sky Blue leads); KPI status **good=`#22B07B` · neutral=`#E8A200` · bad=`#E30613`**.

| # | HEX |
| --- | --- |
| 1 | `#0E72B4` |
| 2 | `#15324F` |
| 3 | `#1FA9D6` |
| 4 | `#5A6CF0` |
| 5 | `#22B07B` |
| 6 | `#E30613` |
| 7 | `#E8A200` |
| 8 | `#B8BDC2` |

## 5. Accessibility (WCAG contrast, computed)

| Pair | Ratio | Verdict |
| --- | --- | --- |
| White text on Sky Blue[80] (primary) | 5.14:1 | AA |
| White text on Control Navy[80] (secondary) | 13.12:1 | AAA |
| White text on Swiss Red[80] (danger) | 4.88:1 | AA |
| Sky-Blue link [80] on white | 5.14:1 | AA |
| Dark text (Ink) on Clearance Green[80] | 4.70:1 | AA |
| White text on Clearance Green[80] | 2.78:1 | Fail |
| Ink #173250 text on white | 13.06:1 | AAA |

**Takeaway:** Sky Blue supports white-text primary buttons; use **dark text on green/amber** status fills; Swiss Red keeps white text for critical alerts.

## 6. Usage & do/don'ts

- **Primary = Sky Blue**: primary buttons, active/selected, focus — white text is fine.
- **Secondary = Control Navy**: top nav, headers, the wordmark, and any dark solid surface.
- **Swiss Red** = **error/critical only** in UI (also the Swiss cross in the logo — keep it for alarm meaning).
- **Clearance Green** = success / "cleared"; **Teal** = info/tips; **Violet** = decorative & data-viz; **Amber** = warning/caution.
- Don't fill large surfaces with saturated Sky Blue — use `150/160` tints or neutral; never put white text on green or amber.

## 7. Files

| File | Purpose |
| --- | --- |
| `atcsimulator-theme.ts` | Fluent v9 BrandVariants (Sky Blue) + light/dark themes + on-brand & status overrides |
| `atcsimulator-tokens.json` | All ramps + semantic aliases + data-viz (source of truth) |
| `atcsimulator-tokens.css` | CSS `--atc-*` custom properties |
| `atcsimulator-powerbi-theme.json` | Power BI theme (Sky-Blue-led) |
| `atcsimulator-color-swatches.png` | Visual reference of all ramps |

## 8. Integration

```tsx
import { FluentProvider } from '@fluentui/react-components';
import { atcSimulatorLightTheme } from './atcsimulator-theme';
<FluentProvider theme={atcSimulatorLightTheme}><App /></FluentProvider>
```
