---
version: alpha
name: stripe.com
description: Stripe’s homepage design system emphasizes a minimal white canvas, high-contrast indigo CTA color, light-weight sans typography, restrained borders, and a single dramatic multicolor ribbon hero accent. Tokens below are inferred from the provided Context.dev styleguide and screenshot; where details are not explicit, values are conservative.
colors:
  background: "#ffffff"
  surface: "#ffffff"
  on-surface: "#0a2540"
  primary: "#533afd"
  secondary: "#b9b9f9"
  tertiary: "#81b81a"
  neutral: "#d9d9e3"
  muted: "#66758f"
  accent: "#533afd"
  error: "#df1b41"
typography:
  fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
  headline-display:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: "48px"
    lineHeight: 55.2px
    letterSpacing: "-0.96px"
    fontWeight: 300
  headline-lg:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: "32px"
    lineHeight: 35.2px
    letterSpacing: "-0.64px"
    fontWeight: 300
  headline-md:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: "19.845px"
    lineHeight: 22.2264px
    letterSpacing: "-0.19845px"
    fontWeight: 300
  body-lg:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: "16px"
    lineHeight: 22.2264px
    letterSpacing: "0px"
    fontWeight: 300
  body-md:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: "14px"
    lineHeight: 35.2px
    letterSpacing: "-0.64px"
    fontWeight: 300
  body-sm:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: "12px"
    lineHeight: 18px
    letterSpacing: "0px"
    fontWeight: 400
  label-lg:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: "16px"
    lineHeight: 22.2264px
    letterSpacing: "0px"
    fontWeight: 400
  label-md:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: "14px"
    lineHeight: 20px
    letterSpacing: "0px"
    fontWeight: 400
  label-sm:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: "12px"
    lineHeight: 16px
    letterSpacing: "0px"
    fontWeight: 400
rounded:
  none: "0px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "14px"
  md: "24px"
  lg: "40px"
  xl: "80px"
components:
  button:
    primary:
      backgroundColor: "{colors.primary}"
      color: "{colors.background}"
      borderColor: "{colors.background}"
      borderWidth: "0px"
      borderStyle: "none"
      borderRadius: "{rounded.sm}"
      padding: "15.5px 24px 16.5px"
      minWidth: "141px"
      minHeight: "48px"
      fontFamily: "{typography.fontFamily}"
      fontSize: "16px"
      fontWeight: 400
      textDecoration: "none"
      boxShadow: "none"
    secondary:
      backgroundColor: "{colors.background}"
      color: "{colors.primary}"
      borderColor: "{colors.secondary}"
      borderWidth: "1px"
      borderStyle: "solid"
      borderRadius: "{rounded.sm}"
      padding: "15.5px 24px 16.5px"
      minWidth: "141px"
      minHeight: "48px"
      fontFamily: "{typography.fontFamily}"
      fontSize: "16px"
      fontWeight: 400
      textDecoration: "none"
      boxShadow: "none"
    link:
      backgroundColor: "transparent"
      color: "{colors.primary}"
      borderColor: "transparent"
      borderWidth: "0px"
      borderStyle: "none"
      borderRadius: "{rounded.none}"
      padding: "0px"
      minWidth: "0px"
      minHeight: "0px"
      fontFamily: "{typography.fontFamily}"
      fontSize: "16px"
      fontWeight: 400
      textDecoration: "none"
      boxShadow: "none"
  card:
    backgroundColor: "{colors.surface}"
    color: "{colors.on-surface}"
    borderColor: "{colors.surface}"
    borderWidth: "0px"
    borderStyle: "none"
    borderRadius: "{rounded.md}"
    padding: "8px"
    boxShadow: "rgba(0, 0, 0, 0.1) 0px 20.187px 40.374px -20.187px"
---

# Overview

Stripe’s homepage is a premium, low-noise marketing surface built around white space, sparse navigation, and a dominant hero story. The visual system pairs a neutral white background with indigo actions, dark navy copy, and a vivid multicolor ribbon graphic that creates motion without adding UI chrome.

The page hierarchy is clear:
1. global nav,
2. large hero statement,
3. primary and secondary CTAs,
4. trust logos,
5. modular content bands and cards.

Treat the composition as editorial rather than app-like. Keep sections roomy, copy concise, and interactive elements visually lightweight.

# Colors

## Core palette
- `primary` is the signature Stripe indigo: `#533afd`.
- `background` and `surface` are white: `#ffffff`.
- `on-surface` should be a deep navy-like text color. The exact homepage text color is not provided in the source payload, so keep it conservative and high contrast.
- `secondary` is a pale indigo border/outline tone: `#b9b9f9`.
- `tertiary` reflects an unexpected green accent seen in the extracted payload: `#81b81a`.
- `error` is not explicitly provided; use a standard accessible red if needed.

