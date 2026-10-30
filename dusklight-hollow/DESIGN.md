# Dusklight Hollow: Design System

> Companion to `PRD.md`. Version 0.1 · 2026-10-30
> Covers art direction, colour, type, layout, UI components, cursor, audio, motion, copy, and accessibility.

---

## 1. Design intent

**Subject:** a quiet lakeside village at the hour the lamps come on. **Audience:** casual players who want to unwind. **Job of the design:** make the player feel calm in the first minute, and make every villager feel like a particular person.

### 1.1 The one memorable thing

**The lantern glow.** Warm amber light is the only saturated, glowing element in the whole game. It appears in the lighthouse, windows at dusk, the cursor's hover state, the focus ring, quest markers, and the coin shine. Everything else is cool, soft, and quiet so the amber always means *something is alive here, come closer*.

This is a choice made from the story (a village relighting its lantern), not a default accent. If amber ever shows up as decoration with no meaning, remove it.

### 1.2 Principles

1. **Calm before clever.** No flashing, no sudden loud sounds, no urgent red anywhere. Danger colour is not used because there is no danger.
2. **Light tells the story.** The village looks dimmer at the start and gains warm light at each of the 5 lantern stages. Progress is seen, not just shown in a meter.
3. **Pixels stay crisp.** Whole-number scaling only. No blur, no sub-pixel movement of sprites on screen.
4. **Plain words.** Menus use everyday language. Buttons say what they do.
5. **Everyone can play.** Contrast, size, motion, and sound all have settings. Defaults are already comfortable.

### 1.3 What we are avoiding

- Cream background with a terracotta or clay accent, which is a common generated-design look.
- Hairline-rule, all-caps, zero-radius "editorial" panels.
- A tracked-out all-caps label above every heading.
- Identical rounded cards with the same soft grey shadow on everything.
- Gradients used as decoration. (Gradients appear only as the sky and the lantern glow.)
- Emoji as UI icons. All icons are drawn on the pixel grid.

---

## 2. Visual language

### 2.1 Resolution and grid

| Item | Value |
|---|---|
| Internal game resolution | **320 x 180** (16:9) |
| Scaling | Whole numbers only (x2 = 640x360, x3 = 960x540, x4 = 1280x720, and so on). Letterbox the rest with Midnight Ink |
| Tile size | **16 x 16 px** |
| Character sprite | **16 x 24 px** (head overlaps the tile above) |
| Large props | Multiples of 16 (lighthouse 48 x 128, house 64 x 64) |
| Camera | Follows player, snaps to whole pixels, small dead zone |
| CSS for canvas | `image-rendering: pixelated;` and `image-rendering: crisp-edges;` fallback |

### 2.2 Sprite and animation specs

| Asset | Frames | Notes |
|---|---|---|
| Player walk | 4 frames x 4 directions | 8 fps |
| Player idle | 2 frames x 4 directions | Slow breathing, 2 fps |
| Player tool actions (cast, water, plant, harvest) | 4 frames x 4 directions | |
| NPC walk | 4 frames x 4 directions | Shared rig, unique head, hair, outfit |
| NPC idle | 2 frames | Each has one personality idle (for example Wren taps her foot) |
| Pet | 4-frame walk, 2-frame idle, 2 sleep frames | |
| Water | 4-frame loop at 3 fps | |
| Lantern | 6-frame flicker at 4 fps, 5 brightness stages | |

**Layered character:** body, outfit, hair (back), hair (front), accessory. All layers share one pivot and use palette swaps for skin and hair colours. Each layer is exported on the same 16 x 24 canvas.

**Rules:** 1px dark outline in Midnight Ink or the darkest colour of that object (selective outlining on the lit side is allowed). No anti-aliasing. No more than 3 shades per material.

### 2.3 Master palette: "Hollow-16"

Sixteen colours. Every sprite, tile, and UI element uses only these (the day/night overlays are applied by the engine on top).

