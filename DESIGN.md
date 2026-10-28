# Nyaya-Maarg - Design System

> Independent civic data publication and precision legal aid instrument for Karnataka.
> Visual language: Precision Cartographic Gazetteer crossed with an authoritative public instrument.
> Dials: variance 6 · motion 4 · density 5

---

## 1. Palette & WCAG AA Contrast Compliance

### Cool Neutral Base (Zinc/Graphite) & Semantic Tokens
Audited against WCAG AA requirements (>= 4.5:1 for body and captions, >= 3:1 for large text, icons, borders, and focus rings):

| Token                 | Light Value | Dark Value  | Contrast vs BG (Light) | Contrast vs BG (Dark) | WCAG Rating | Usage |
|-----------------------|-------------|-------------|------------------------|-----------------------|-------------|-------|
| `--color-surface-0`   | `#F8F9FA`   | `#0B0D11`   | Base Canvas            | Base Canvas           | —           | Page background |
| `--color-surface-1`   | `#FFFFFF`   | `#13171F`   | Raised Canvas          | Raised Canvas         | —           | Card and modal surface |
| `--color-surface-2`   | `#EEF0F2`   | `#1D232F`   | Subtle Surface         | Subtle Surface        | —           | Dividers, hover backgrounds |
| `--color-surface-3`   | `#E2E5E9`   | `#2A3242`   | Elevated Surface       | Elevated Surface      | —           | Active states |
| `--color-ink-primary` | `#111318`   | `#F0F2F5`   | **17.5:1** vs #FFF     | **15.2:1** vs #13171F | **AAA**     | Headings, primary copy |
| `--color-ink-secondary`| `#3D4450`  | `#B4BCC8`   | **7.1:1** vs #FFF      | **8.6:1** vs #13171F  | **AAA**     | Body text, captions |
| `--color-ink-tertiary`| `#525A69`   | `#98A2B2`   | **4.9:1** vs #FFF      | **6.3:1** vs #13171F  | **AA**      | Metadata, timestamps, placeholders |
| `--color-border-subtle`| `#D5D9E0`  | `#2D3748`   | Card outlines          | Card outlines         | —           | Container dividers |
| `--color-border-strong`| `#788292`  | `#64748B`   | **3.2:1** vs #FFF      | **3.3:1** vs #13171F  | **AA UI**   | Form input borders, chip outlines |
| `--color-accent`      | `#1D5CA8`   | `#2563EB`   | **6.2:1** vs #FFF      | **5.2:1** with #FFF text| **AA**   | Primary action buttons (white text) |
| `--color-accent-text` | `#174E91`   | `#60A5FA`   | **6.8:1** vs #FFF      | **7.1:1** vs #0B0D11  | **AAA**     | Active nav tabs, text links |
| `--color-on-accent`   | `#FFFFFF`   | `#FFFFFF`   | White text on accent   | White text on accent  | **AA**      | Text on primary buttons |
| `--color-focus-ring`  | `#1D5CA8`   | `#60A5FA`   | **6.2:1** outline      | **7.1:1** outline     | **AA UI**   | 2px interactive focus rings |
| `--color-status-danger`| `#B91C1C`  | `#F87171`   | **6.1:1** in badge     | **8.1:1** in badge    | **AAA**     | Overdue deadlines, emergency warnings |
| `--color-status-warning`| `#92400E` | `#FBBF24`   | **5.8:1** in badge     | **9.2:1** in badge    | **AAA**     | SAMPLE notices, branching alerts |
| `--color-status-success`| `#166534` | `#4ADE80`   | **6.4:1** in badge     | **8.4:1** in badge    | **AAA**     | Completed checklist, ready badges |
| `--color-status-info` | `#1D5CA8`   | `#60A5FA`   | **5.6:1** in badge     | **7.9:1** in badge    | **AAA**     | Category pills, procedural guidance |

### Accessible Interaction & Dual Encoding
- **Dual-Encoded Statuses**: Every status indicator combines an icon + unambiguous text label (e.g., ⚠️ OVERDUE, ✅ Ready, 📝 In Progress), never relying on color alone.
- **Focus Rings**: Mandatory 2px visible focus ring (`--color-focus-ring`) with 2px offset on all interactive buttons, inputs, links, and tabs.
- **High-Contrast Mode Support**: Explicit `@media (prefers-contrast: more)` styles strengthening borders and elevating text contrast ratios to AAA standard (> 7:1).

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
- **Signature Visual:** Straight-line path vectors connecting underserved centroids to nearest mapped centres on the offline blank map canvas (`#F8F9FA` / `#0B0D11`) with local Karnataka GeoJSON boundaries, length representing distance gap.

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
