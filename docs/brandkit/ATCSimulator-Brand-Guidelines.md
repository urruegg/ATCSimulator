# ATCSimulator — Brand Guidelines (Brand Kit v1)

## Swiss ATC Training Simulator — the official brand kit for solution branding

| Field | Value |
| --- | --- |
| **Product name** | **ATCSimulator** |
| **Meaning** | *Air Traffic Control* training **Simulator** — a virtual-pilot copilot for controller training |
| **Domain** | atcsimulator.ch *(illustrative placeholder — anonymized product)* |
| **Descriptor** | Swiss ATC Training Simulator |
| **Tagline** | *Every clearance, rehearsed — in Swiss hands.* |
| **Powered by** | Microsoft |
| **Version** | Brand Kit v1 (Sky-Blue primary) |

> **Anonymization note.** *ATCSimulator* is an anonymized product name used to protect the customer. Replace it with the final product name before any public release.

---

## 1. Vision & Mission

**Vision (North Star).** A Switzerland where every trainee air-traffic controller can rehearse **any** scenario — routine or rare, calm or high-pressure — **anytime and anywhere**, against an AI virtual pilot that speaks their language, while human instructors stay firmly in the loop for assessment. Where the academy scales training without scaling scarce, expensive Air Traffic Services staff.

**Mission.** ATCSimulator automates the **simulation-pilot role** in controller training. A vendor-agnostic, AI-powered **Virtual Simulation Pilot** hears the trainee's radio-telephony in real time, drives the simulator, and reads back the correct pilot response by voice — with **Swiss data residency, grounded and auditable AI, and Swiss precision.**

---

## 2. The Idea Behind the Mark

The icon shows a **three-step training journey rising to success**:

> **Start** (the trainee begins) → **Control** (the ATC control tower — the skill being trained) → **Cleared** (a green check — a successful, correct clearance).

A small **aircraft climbs the journey line**, and **radar arcs** sweep from the control tower — the whole purpose of the platform in one glyph: moving every trainee along a clear path to competent, confident control. **Swissness** comes from the diagonal white / control-navy split and the **Swiss cross** (the flag, not the federal shield).

---

## 3. Logo System

| Asset | File | Use |
| --- | --- | --- |
| **App icon** | `icon/atcsimulator-icon.svg` | App tile, PWA, store listings (Swiss cross + tower + journey) |
| **Standalone symbol** | `logo/atcsimulator-symbol.svg` | Avatars, favicons-in-context, watermarks |
| **Horizontal logo** | `logo/atcsimulator-logo.svg` | Default logo (symbol + wordmark + descriptor) |
| **Logo with tagline** | `logo/atcsimulator-logo-tagline.svg` | Hero, cover, presentations |
| **Favicons / app tiles** | `icon/favicons/atcsimulator-{16…1024}.png` | Browser/app icons |

**Usage.** Keep clear space around the logo (≥ the height of the symbol's success node). Place on white or very light backgrounds. Don't recolour the journey nodes, stretch/skew the mark, or crowd it. SVG is the scalable master; PNG are previews. For production, convert the wordmark to outlines.

---

## 4. Colour System (Fluent UI conformant)

**Primary = Sky Blue `#0E72B4`** (radar / sky / control — primary actions). **Secondary = Control Navy `#15324F`** (nav, headers, wordmark). Full 16-step ramps, Fluent v9 tokens, Power BI theme and the accessibility model are in **`color/ATCSimulator-Fluent-Color-System.md`** and shipped as code in `color/`.

| Role | HEX | Notes |
| --- | --- | --- |
| **Primary — Sky Blue** | `#0E72B4` | Primary buttons, active/selected, focus — **white text OK (5.14:1, AA)** |
| **Secondary — Control Navy** | `#15324F` | Nav, headers, white-text CTAs, wordmark (13:1 AAA) |
| Success — Clearance Green | `#22B07B` | Success / "cleared" — **dark text on green** |
| Danger — Swiss Red | `#E30613` | Error/critical only (also the Swiss cross in the logo) |
| Warning — Taxiway Amber | `#E8A200` | Warnings / caution — dark text |
| Info — Radar Teal | `#1FA9D6` | Informational chips/tips |
| Accent — Beacon Violet | `#5A6CF0` | Decorative / data-viz |
| Text — Ink / Slate | `#173250` / `#5D6C7B` | Primary / secondary text |

> **Accessibility rule (computed):** Sky Blue `#0E72B4` **supports white text** (5.14:1, AA), so primary buttons use white labels. **Never** put white text on **green** or **amber** — use **dark text** on those status fills; **Swiss Red** keeps **white** text for critical alerts. Sky-Blue **links** on white use `#0E72B4` (5.14:1). This is pre-wired in `color/atcsimulator-theme.ts`.

Colour deliverables in `color/`: `atcsimulator-theme.ts` (Fluent v9 theme), `atcsimulator-tokens.json`, `atcsimulator-tokens.css`, `atcsimulator-powerbi-theme.json`, `atcsimulator-color-swatches.png`.

---

## 5. Typography

- **Wordmark & headings:** Segoe UI Bold (Microsoft's brand typeface). Fallbacks: Helvetica Neue, Arial.
- **Descriptor:** Segoe UI Semibold, uppercase, letter-spaced.
- **Body / UI:** Segoe UI (Fluent default).

---

## 6. Legal & Clearance Notes

1. **Swiss coat of arms.** Use the **Swiss cross / flag** (as in the assets), **not the federal shield** — the shield is reserved for the Confederation. Ensure the brand is not misleading as to official origin, and that it is **not** presented as connected to live/operational air navigation (ATCSimulator is a **training** product only). Obtain **legal review** before public release.
2. **Name / domain.** `atcsimulator.ch` is an **illustrative placeholder** for this anonymized product — register the final name and complete **trademark clearance** (CH/EU, aviation-training & software classes) before production use.
3. **Microsoft / Copilot.** The mark is original (inspired by, not copied from, Microsoft assets). Use of "Powered by Microsoft" follows Microsoft brand & partner guidelines.

---

## 7. Kit Contents

```text
ATCSimulator-BrandKit-v1/
├─ ATCSimulator-Brand-Guidelines.(md|docx)   ← this document
├─ README.(md|docx)                           ← quick index
├─ logo/     atcsimulator-logo, -logo-tagline, -symbol  (.svg + .png)
├─ icon/     atcsimulator-icon (.svg + .png) + favicons/ (16–1024 px)
└─ color/    atcsimulator-theme.ts, -tokens.json, -tokens.css,
             atcsimulator-powerbi-theme.json, atcsimulator-color-swatches.png,
             ATCSimulator-Fluent-Color-System.(md|docx)
```

*Brand Kit v1. SVG files are the scalable masters; PNGs are convenience previews.*