| # | Name | Hex | Role |
|---|---|---|---|
| 1 | **Midnight Ink** | `#14172B` | Darkest. Outlines, letterbox, deepest night |
| 2 | **Dusk Indigo** | `#232850` | Main UI panel surface |
| 3 | **Twilight Blue** | `#3B4A8C` | Raised UI surface, selected row, water shadow |
| 4 | **Mist Blue** | `#8FC1E3` | Water highlights, sky, info states |
| 5 | **Fog** | `#CFE0DC` | Main text on dark, pale stone |
| 6 | **Snow** | `#F5FAFA` | Brightest text, highlights, winter |
| 7 | **Pebble** | `#9AA7B8` | Secondary text, disabled, stone |
| 8 | **Lake Teal** | `#286F76` | Deep water, calm button, success |
| 9 | **Reed** | `#5BB5A2` | Water edge, positive numbers |
| 10 | **Moss** | `#7BAA52` | Grass, crops, Energy bar fill |
| 11 | **Pine** | `#3E6B3A` | Trees, hedges (shapes only, not text) |
| 12 | **Amber** | `#F4B942` | **The lantern light.** Focus, quest marker, coins, hover |
| 13 | **Coral** | `#F07F5A` | Warm accent for blossoms, warnings that need attention |
| 14 | **Brick** | `#A8452F` | Roofs, bricks (shapes only, not text) |
| 15 | **Heather** | `#B58AC4` | Magic, night market, special items |
| 16 | **Driftwood** | `#6B4A3A` | Wood, paths, doors (shapes only, not text) |

#### Verified contrast (WCAG ratios, computed)

| Text on surface | Ratio | Use for |
|---|---|---|
| Snow on Dusk Indigo | 13.4 : 1 | Headings, dialogue |
| Fog on Dusk Indigo | 10.3 : 1 | Body text |
| Fog on Midnight Ink | 12.9 : 1 | Body text on darkest surface |
| Mist Blue on Dusk Indigo | 7.3 : 1 | Links, info |
| Amber on Dusk Indigo | 8.0 : 1 | Focus ring, highlighted values, quest titles |
| Midnight Ink on Amber | 10.0 : 1 | Text on primary buttons |
| Pebble on Dusk Indigo | 5.8 : 1 | Secondary text |
| Reed on Dusk Indigo | 5.8 : 1 | Positive values |
| Moss on Dusk Indigo | 5.2 : 1 | Energy values |
| Coral on Dusk Indigo | 5.3 : 1 | Attention text |
| Heather on Midnight Ink | 6.2 : 1 | Special item names |
| Snow on Lake Teal | 5.5 : 1 | Teal buttons |
| Snow on Twilight Blue | 7.8 : 1 | Selected rows |
| Amber on Twilight Blue | 4.7 : 1 | Highlighted value in a selected row |

**Never use** Pine, Brick, or Driftwood for text. Never put Amber text on Mist Blue, Fog, or Snow. Non-text UI parts (borders, focus ring, icons) need at least **3 : 1** against their neighbours, which Amber achieves on every dark surface.

### 2.4 Time-of-day and weather grading

The world is drawn once. The engine applies a full-screen **multiply** colour and a brightness value, and then adds **light sprites** (additive) for lamps, windows, and the lantern.

| Phase | Multiply colour | Brightness | Extras |
|---|---|---|---|
| Dawn (5:00-8:00) | `#F7D9C4` fading to white | 0.90 -> 1.00 | Long soft shadows, mist over the lake |
| Day (8:00-17:00) | `#FFFFFF` | 1.00 | Short shadows |
| Dusk (17:00-20:00) | `#F2B98F` -> `#6B6FB5` | 0.95 -> 0.70 | Lamp posts and windows fade on |
| Night (20:00-5:00) | `#4A5A9E` | 0.55 | Fireflies, moon glow, lantern beam |
| Rain | Adds `#8FA3B5` at 25% | -0.10 | Rain particles, ripples, puddle tiles |
| Fog | Adds `#CFE0DC` at 35% | -0.05 | Layered low-opacity mist sprites |
| Snow | Adds `#F5FAFA` at 20% | +0.05 | Falling flakes, snow-cap tile variants |

**Lantern stages** change the night light radius and warmth: stage 0 is a dim ember; stage 5 casts a wide warm beam over the lake that you can see from every part of the village.

Transitions between phases take **60 in-game minutes** (about 30 real seconds on the default clock), with eased interpolation. Respect **reduced motion** by lowering particle counts and removing the flicker, not by removing the colour change.

---

## 3. Typography

