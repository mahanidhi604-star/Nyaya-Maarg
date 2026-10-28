# Nyaya-Maarg - Design System

> Independent civic data publication and precision legal aid instrument for Karnataka.
> Visual language: Precision Cartographic Gazetteer crossed with an authoritative public instrument.
> Dials: variance 6 · motion 4 · density 5

---

## 1. Palette

### Cool Neutral Base (Zinc/Graphite)
- Light background: `#F8F9FA` (cool crisp off-white)
- Dark background: `#0B0D11` (deep graphite zinc)
- Primary text: `#111318` (high-contrast off-black, never `#000000`) / `#F0F2F5` in dark mode
- Secondary text: `#4D535E` / `#9BA3AF` in dark mode
- Tertiary text: `#7B828F` / `#646E7E` in dark mode

| Token                 | Light Value          | Dark Value           | Usage                                        |
|-----------------------|----------------------|----------------------|----------------------------------------------|
| `--color-surface-0`   | `#F8F9FA`            | `#0B0D11`            | Page canvas background                       |
| `--color-surface-1`   | `#FFFFFF`            | `#13171F`            | Primary container, elevated card             |
| `--color-surface-2`   | `#EEF0F2`            | `#1D232F`            | Dividers, borders, subtle panels             |
| `--color-surface-3`   | `#E2E5E9`            | `#2A3242`            | Hover states, active borders                 |
| `--color-ink-primary` | `#111318`            | `#F0F2F5`            | Primary copy, headers, metrics               |
| `--color-ink-secondary`| `#4D535E`           | `#9BA3AF`            | Supporting captions, methodology text        |
| `--color-ink-tertiary`| `#7B828F`            | `#646E7E`            | Quiet metadata, table column labels          |
| `--color-accent`      | `#1D5CA8`            | `#4889E8`            | Single UI accent (Steel Blue, saturation <80%)|
| `--color-accent-hover`| `#154B8B`            | `#6BA3F2`            | Interactive hover                            |
| `--color-accent-subtle`| `#EBF3FC`           | `#12243C`            | Active tab background, soft highlight        |

*Banned aesthetics: cream/bone/warm-paper backgrounds, brass/clay/ochre accents, espresso text, purple-blue AI gradients, neon glows, gradient headline text.*

### Data Visualization Ramp (Sequential Amber-to-Crimson)
Single-hue, colour-blind-safe sequential ramp distinct from the UI accent so data never reads as interactive UI buttons:
```
gap-0: #F3E8CB  (Well-served, <= 10 km)
gap-1: #E7B874  (Adequate, 10-25 km)
gap-2: #D97E3A  (Moderate gap, 25-50 km)
gap-3: #C64E24  (Severe gap, 50-75 km)
gap-4: #A31D1D  (Critical isolated gap, > 75 km)
```
*Rule: Always paired with tabular mono figures, rank, and distance value. Never colour alone.*

---

## 2. Typography

| Role         | Family                              | Weight   | Size (rem) | Line-height | Tracking  |
|--------------|-------------------------------------|----------|------------|-------------|-----------|
| Display      | **Geist / System Sans Display**     | 600      | 3.25       | 1.08        | -0.025em  |
| Heading 1    | Geist / System Sans Display         | 600      | 2.0        | 1.15        | -0.02em   |
| Heading 2    | Geist / System Sans Display         | 600      | 1.35       | 1.25        | -0.015em  |
| Heading 3    | Geist / System Sans Display         | 600      | 1.05       | 1.35        | -0.01em   |
| Body         | Geist / System Sans Display         | 400      | 0.9375     | 1.55        | 0         |
| Body small   | Geist / System Sans Display         | 400      | 0.8125     | 1.5         | 0.005em   |
| Label/UI     | Geist / System Sans Display         | 500      | 0.75       | 1.3         | 0.02em    |
| Tabular stat | **Geist Mono / JetBrains Mono**     | 500      | varies     | 1.15        | 0         |

*Rules: No serifs anywhere on the Overview or Wordmark. Tabular figures (`tabular-nums`) for all numbers. Body max 65ch.*

---

## 3. Brand & Wordmark

- **Wordmark:** "Nyaya-Maarg" set in display sans with tight letter-spacing (`tracking-tight`) and a distinctive accent hyphen. No logo icons, scales of justice, gavels, pillars, shields, or courthouse clichés.
- **Independence Notice:** "Independent civic data publication. Not a government agency or official legal services authority."
- **Tagline:** "Mapping Karnataka's public legal aid reach" (used in header/footer, never in hero).
- **Kannada Wordmark:** "ನ್ಯಾಯ ಮಾರ್ಗ" (Noto Sans Kannada) in footer [Flagged for native Kannada speaker verification].
- **Signature Visual:** Straight-line path vectors connecting underserved centroids to nearest mapped centres on the real Leaflet map, length representing distance gap.

---

## 4. Spacing, Radii & Surfaces

- **Spacing Base Unit:** 4px grid. Sections use purposeful asymmetry rather than uniform padding.
- **Border Radius:** Single disciplined scale:
  - `--radius-sm`: 4px (badges, chips)
  - `--radius-md`: 8px (buttons, input fields)
  - `--radius-lg`: 12px (cards, modal containers)
  - `--radius-xl`: 16px (map container, hero card)
- **Surfaces:** Flat dividers (`border-[var(--color-surface-2)]`) preferred over boxed cards. Elevation reserved strictly for floating controls and dominant cards.

---

## 5. Motion

- Headline counter counts up once on load.
- Path lines draw in by rank with staggered opacity.
- Interactive press feedback (`active:scale-[0.98]`).
- Respects `prefers-reduced-motion` with instantaneous fallback.
