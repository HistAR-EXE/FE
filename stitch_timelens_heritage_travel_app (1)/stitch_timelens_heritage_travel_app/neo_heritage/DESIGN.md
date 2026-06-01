---
name: Neo-Heritage
colors:
  surface: '#12131b'
  surface-dim: '#12131b'
  surface-bright: '#383941'
  surface-container-lowest: '#0d0e15'
  surface-container-low: '#1a1b23'
  surface-container: '#1e1f27'
  surface-container-high: '#292932'
  surface-container-highest: '#33343d'
  on-surface: '#e3e1ed'
  on-surface-variant: '#d2c5b0'
  inverse-surface: '#e3e1ed'
  inverse-on-surface: '#2f3038'
  outline: '#9b8f7c'
  outline-variant: '#4f4636'
  surface-tint: '#f2bf50'
  primary: '#f2bf50'
  on-primary: '#402d00'
  primary-container: '#d4a437'
  on-primary-container: '#533c00'
  inverse-primary: '#7a5900'
  secondary: '#44dbd5'
  on-secondary: '#003735'
  secondary-container: '#00bcb6'
  on-secondary-container: '#004543'
  tertiary: '#ffb4aa'
  on-tertiary: '#690003'
  tertiary-container: '#ff8a7b'
  on-tertiary-container: '#840507'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdea1'
  primary-fixed-dim: '#f2bf50'
  on-primary-fixed: '#261900'
  on-primary-fixed-variant: '#5c4300'
  secondary-fixed: '#68f8f1'
  secondary-fixed-dim: '#44dbd5'
  on-secondary-fixed: '#00201f'
  on-secondary-fixed-variant: '#00504d'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#410001'
  on-tertiary-fixed-variant: '#8f100d'
  background: '#12131b'
  on-background: '#e3e1ed'
  surface-variant: '#33343d'
typography:
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  safe-area-inset: 20px
---

## Brand & Style

The design system establishes a "Neo-Heritage" aesthetic tailored for Vietnamese Gen Z. It balances the weight of imperial history with the energy of modern technology. The atmosphere is cinematic and mysterious, inviting users to "unlock" the past through a high-tech lens.

The visual style is a fusion of **Modern Corporate** structure and **Glassmorphism**, layered with **Tactile** lacquer-inspired textures. It utilizes deep, near-black canvases contrasted against vibrant neon accents to simulate a futuristic interface emerging from an ancient scroll. Key motifs include fine-line patterns derived from *Trống Đồng* (Dong Son drums) used as subtle background overlays and glowing borders that represent "energy" or "historical frequency."

## Colors

The palette is rooted in a deep, nocturnal base to allow accent colors to pop with a "glow" effect. 

- **Imperial Gold (#D4A437):** Used for prestige, achievements, and key historical milestones.
- **Neon Cyan (#3DD6D0):** Represents the "Lens" or tech-driven discovery; used for scanning, interactive elements, and navigation active states.
- **Lacquer Red (#D9483B):** Reserved for high-impact Call to Actions (CTAs) and urgent alerts, drawing from traditional Vietnamese craftsmanship.
- **Surfaces:** Tiers are created using `#1B1C24` for standard containers and `#24262F` for floating elements to ensure depth without losing the "dark-room" immersive feel.

## Typography

This design system uses **Be Vietnam Pro** exclusively to maintain a contemporary, culturally relevant voice. 

Headlines utilize tight letter-spacing and bold weights to command attention and evoke a sense of importance. Body text is prioritized for legibility on small screens with generous line-heights. Display and Headline styles should be used for site names or quest titles, while Labels use slightly increased letter-spacing in all-caps or medium weights for functional clarity in navigation and metadata.

## Layout & Spacing

The design system follows a **Fixed Grid** logic optimized for a 390px width mobile viewport.

- **Margins:** A standard horizontal margin of 20px (`safe-area-inset`) is applied to all main content blocks.
- **Grid:** A 4-column layout is used for vertical content, with 16px gutters.
- **Rhythm:** Spacing follows a 4px baseline. Components are separated by `md` (16px) or `lg` (24px) units to maintain the "premium" airy feel despite the dark theme.
- **Mobile-First:** Content is primary stacked vertically. Horizontal scrolling "carousels" are used for "Gợi ý cho bạn" (Suggestions) or "Huy hiệu" (Badges) to maximize vertical real estate.

## Elevation & Depth

Hierarchy is established through a mix of **Tonal Layering** and **Glassmorphism**.

1. **Base Layer:** The deepest level (#0E0E13) often features a subtle, low-opacity "Trống Đồng" line pattern.
2. **Cards & Containers:** Fixed surfaces (#1B1C24) use a subtle 1px border (#2E2F38) to define edges against the black background.
3. **Glass Layers:** Overlays, modals, and the bottom navigation bar use a backdrop-blur (20px) with a semi-transparent fill of the surface color (70% opacity).
4. **Interactive Glow:** Active states do not use traditional shadows. Instead, they utilize a "bloom" effect—a soft, colored outer glow using the Primary (Gold) or Secondary (Cyan) hex with 20-30% opacity to simulate light emitting from the screen.

## Shapes

The shape language reflects a "Modern-Soft" approach:

- **Cards/Modals:** 16px (`rounded-lg`) to feel approachable and high-end.
- **Buttons/Inputs:** 12px for a precise, ergonomic feel.
- **Chips/Badges/Avatars:** Fully rounded (Pill) to differentiate interactive tags from structural content.
- **Progress Bars:** Use fully rounded ends to keep the "gamified" feel smooth and fluid.

## Components

- **Buttons:** Primary buttons use a solid Lacquer Red or Imperial Gold fill with white/dark text. Secondary buttons are outlined with Cyan and feature a subtle glow on hover/tap.
- **Bottom Navigation:** A fixed, glassmorphic bar with 4 tabs: *Trang chủ*, *Khám phá*, *Nhiệm vụ*, and *Hồ sơ*. The active tab is indicated by a Neon Cyan icon and a small glowing dot beneath.
- **Quest Cards:** Feature a background image with a dark gradient overlay. They include a 1px Gold border if the quest is "Featured."
- **XP Progress Bars:** Multi-stop gradient from Imperial Gold to Neon Cyan, visually representing the transition from "Traditional" to "Modern."
- **Badges:** Circular, utilizing high-contrast icons with a metallic texture overlay to feel like physical artifacts.
- **Input Fields:** Dark background (#1B1C24) with a 1px Cyan border that glows when focused. Placeholder text uses Text Secondary.
- **Chips:** Small, pill-shaped tags for categories (e.g., "Triều Nguyễn", "Kiến trúc").