| Role | Font | Size and use |
|---|---|---|
| **UI and headings** | Pixelify Sans (Google Fonts, free, open license) | 16 / 24 / 32 px for labels, titles, buttons |
| **Dialogue and long text** | Atkinson Hyperlegible (Google Fonts) | 16 px base for dialogue, quest text, journal |
| **Dyslexia option** | OpenDyslexic (user-selectable in settings) | Replaces the long-text font only |
| **Numbers in HUD** | Pixelify Sans | Tabular figures so coins and Energy don't jitter |

The two fonts are clearly different on purpose: Pixelify Sans carries the retro identity in short, large text, and Atkinson Hyperlegible keeps anything the player has to *read* easy on the eyes.

**Scale (DOM UI, in CSS pixels at 1x text size):**

| Token | Size / line height | Use |
|---|---|---|
| `text-title` | 32 / 40 | Screen titles |
| `text-heading` | 24 / 32 | Panel headings |
| `text-label` | 16 / 24 | Buttons, tabs, HUD labels |
| `text-body` | 16 / 26 | Dialogue and journal (sans, so a little more line height) |
| `text-small` | 14 / 22 | Hints, captions. Never below 14 |

**Rules**

- **Sentence case everywhere.** No all-caps labels and no letter-spaced eyebrows.
- Line length for body text: **max 60 characters** (dialogue boxes wrap at about 44).
- No text smaller than 14 px. The **text size** setting scales every token by 1.0 / 1.15 / 1.3 / 1.5.
- Pixelify Sans is only used at 16 px or larger. Pixel fonts blur below that size.
- Dialogue text appears with a typewriter effect using each speaker's blip sound, and **any key or click completes the line instantly**.

---

## 4. Layout and screens

### 4.1 Screen map

```
Title screen
 ├─ Play as guest ──────────────┐
 └─ Sign in ─ Dashboard ────────┤
                                ▼
                    Character creator (new game)
                                ▼
                         The village (game)
        ┌──────────┬───────────┼────────────┬───────────┐
     Inventory   Journal    Shop/Dialogue   Pause      Photo mode
                 (Today, Quests, People, Collection, Map)
```

### 4.2 HUD (in game)

Placement is anchored to screen edges, never in the middle of the playfield.

```
┌──────────────────────────────────────────────┐
│ [Coins 1,240]                  [Day 12 Spring]│  top: coins left, time and date right
│                                [☀ 10:40 Clear]│
│                                               │
│                                               │
│                  (playfield)                  │
│                                               │
│ [Energy ████████░░]        [hotbar 1 2 3 4 5 6]│  bottom: Energy left, hotbar centre-right
└──────────────────────────────────────────────┘
```

- HUD panels are small, use Dusk Indigo at 85% opacity, and never cover more than 15% of the screen height.
- The HUD **fades to 40% opacity** after 6 seconds without input and returns on any action. Setting: always visible.
- A small **quest marker** (an amber diamond) hovers above NPCs and doors that matter, with an optional screen-edge arrow for off-screen targets.

### 4.3 Responsive layout

| Breakpoint | Behaviour |
|---|---|
| 1280+ wide | Panels centred, max 880 px wide, side-by-side inventory and details |
| 768-1279 | Same, panels 90% width |
| Below 768 (phone, landscape) | Larger touch targets, on-screen joystick (left) and action button (right), inventory as full-width sheet |
| Portrait phone | Show a friendly "Turn your phone sideways" screen for gameplay. Menus, dashboard, and login work in portrait |

**Touch targets are at least 44 x 44 CSS px** with at least 8 px between them. Safe-area insets are respected on notched phones.

---

## 5. UI components

### 5.1 Panel

- Surface Dusk Indigo, **2px pixel border** drawn in Twilight Blue with a 1px Midnight Ink outer line, **corner radius 0** (pixel corners are stepped by one cut pixel).
- Built as a 9-slice image so it scales cleanly at any whole multiple.
- Drop shadow is a 2px hard offset in Midnight Ink, not a blur.
- Panel title sits inside the top border on a small Twilight Blue tab. No separate decorative header bar.

### 5.2 Buttons

| Type | Fill | Text | Use |
|---|---|---|---|
| **Primary** | Amber | Midnight Ink | The one main action on a screen (Continue, Buy, Accept) |
| **Secondary** | Twilight Blue | Snow | Other actions |
| **Calm** | Lake Teal | Snow | Positive but not primary (Sleep, Save) |
| **Quiet** | Transparent, 2px Pebble border | Fog | Cancel, Back |
| **Destructive** | Transparent, 2px Coral border | Coral | Delete slot, delete account |

