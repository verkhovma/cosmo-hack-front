---
name: CosmoHack Roscosmos
description: Engineering tool for satellite constellation design in Roscosmos 2025 brand style
colors:
  primary: "#EF3443"
  on-primary: "#FFFFFF"
  secondary: "#545B62"
  on-secondary: "#FFFFFF"
  orbital-blue: "#1A2654"
  orbital-light: "#1E58D8"
  mist: "#92A8B4"
  azure: "#598EBC"
  neutral: "#F5F7F9"
  ink: "#10141A"
  on-ink: "#FFFFFF"
typography:
  h1:
    fontFamily: Stapel
    fontSize: 2.125rem
    fontWeight: 500
    lineHeight: 2.25rem
  h2:
    fontFamily: Stapel
    fontSize: 1.25rem
    fontWeight: 500
    lineHeight: 1.375rem
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
  map-caption:
    fontFamily: Inter
    fontSize: 0.625rem
    fontWeight: 400
    lineHeight: 0.75rem
  label-caps:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 500
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.md}"
  map-canvas:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  surface:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
  accent-info:
    backgroundColor: "{colors.orbital-blue}"
    textColor: "{colors.on-ink}"
  availability-ok:
    backgroundColor: "{colors.orbital-light}"
    textColor: "{colors.on-primary}"
  availability-gap:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  caption-muted:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.mist}"
  route-active:
    backgroundColor: "{colors.azure}"
    textColor: "{colors.ink}"
---

## Overview

Engineering instrument in Roscosmos 2025 corporate style: light workspace plus dark orbital map. Gradient line patterns (orbital trajectories, star glow) serve as background or accent, conveying scale and forward motion. Layout follows TZ §5: left config panel, central map, bottom timeline, right comparison panel.

## Colors

Palette rooted in Roscosmos primary identity with controlled blue accents.

- **Primary (#EF3443) "Cosmic scarlet" 185C:** logo, key actions, gap indicators. Tints 80/60/40% allowed.
- **Secondary (#545B62) "Cosmic grey" 431C:** secondary actions, body text on light surfaces. Tints 80/60/40% allowed.
- **Orbital blue (#1A2654) 2955C:** dark info surfaces, never in logo.
- **Orbital light (#1E58D8) 2935C:** infographics accent, availability-ok bars, never in logo.
- **Mist (#92A8B4) 5435C:** borders, captions, muted metadata.
- **Azure (#598EBC) 542C:** secondary accent, active route line.
- **Neutral (#F5F7F9):** light app workspace background (agent choice, not from guide).
- **Ink (#10141A):** dark map canvas so satellites and routes stay legible.

## Typography

- **Stapel Medium (Regular, Medium):** headings and large display text, Cyrillic + Latin. Type scale multiple of 4.
- **Inter (Regular, Italic, Medium, Bold):** UI text, documents, presentations, marketing. Body raised to 14px/20px for screen legibility; 10pt/12pt kept as `map-caption` for map labels only.
- **Verdana (Italic, Bold):** system fallback only when brand fonts cannot be installed (old office software). Must not replace brand type in primary communications.
- **A4 reference grid:** H1 Stapel Medium 34/36, H2 Stapel Medium 20/22, body Inter 10/12.

## Layout

- 8px grid; section gaps 16/24/32px (`spacing.md/lg/xl`).
- Workstation: left configuration forms (launch stage, RAAN, phase, outages), center map/scheme with satellite labels, bottom timeline with availability diagram, right variant-comparison panel.
- Block rhythm: empty leading line per A4 guide maps to `spacing.md` between cards.

## Elevation & Depth

Flat engineering UI. No decorative shadows; single shadow level reserved for map tooltips and modals over the map canvas.

## Shapes

- `sm` 4px: inputs, chips, badges.
- `md` 8px: buttons, cards, panels.
- `lg` 12px: map container, comparison cards.
- No pill-shaped buttons, no brutalist borders; keep rectangular-industrial character of Stapel.

## Components

- **button-primary:** scarlet fill, white text, md radius — run calculation, save variant.
- **button-secondary:** grey fill, white text, md radius — reset, secondary actions.
- **map-canvas:** ink background for satellites, ground sites, ISL links, selected route.
- **surface:** neutral workspace cards hosting forms and tables.
- **availability-ok / availability-gap:** timeline bars — blue for link, scarlet for outage (max-break emphasis).
- **route-active:** azure line for selected client→gateway path.
- **caption-muted / accent-info:** mist captions on neutral; white text on orbital-blue info banners.

## Do's and Don'ts

- Do use scarlet + grey as the identity base across print, digital, navigation, docs.
- Do use blues only for accents, infographics, illustrations, interface helpers.
- Don't use additional (blue) colors in the logo or key identity graphics.
- Don't set primary communications in Verdana; it is a technical fallback only.
- Don't place foreign elements inside the logo clear space (height of letter "Р"); keep proportions and brand colors for avatar/icon/favicon use.
