# CivicBlindspot — Design System

> Civic-tech data dashboard for policymakers, NGOs and citizens.
> Mode: **Operate** — scanability, consistency, clarity outrank decoration.
> Dials: variance 5 · motion 4 · density 6

---

## 1. Palette

| Token                  | Light Value             | Dark Value              | Usage                                    |
|------------------------|-------------------------|-------------------------|------------------------------------------|
| `--surface-0`          | `#FAF8F5` (warm cream)  | `#1A1917`               | Page background                          |
| `--surface-1`          | `#F1EFEB`               | `#242320`               | Card / panel background                  |
| `--surface-2`          | `#E8E5E0`               | `#2E2D29`               | Hover, secondary panels                  |
| `--ink-primary`        | `#1C1B18`               | `#F0EDE8`               | Body text                                |
| `--ink-secondary`      | `#5C5A54`               | `#9E9B94`               | Captions, labels                         |
| `--ink-tertiary`       | `#8A877F`               | `#6B6862`               | Disabled, placeholders                   |
| `--accent`             | `#1B7A6E` (deep teal)   | `#2DD4B6`               | Primary action, selected state           |
| `--accent-hover`       | `#156A5F`               | `#40E0C4`               | Accent hover                             |
| `--accent-subtle`      | `#E6F5F2`               | `#1B2E2A`               | Accent background wash                   |
| `--status-danger`      | `#C4392D`               | `#F87171`               | Critical gap, error                      |
| `--status-warning`     | `#B7791F`               | `#FBBF24`               | Medium gap                               |
| `--status-success`     | `#2D7A3A`               | `#4ADE80`               | Well-served area                         |
| `--status-info`        | `#2563EB`               | `#60A5FA`               | Informational                            |
| `--sample-badge`       | `#B45309`               | `#F59E0B`               | SAMPLE data badge                        |
| `--sample-badge-bg`    | `#FEF3C7`               | `#422006`               | SAMPLE badge background                  |

### Accent rationale
Deep teal (#1B7A6E): connotes trust, governance, and calm authority — appropriate for a legal/civic context. Passes WCAG AA on `--surface-0` at 5.2:1.

### Gap score ramp (colour-blind-safe, sequential)
Based on ColorBrewer YlOrRd (5-class), adjusted for the warm palette:
```
gap-0: #F7FCB4  (well-served)
gap-1: #FEDC8B  (adequate)
gap-2: #F5A05D  (underserved)
gap-3: #E55C42  (poorly served)
gap-4: #BD1B28  (critical gap)
```
Always paired with numeric rank and distance value — never colour alone.

---

## 2. Typography

| Role         | Family                        | Weight   | Size (rem) | Line-height | Tracking |
|--------------|-------------------------------|----------|------------|-------------|----------|
| Display      | **Source Serif 4** (serif)     | 600      | 3.5        | 1.05        | -0.02em  |
| Heading 1    | Source Serif 4                 | 600      | 2.0        | 1.15        | -0.01em  |
| Heading 2    | Source Serif 4                 | 600      | 1.5        | 1.2         | -0.005em |
| Heading 3    | **DM Sans** (sans)            | 600      | 1.125      | 1.3         | 0        |
| Body         | DM Sans                       | 400      | 0.9375     | 1.55        | 0        |
| Body small   | DM Sans                       | 400      | 0.8125     | 1.5         | 0.005em  |
| Label/UI     | DM Sans                       | 500      | 0.8125     | 1.3         | 0.02em   |
| Tabular stat | **JetBrains Mono** (mono)     | 500      | varies     | 1.2         | 0        |

All fonts self-hosted with `font-display: swap`.

---

## 3. Spacing Scale

4px base unit. Tokens: `--space-1` (4px) through `--space-16` (64px).

```
1: 4px    2: 8px    3: 12px   4: 16px   5: 20px
6: 24px   8: 32px   10: 40px  12: 48px  16: 64px
```

---

## 4. Border Radius

| Token          | Value  | Usage                      |
|----------------|--------|----------------------------|
| `--radius-sm`  | 4px    | Badges, small chips        |
| `--radius-md`  | 8px    | Cards, buttons             |
| `--radius-lg`  | 12px   | Modals, panels             |
| `--radius-xl`  | 16px   | Map overlays, sheets       |
| `--radius-full`| 9999px | Avatars, circular buttons  |

---

## 5. Shadows

```css
--shadow-sm:  0 1px 2px rgba(28, 27, 24, 0.06);
--shadow-md:  0 2px 8px rgba(28, 27, 24, 0.08);
--shadow-lg:  0 8px 24px rgba(28, 27, 24, 0.10);
--shadow-xl:  0 16px 48px rgba(28, 27, 24, 0.12);
```

---

## 6. Motion

| Duration | Easing                           | Usage                                    |
|----------|----------------------------------|------------------------------------------|
| 150ms    | `ease-out`                       | Hover states, opacity toggles            |
| 200ms    | `cubic-bezier(0.22, 1, 0.36, 1)` | Panel reveal, list item enter            |
| 300ms    | `cubic-bezier(0.22, 1, 0.36, 1)` | Sheet slide, map fly-to                  |

Properties: **transform and opacity only**. Honour `prefers-reduced-motion: reduce` by disabling all motion.

---

## 7. Glass Effect (map controls only)

```css
.glass {
  background: rgba(250, 248, 245, 0.72);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(28, 27, 24, 0.08);
}

@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: var(--surface-1);
    backdrop-filter: none;
  }
}
```

---

## 8. Icons

**Phosphor Icons** — `regular` weight (1.5px stroke), 20px default size.
One library, one weight, no exceptions. No emoji.

---

## 9. Accessibility Requirements

- WCAG AA contrast: 4.5:1 for text, 3:1 for large text and UI components
- Visible focus rings: 2px solid var(--accent), 2px offset
- Touch targets: minimum 44×44px
- `aria-label` on all icon buttons, map markers, and interactive elements
- `prefers-reduced-motion` and `prefers-color-scheme` honoured
- Full keyboard navigation including map list view
- Colour-blind-safe ramp with numeric labels

---

## 10. Breakpoints

| Token    | Width    | Layout                                    |
|----------|----------|-------------------------------------------|
| `mobile` | < 768px  | Stack: map → bottom sheet (list/detail)   |
| `tablet` | 768–1199 | Side panel collapses, narrower rail       |
| `desktop`| ≥ 1200   | Full asymmetric layout with side panel    |

---

## 11. Component Patterns

- **SAMPLE badge**: `--sample-badge` on `--sample-badge-bg`, uppercase label "SAMPLE", `--radius-sm`, visible in both themes.
- **Centre card**: surface-1 background, 12px radius, name (heading-3), type chip, services list, "Open in Google Maps" button (accent), "Call" link (if phone exists). SAMPLE badge top-right if `is_sample`.
- **Gap rank chip**: Numeric rank + distance in km, colour from gap ramp, always paired.
- **Stat display**: Display font for the number, mono for units, body small for description.
- **Empty state**: Illustration area + body text explaining what data would appear.
- **Loading skeleton**: Matches the final shape, pulsing surface-2 → surface-1.