- Height 44 px minimum, horizontal padding 16 px, label always a **verb** ("Buy 3 seeds", "Save and exit").
- **Only one primary button per screen.**
- States: **hover** raises the button 1px and adds an amber 1px inner line; **pressed** lowers it 1px; **focus** shows a 3px Amber outline with 2px offset (always visible for keyboard); **disabled** uses Pebble text on Twilight Blue at 60% and a text hint explaining why.

### 5.3 Dialogue box

```
┌─────────────────────────────────────────────┐
│ ┌──────┐ ╭ Teodor ╮                          │
│ │ face │ The soup needs one more thing, and  │
│ │ 48x48│ I can't remember what it was.       │
│ └──────┘                                  ▼  │
│        [ Ask about the recipe ]  [ Leave ]   │
└─────────────────────────────────────────────┘
```

- Anchored to the bottom, max 3 lines, max 120 characters per box.
- Portrait 48 x 48 with 3 expressions (neutral, happy, thoughtful) per NPC. A fourth (surprised) for key moments.
- Speaker name in Amber on a Twilight Blue tab. Choices are listed as buttons, maximum 3.
- A small bouncing triangle shows more text is coming. In reduced motion, the triangle blinks slowly instead of bouncing.

### 5.4 Inventory

- Grid of **6 columns x 4 rows** (24 slots) on desktop, 5 columns on small phones. Each slot is 48 x 48 CSS px minimum on touch.
- Item icons are 16 x 16 drawn pixels shown at x3. Quantity sits bottom-right in Snow with a Midnight Ink outline.
- Selected item shows a detail panel: name, one-line description, sell value, and the actions (Use, Gift, Equip). Rare items use **Heather** names; story items carry a small lantern icon and are never sellable.
- Category tabs across the top. Search by text on desktop.

### 5.5 Shop

- Two columns: shop stock (left) and the player's bag (right). Tabs switch between **Buy** and **Sell**.
- Selecting an item shows a quantity stepper and the exact total. The primary button reads, for example, **"Buy 3 for 90 coins"**. If the player can't afford it, the button is disabled and says **"Need 40 more coins"**.
- After a purchase: coin sound, coin counter ticks down, the item flies into the bag icon with a 250 ms eased move.

### 5.6 Journal

Tabs: **Today · Quests · People · Collection · Map**.

- **Today:** weather, today's small tasks (3), who is celebrating a birthday or festival.
- **Quests:** active list with a hint line each and a "Show me where" button.
- **People:** a portrait grid. Undiscovered villagers show a silhouette and "Not met yet". Each card shows hearts as 10 small pixel hearts.
- **Collection:** categories with silhouettes for undiscovered entries and the hint "Try fishing at night."
- **Map:** hand-drawn pixel map of the village with only visited places filled in.

### 5.7 Login and dashboard

**Title screen:** the village at dusk with the lantern flickering weakly. Two buttons: **Play as guest** (primary) and **Sign in**. A short line underneath: *"Guests save on this device. Sign in to save anywhere."*

**Sign-in dialog:** email field with a visible label, **Send me a sign-in link**, a divider, **Continue with Google**. Error text appears directly under the field and says what to do (see section 8).

**Dashboard:**

```
┌───────────────────────────────────────────────────────┐
│ Hi, Mira   [avatar]                    [Settings] [Sign out]│
├───────────────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│ │ Slot 1   │  │ Slot 2   │  │ Slot 3   │              │
│ │ avatar   │  │ avatar   │  │  Empty   │              │
│ │ Mira     │  │ Pip      │  │          │              │
│ │ Day 12   │  │ Day 3    │  │ [New game]│             │
│ │ Spring   │  │ Spring   │  │          │              │
│ │ Lantern 2│  │ Lantern 0│  │          │              │
│ │ 4h 20m   │  │ 35m      │  │          │              │
│ │[Continue]│  │[Continue]│  │          │              │
│ └──────────┘  └──────────┘  └──────────┘              │
│ Stats: Play time 4h 55m · Friends 7 · Quests 21 done   │
└───────────────────────────────────────────────────────┘
```

