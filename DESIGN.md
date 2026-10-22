---
name: Senswave Mobile
description: Native Android smart-home UI with shared light/dark theme roles and task-focused controls.
colors:
  canvas-light: "#F9F7F1"
  canvas-dark: "#100D08"
  foreground-light: "#1B1610"
  foreground-dark: "#EEEBE5"
  surface-light: "#F9F7F1"
  surface-dark: "#211D16"
  muted-light: "#615A50"
  muted-dark: "#AAA498"
  accent-light: "#F7B817"
  accent-dark: "#FBC031"
  on-accent: "#321A03"
  secondary-light: "#33363F"
  secondary-dark: "#2A2A2A"
  on-secondary-light: "#F5F5F5"
  on-secondary-dark: "#E0E0E0"
  destructive-light: "#B42318"
  destructive-dark: "#FF5252"
  border-light: "#8C857A"
  border-dark: "#847C70"
  focus-light: "#009286"
  focus-dark: "#47BAAC"
  tile-light: "#FFFEFA"
  tile-border-light: "#D8D2C7"
  tile-border-dark: "#484136"
  tile-subtle-light: "#F0ECE3"
typography:
  body:
    fontFamily: "Roboto"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  label:
    fontFamily: "Roboto"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  support:
    fontFamily: "Roboto"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  metadata:
    fontFamily: "Roboto"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
  readout:
    fontFamily: "Roboto"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: "32px"
rounded:
  native-card: "8px"
  status: "5px"
  device-tile: "12px"
spacing:
  compact-alert-icon-gap: "8px"
  tile-action-feedback-gap: "12px"
  tile-content-inset: "12px"
components:
  device-tile-light:
    backgroundColor: "{colors.tile-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.device-tile}"
    padding: "{spacing.tile-content-inset}"
  device-tile-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.device-tile}"
    padding: "{spacing.tile-content-inset}"
  compact-alert-light:
    textColor: "{colors.destructive-light}"
    typography: "{typography.support}"
    padding: "0"
  compact-alert-dark:
    textColor: "{colors.destructive-dark}"
    typography: "{typography.support}"
    padding: "0"
---

# Design System: Senswave Mobile

## Overview

**Creative North Star: "Senswave's existing native smart-home interface"**

This record captures the incumbent Android interface. Material Design 3 guides interaction, hierarchy, adaptive behavior and accessibility; the existing Senswave web product supplies the visual language. Native screens use React Native, the shared `ThemeProvider` and local React Native Reusables components.

Light and dark semantic roles set the app canvas, reusable surfaces, fields, focus and destructive feedback. Device tiles keep controls on neutral surfaces, use the existing amber action role, and show command failures inside the affected tile. This document records the implemented system and does not establish a new identity or visual direction.

**Key Characteristics:**
- Native system typography and controls.
- Shared light/dark theme roles feed React Native Reusables semantic colors.
- Device tiles use a quiet fill and outline; error feedback stays local and allows the tile to grow.

## Colors

The light and dark values come from `ThemeProvider`; the root layout maps those roles into NativeWind semantic tokens. The frontmatter records the shell roles and the additional device-tile colors used by this surface. Specialized data-source status tones and other legacy theme roles remain defined in `ThemeProvider` and the mobile UI guide.

### Primary
- **Amber action:** `accent-light` and `accent-dark` color editable controls; `on-accent` supplies their foreground.
- **Teal focus:** `focus-light` and `focus-dark` identify keyboard focus.

### Secondary
- **Charcoal secondary:** `secondary-light` and `secondary-dark` support the existing secondary role; their foregrounds are `on-secondary-light` and `on-secondary-dark`.

### Neutral
- **Canvas:** `canvas-light` and `canvas-dark` are shared screen and safe-area backgrounds.
- **Foreground and muted text:** `foreground-*` and `muted-*` preserve readable hierarchy in both themes.
- **Surface and edge:** `surface-*` and `border-*` back reusable fields, cards and outlines.
- **Device tiles:** `tile-light`, `tile-border-*` and `tile-subtle-light` cover the dedicated light tile surface, its outline and the quiet selection fill. In dark mode, the field surface also supplies the tile and subtle roles.
- **Destructive feedback:** `destructive-light` and `destructive-dark` supply the semantic error role.