## Usage guidance
- Use white as the default canvas.
- Use `primary` for core CTAs, links, and emphasized brand actions.
- Use `secondary` only for borders and low-emphasis outlines, not as a fill color.
- Avoid heavy fills or saturated backgrounds outside the hero artwork.
- The multicolor ribbon is decorative imagery, not a tokenized UI color system.

# Typography

Stripe’s type is light, large, and tightly tracked. Headings use `sohne-var` with `fontWeight: 300`, creating a refined, modern tone.

## Recommended text styles
- `headline-display`: 48px / 55.2px / -0.96px / 300
- `headline-lg`: 32px / 35.2px / -0.64px / 300
- `headline-md`: 19.845px / 22.2264px / -0.19845px / 300
- `body-lg`: 16px / 22.2264px / 0px / 300
- `body-md`: 14px / 35.2px / -0.64px / 300
- `label-lg`: 16px / 22.2264px / 400
- `label-md`: 14px / 20px / 400
- `label-sm`: 12px / 16px / 400

## Rules
- Use `sohne-var, "SF Pro Display", sans-serif` for all text.
- Keep headlines light unless a control requires stronger emphasis.
- Preserve the generous headline sizes and negative tracking on hero and section titles.
- Avoid bold, condensed, or display-serif treatments.

# Layout

## Structure
- Desktop layout is centered in a wide content column with large gutters.
- The hero occupies a large vertical band with the ribbon graphic bleeding in from the upper right and lower right edges.
- Content sections stack vertically with generous whitespace between them.
- Logos and metrics appear in clean horizontal rows.

## Spacing
Use the provided spacing scale:
- `xs`: 6px
- `sm`: 14px
- `md`: 24px
- `lg`: 40px
- `xl`: 80px

## Practical rules
- Prefer large vertical spacing over dense grids.
- Align primary content to a left column within the centered page frame.
- Keep secondary content modular and card-like, with clear section boundaries.
- Avoid full-width dark bands and complex multi-column dashboards on the homepage.

# Elevation & Depth

Stripe is mostly flat. Depth is subtle and used sparingly.
- Cards use a soft shadow: `rgba(0, 0, 0, 0.1) 0px 20.187px 40.374px -20.187px`
- Smaller elevated surfaces may use `rgba(23, 23, 23, 0.08) 0px 15px 35px 0px` when needed
- Buttons do not use elevation
- Avoid layered shadow stacks and strong blur effects

Depth should support hierarchy, not decorate it.

# Shapes

Rounded corners are restrained:
- `none`: 0px
- `sm`: 4px
- `md`: 6px
- `lg`: 8px
- `xl`: 12px
- `full`: 9999px

## Shape guidance
- Primary and secondary buttons use 4px radius.
- Cards use a slightly softer 6px radius.
- Keep borders thin and clean.
- Avoid pill-shaped CTAs except where a product pattern explicitly requires them.

# Components

## Primary button
Use for the main conversion action.
- Fill: `#533afd`
- Text: `#ffffff`
- Radius: 4px
- Height: 48px min
- Padding: `15.5px 24px 16.5px`
- Font: 16px, weight 400
- No shadow

## Secondary button
Use for alternate actions near the primary CTA.
- Fill: white
- Text: `#533afd`
- Border: `1px solid #b9b9f9`
- Radius: 4px
- Height: 48px min
- Padding: `15.5px 24px 16.5px`
- No shadow

## Link button
Use for tertiary navigation and inline calls to action.
- Transparent background
- Text: `#533afd`
- No border
- No radius treatment
- No padding beyond text needs

## Card
Use for supporting stories, product modules, and trust content.
- White background
- No border
- 6px radius
- 8px padding baseline
- Soft shadow only

# Do's and Don'ts

## Do
- Do keep the homepage predominantly white with one strong brand accent color.
- Do use very large, light-weight headlines with tight letter spacing.
- Do place primary CTAs directly under the hero copy.
- Do keep borders subtle and pale.
- Do use cards and metrics in modular, horizontally readable bands.
- Do preserve generous whitespace around all major sections.
- Do treat the multicolor hero ribbon as a decorative hero asset only.

## Don't
- Don't introduce heavy gradients, dark backgrounds, or dense chrome.
- Don't use bold headline weights or decorative fonts.
- Don't make buttons pill-shaped or oversized beyond the provided 48px baseline.
- Don't add heavy outlines, hard shadows, or layered elevation.
- Don't crowd the hero with extra copy, icons, or secondary navigation.
- Don't replace the single dominant CTA hierarchy with equal-weight actions.
- Don't use the hero artwork as a repeatable page background pattern.