- Slot cards are **not identical clones**: the lantern stage is drawn as a small pixel lantern whose glow matches that save's progress, and the avatar stands in the actual cursor style chosen. Empty slot is a quiet dotted outline with a single **New game** button.
- Delete lives inside a small menu on each card, never as a button next to Continue.

### 5.8 Energy bar and coin counter

- **Energy:** 10 segments, Moss fill, Midnight Ink empty segments, number beside it. At 20% or below the bar gets a gentle slow pulse and the text hint "Getting sleepy". It does **not** turn red.
- **Coins:** an Amber coin icon and a tabular number. When coins change, the number counts up or down over 400 ms and a small "+25" floats up and fades.

### 5.9 Toasts and notifications

- Bottom-centre, one at a time, 3 seconds, tap to dismiss. Same wording as the action ("Quest accepted", then "Quest completed").
- Never block movement. No toast covers the dialogue box or HUD.

---

## 6. Cursor design

All cursors are **32 x 32 PNG** with a 1px Midnight Ink outline and a hotspot set in the CSS declaration, with a standard cursor as the fallback (for example `cursor: url(paw.png) 6 4, auto;`).

| State | Default art (Classic Paw) | Where |
|---|---|---|
| Default | Small paw pointer | Everywhere |
| Hover (can interact) | Open paw with an Amber glint | Doors, NPCs, items, buttons |
| Talk | Speech bubble | Over NPCs |
| Pick up | Closed paw | Over collectables |
| Fishing | Bobber | Near water with a rod equipped |
| Watering | Watering can | Over plantable soil with the can equipped |
| Busy | Spinning lantern, 4 frames, swapped by script | Loading, saving |

**Unlockable styles (9 at launch):** Classic Paw, Leaf, Star, Lantern, Fish, Snail, Moon, Pixel Heart, Mochi. Each style supplies all 7 states as a sprite sheet so a style swap never leaves a state missing. The cursor style picker in settings shows a live preview that changes state when hovered.

Options: size 1x, 1.5x, 2x (additional PNG at 64 x 64 for 2x); high-contrast outline (adds a 1px Snow outer line).

---

## 7. Motion and sound design

### 7.1 Motion

- **Easing:** short ease-out for things appearing (150-250 ms), ease-in for leaving (100-180 ms). Leaving is always faster than entering. No bouncy springs on UI.
- **Menus** slide 8 px and fade, never more. Page transitions are a 300 ms fade through Midnight Ink.
- **One orchestrated moment per session start:** on the title screen, the lantern slowly warms up from ember to a steady glow. Nothing else animates on load.
- The big motion beats are rare and meaningful: a lantern stage-up (a 3-second slow bloom of light across the village, with a soft chime), and the festival finale.
- **Reduced motion:** no shake, no parallax, no bouncing, fewer particles, and instant transitions under 100 ms. The lantern bloom becomes a gentle fade.
- Nothing flashes more than 2 times per second. No full-screen white flashes.

### 7.2 Music

| Cue | Mood | Tempo | Notes |
|---|---|---|---|
| Title | Warm, hopeful | 72 bpm | Solo music-box melody with soft pad |
| Dawn | Gentle, waking | 76 bpm | Birdsong layer |
| Day | Light, bouncy | 92 bpm | Plucked bass, light percussion |
| Dusk | Reflective | 68 bpm | Lamps come on, slow pads |
| Night | Hushed | 60 bpm | Sparse piano, crickets |
| Rain | Variation of the current cue | Same | Softer, adds rain loop |
| Festival | Joyful | 108 bpm | Whole village sings along |

- Chiptune timbres (square, triangle, noise) plus a lofi softness. No harsh high-frequency sounds.
- Loops are seamless, **90-150 seconds**, and crossfade over 4 seconds at phase changes.
- Loudness target: music at **-18 LUFS** relative to effects, no sound over **-3 dBFS** peak.

### 7.3 Sound effects direction

| Group | Direction |
|---|---|
| UI | Soft taps like wooden blocks. Confirm is a rising two-note chime; cancel is a falling one |
| Footsteps | Four surfaces, 4 variations each, randomised pitch +/- 5% |
| Dialogue blips | A short, quiet blip per NPC at a distinct pitch, softer than music |
| Coins | A bright tick, clearly different from the UI confirm |
| Ambient | Water lap, crickets, birds, wind, rain: each a seamless loop that fades by time and weather |
| Lantern stage-up | A warm swell, 3 seconds, the loudest sound in the game and still gentle |