**The Shared Theme Role Rule.** Keep app-shell and reusable semantic colors derived from the existing light/dark `ThemeProvider` roles.

## Typography

**Display Font:** No separate display face is defined; Android uses its native system sans face (Roboto).
**Body Font:** Android system sans (Roboto).

**Character:** Native system type keeps device names, values and recovery text legible without a decorative display layer. Styles retain normal system text scaling.

### Hierarchy
- **Body** (`typography.body`): general native interface copy.
- **Label** (`typography.label`): device identity and concise control labels.
- **Support** (`typography.support`): wrapping helper and action-error copy.
- **Metadata** (`typography.metadata`): room and secondary context.
- **Readout** (`typography.readout`): prominent numeric device values.

## Layout

Metro sets NativeWind's `inlineRem` to 16, so rem-based utility sizes resolve from a 16 dp base; numeric React Native `StyleSheet` values are dp. Device tiles adapt between grid cards and open list rows: grid tiles have a 112 dp minimum height, while list rows have an 84 dp minimum and use a sibling boundary. Grid cards keep their inset and control spacing; Slider controls span the grid row and retain their content alignment. No fixed error height is used.

The compact-alert tokens define its icon gap, the space after a control, and the tile content inset. They apply to the device-action feedback pattern, not as a new global spacing scale.

## Elevation & Depth

Device tiles and compact action alerts are flat. Grid tiles use their theme surface and outline; list rows remain open with a quiet boundary between siblings. This is scoped to device tiles: other app components retain their existing shadow helpers.

## Shapes

Device grid tiles use gently rounded corners (`rounded.device-tile`); list rows remain square and open. Existing Reusables cards use the native card radius, while status chips keep a tighter corner. The compact error has no container shape because it has no separate card, border or background.

## Components

### Alerts

- **Default Alert:** Keep the existing local Reusables card appearance and API for forms and other callers: themed card surface and border, rounded corners, and its current internal spacing. Compact mode is opt-in.
- **Compact device action alert:** `compact` removes the card surface, border, absolute icon placement and internal padding. The `CircleAlert` icon stays in normal flow, aligns with the first text line and uses `spacing.compact-alert-icon-gap`; copy uses `typography.support` and wraps with native font scaling. Compact copy inherits the full semantic destructive color: in dark mode, `#FF5252` on `#211D16` measures 5.2562:1. Existing noncompact descriptions retain their established destructive/90 styling.
- **Placement:** Put feedback below the affected control using `spacing.tile-action-feedback-gap`. Switch and Options stay within their existing tile gutter. Slider spans its control area, so its feedback uses `spacing.tile-content-inset` on both sides.
- **Recovery:** Keep failure text local and persistent under existing action rules. The existing control remains the retry path; the alert adds no button, toast or dialog.

**The Opt-In Alert Rule.** Tile errors use the compact variant; existing non-tile Alerts retain their bordered card treatment.

### Device Tiles

- **Grid:** Themed tile fill and outline, a 12 dp content inset, rounded corners and a 112 dp minimum height.
- **List:** Transparent, square rows with an 84 dp minimum height; keep the existing boundary only between siblings.
- **Controls:** Keep controls within the tile's current layout. Errors wrap and expand the tile instead of overlaying or clipping its contents.

## Do's and Don'ts

### Do:
- **Do** derive shell and Reusables semantic colors from the existing light/dark `ThemeProvider` roles.
- **Do** keep compact device errors in normal flow, with the icon aligned to the first line and the tokenized gap, control spacing and Slider inset.
- **Do** preserve the existing default Alert card for non-tile callers; compact mode is opt-in.
- **Do** allow long error text and tile height to grow with system text scaling.

### Don't:
- **Don't** add a nested border, colored rail, shadow, separate card or fixed height to the compact device error.
- **Don't** clip or truncate its recovery text, or add a retry button, toast or dialog.
- **Don't** replace the incumbent Senswave palette with Material color values.