All important sounds also show **captions** when captions are on (for example *[a bell rings in the distance]*).

---

## 8. Voice and copy

The interface speaks like a friendly neighbour: short, plain, warm, never cute for its own sake.

| Do | Don't |
|---|---|
| "Save and exit" | "Submit" |
| "Need 40 more coins" | "Insufficient funds" |
| "Couldn't send the link. Check the email address and try again." | "Error 400" |
| "You're offline. Your game is saved on this device and will back up when you're back online." | "Sync failed." |
| "Delete Slot 2 (Mira, Day 12)? This can't be undone." | "Are you sure?" |
| "No quests right now. Say hello to someone." | "Nothing here." |

**Rules**

- Keep the same name for an action all the way through: the button says **Accept**, the toast says **Quest accepted**.
- Errors say what happened and what to do next. They never apologise and never blame the player.
- Empty states invite an action ("Your bag is empty. Visit the general store.").
- **Villager voices** differ by character (for example Biscuit apologises too much, Lumi speaks in riddles, Captain Ro uses sea words, Wren sings fragments). The voice sheet for each NPC lives in `/content/npcs/`.
- No all-caps shouting, no exclamation marks in system messages.

---

## 9. Accessibility checklist

| Area | Requirement | Where it's covered |
|---|---|---|
| Contrast | Text 4.5 : 1 or better, UI parts 3 : 1 | Section 2.3 verified table |
| Keyboard | Everything reachable with the keyboard, with visible focus | 5.2 focus ring (3px Amber) |
| Remapping | All keys remappable | Settings |
| Touch | 44 px targets, 8 px spacing | 4.3 |
| Text | 4 text sizes, dyslexia font, never below 14 px | Section 3 |
| Colour | Never use colour alone to carry meaning. Energy has a number, quest markers have a shape, rarity has an icon | 5.4, 5.8 |
| Colour vision | Deuteranopia, protanopia, tritanopia palette swaps for the world and UI | Settings |
| Motion | Reduced motion, no flashing above 2 per second | 7.1 |
| Sound | Four volume sliders, captions for key sounds, no information carried by sound alone | 7.3 |
| Time | No timers on any decision, pause anywhere, slower clock option | PRD 5.8 |
| Screen readers | DOM UI uses proper roles, labels, and live regions for toasts and dialogue | Overlay UI |
| Forms | Visible labels, errors next to the field, no placeholder-only labels | 5.7 |

---

## 10. Asset naming and handoff

```
/assets
  /sprites   player_body_01.png, player_hair_front_03.png, npc_biscuit_walk.png
  /portraits biscuit_neutral.png, biscuit_happy.png
  /tiles     village_spring.png, village_winter.png (same layout, swapped art)
  /ui        panel_9slice.png, btn_primary.png, icon_coin.png
  /cursors   paw_default.png, paw_hover.png, leaf_default.png ...
  /audio     /music title.ogg, day_loop.ogg  /sfx coin_01.ogg  /ambience rain_loop.ogg
  /fonts     PixelifySans.woff2, AtkinsonHyperlegible.woff2, OpenDyslexic.woff2
```

- Use **lowercase snake_case**, numbered variations (`_01`, `_02`).
- Sprites are exported as PNG-8 indexed to the Hollow-16 palette so palette swaps are a lookup change.
- Pack into texture atlases at build time (power-of-two, 2048 x 2048 max).

---

## 11. Pre-delivery checklist

- [ ] Every screen has exactly one primary button
- [ ] No text under 14 px, no all-caps labels, no text in Pine, Brick, or Driftwood
- [ ] All interactive things reachable and visible with the keyboard
- [ ] Reduced motion tested on title, dialogue, lantern stage-up, and festival
- [ ] Cursor falls back cleanly when an image fails to load
- [ ] Amber used only where something is alive, interactive, or valuable
- [ ] Day, dusk, night, rain, fog, snow reviewed on the same screen for readability
- [ ] Dashboard slot cards checked at 360 px, 768 px, and 1280 px widths
- [ ] Audio starts only after first interaction; all sliders persist
- [ ] Offline and error messages follow the copy rules in section 8
