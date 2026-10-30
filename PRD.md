# Dusklight Hollow: Product Requirements Document

> Working title. A cozy, retro-style, browser-based village game for casual players.
> Version 0.1 · 2026-10-30 · Status: draft for review

---

## 1. Summary

**Dusklight Hollow** is a calm top-down 2D game played in the browser. The player arrives by night ferry in a small lakeside village whose lighthouse lantern has gone dim. By befriending 18 villagers, finishing small quests, fishing, gardening, and decorating a home, the player slowly relights the lantern.

There is no combat, no fail state, and no timer pressure. Sessions are designed to be satisfying in 5-15 minutes.

**Tagline:** *Slow down. Light the lantern.*

### 1.1 Decisions already made

| Area | Decision |
|---|---|
| Backend | **Supabase** (Postgres, Auth, Row Level Security, Storage) |
| Platform | Web, **Phaser 3 + TypeScript + Vite** |
| Perspective | **Top-down 2D town** on a 16px tile grid |
| Visual style | 16-bit pixel art, limited 16-colour master palette |
| Extra features chosen | Cozy mini-games, weather and seasons, journal + collection log + photo mode, pet companion, home decor, accessibility options |

### 1.2 Assumptions (you did not answer these; change any that are wrong)

| # | Question | Assumed answer |
|---|---|---|
| 1 | What does "health" mean? | **Energy** meter. No damage, no death. Running out makes the character sleepy and slow until they rest. |
| 2 | Session length and audience | 5-15 minute sessions, all ages (rated for 8+), casual players |
| 3 | Login | **Guest play first**, optional account (email magic link or Google) to save to the cloud |
| 4 | Pixel style | 16-bit, 16-colour master palette, 320x180 internal resolution scaled by whole numbers |
| 5 | Story shape | One gentle main arc plus 18 self-contained NPC arcs of 3 chapters each |
| 6 | Team and time | Solo developer. Plan is phased by milestone, not by calendar date |
| 7 | Monetisation | None. Coins are an in-game currency only and cannot be bought |

---

## 2. Goals and non-goals

### 2.1 Goals

1. A player can pick up the game, understand it without a tutorial wall, and feel calm within the first minute.
2. Every NPC feels like a specific person with their own story, schedule, and favourite things.
3. Progress is never lost. Guests save locally; signed-in players save to the cloud.
4. The game is fully playable with keyboard only, mouse only, or touch.
5. The game runs at a steady 60 fps on a mid-range laptop and a mid-range phone.

### 2.2 Non-goals (v1)

- Real-time multiplayer or chat
- Combat, enemies, or any way to lose
- Paid currency, ads, loot boxes, or timers designed to push players back
- User-generated content or mod support
- Native mobile apps (the web build is installable as a PWA later)
- Anti-cheat. It is a single-player game, so save data is trusted

---

## 3. Target players

| Persona | Needs | Design response |
|---|---|---|
| **Short-break Sana**, plays on a phone between classes | Quick wins, can stop any time | Autosave every 30 s, 3 daily small tasks, pause anywhere |
| **Evening Eshan**, plays on a laptop to wind down | Story, atmosphere, music | NPC arcs, day/night mood, soundtrack |
| **Collector Maya**, loves completing lists | Things to find and fill in | Collection log, journal, cosmetics, home decor |
| **Cautious Chandra**, new to games | No pressure, clear guidance | No fail state, gentle quest hints, large text option |

---

## 4. Core loop

```
Wake up at home
   -> check journal (today's quests, who needs you)
   -> walk the village, talk to villagers, spend Energy on activities
   -> earn coins and items, deepen friendships, unlock story chapters
   -> shop, decorate, customise
   -> go to bed or let Energy run out -> day ends, game autosaves
```

The long loop is **friendship -> story chapter -> village improvement -> lantern glows brighter**. The lantern has 5 brightness stages that unlock as the total story progress rises.

---

## 5. Feature requirements

Priority key: **P0** = must ship in the first playable version, **P1** = part of v1, **P2** = after v1.

### 5.1 Player customisation (P0)

- Choose a **body type** (4), **skin tone** (8), **hairstyle** (10), **hair colour** (12), **outfit** (8 starter), and **accessory** (6 starter: scarf, glasses, hat, bell, flower, none).
- Character is built from **layered sprites** so every combination is possible without drawing each one.
- Editable at any time at the **Mirror** in the player's home; clothes and accessories are also sold in the village tailor.
- Player enters a **name** (max 14 characters, profanity-filtered, letters, numbers, spaces only).
- Live preview with a 4-direction idle animation.

**Acceptance:** A player can finish character creation in under 60 seconds, and their look is saved and shown on the login dashboard.

### 5.2 Audio: theme music and sound effects (P0)

- **Music:** a looping chiptune-lofi soundtrack with one track per time of day (dawn, day, dusk, night), plus a title theme and a rainy-day variation. Tracks crossfade over 4 seconds as time changes.
- **Sound effects:** footsteps (vary by surface: grass, wood, stone, sand), UI move, UI confirm, UI cancel, coin pickup, item pickup, dialogue blip (a different pitch per NPC), door, shop buy and sell, fishing cast and splash, planting, watering, quest accepted, quest complete, friendship heart gained, lantern glow-up, ambient crickets, birds, wind, rain.
- **Mixer:** separate sliders for Master, Music, Effects, and Ambience. Each has a mute toggle.
- Audio starts only after the first user interaction, as browsers require.
- Audio files are OGG with MP3 fallback, music streamed, effects preloaded.

**Acceptance:** All four sliders persist between sessions. No audio plays before the first click or key press.

### 5.3 Custom cursor style (P0)

- Pixel-art cursors as **32x32 PNG** (max size that works across all browsers) set through CSS `cursor`.
- **Cursor states:** default (pointing paw), hover on interactable (open hand), talk (speech bubble), pick up (grabbing hand), fishing (bobber), water (watering can), busy (spinning lantern).
- **Cursor styles (9 at launch):** Classic Paw (default), Leaf, Star, Lantern, Fish, Snail, Moon, Pixel Heart, Mochi. The other 8 are earned through quests or bought at Cursor Corner for coins.
- Setting for **cursor size** (1x, 1.5x, 2x) and a **high-contrast outline** option.
- On touch devices the cursor is hidden and replaced by a short tap ripple.

**Acceptance:** The chosen cursor style appears everywhere in the game, including menus and the dashboard, and falls back to the system cursor if the image fails to load.

### 5.4 Soothing story (P0)

**Premise:** Dusklight Hollow once glowed every night because of the lighthouse lantern. Its keeper, Old Marren, left on a long journey and the lantern went out. Villagers have grown quiet and keep their warmest memories to themselves. The player arrives on the night ferry with a mysterious letter addressed to "whoever can hear the lake."

**Structure:**

| Layer | Content |
|---|---|
| Prologue | Ferry arrival, meeting the ferry cat, first night in a borrowed cottage (about 5 minutes) |
| Main arc, 5 acts | One act per lantern brightness stage. Each act unlocks when the player has finished a set number of NPC chapters |
| NPC arcs | 18 villagers x 3 chapters each (54 chapters) |
| Finale | The Lantern Festival: the village gathers, every villager brings their "ember" (a memory object from their arc) |
| Epilogue | Endless free play: seasons keep turning, new daily tasks continue |

**Tone rules for writing:** gentle, warm, a little funny. No villains, no death scenes on screen, no cliffhangers. Sad moments resolve with comfort. Dialogue lines are short (max 120 characters per box).

**Acceptance:** A player who only follows the main arc can reach the finale in about 6-8 hours. Completing all NPC arcs takes about 15-20 hours.

### 5.5 Retro style (P0)

- 16-bit pixel art on a **16px tile grid**, characters **16x24**.
- Internal render size **320x180**, scaled to the window by whole-number steps (`image-rendering: pixelated`), with letterboxing when needed.
- Master palette of **16 colours** (see `DESIGN.md`), with day, dusk, night, and rain **colour-grade overlays** instead of re-drawn art.
- Pixel font for UI with a plain-language fallback font for long text (see `DESIGN.md`).

### 5.6 Login and dashboard (P0)

**Flow:**

```
Open game -> Title screen -> [Play as guest] or [Sign in]
   Guest: local save only, persistent banner suggests "Back up your game"
   Sign in: email magic link or Google -> dashboard
```

**Dashboard shows:**

- Up to **3 save slots**, each with the player's avatar, name, day and season, lantern stage, play time, and last saved time
- **Continue**, **New game**, **Delete slot** (with confirmation that names the slot)
- **Profile**: display name, avatar preview, email, sign out, delete account and all data
- **Settings** shortcut (audio, cursor, accessibility)
- **Stats**: total play time, friendships, quests done, items collected
- **Link guest save to account**: moves a local save into the cloud

**Acceptance:** Signing in on a second device shows the same three slots. A guest who later creates an account keeps all progress.

### 5.7 Energy system (P0)

*(The "health system" from your list, reframed so it suits a game with no failure.)*

- Energy is a bar from **0 to 100**. It refills fully during sleep.
- Costs: walking 0, talking 0, fishing cast 4, planting 3, watering 2, harvesting 2, gathering 3, mini-game rounds 5-8.
- **Food** restores Energy (cooked meals restore more).
- At 0 Energy the character yawns, walks at 60% speed, and a gentle prompt suggests resting at home. There is **no loss of items, coins, or progress**.
- Sleeping sets the day to the next dawn, advances crops, and triggers autosave.
- Optional **Relaxed mode** in settings: Energy costs are halved.

**Acceptance:** A player can never become stuck. At 0 Energy walking, talking, shopping, and sleeping still work.

### 5.8 Day and night cycle (P0)

- **1 in-game day = 12 real minutes** by default (setting: 8, 12, 20 minutes, or Paused).
- Four phases: **Dawn** (5:00-8:00), **Day** (8:00-17:00), **Dusk** (17:00-20:00), **Night** (20:00-5:00).
- Visuals: colour-grade overlay, long shadows at dawn and dusk, lamp posts and windows light up at dusk, fireflies at night, bats over the lake.
- **NPC schedules** change by hour. Shops have opening hours. A **night market** opens only after 20:00.
- Time **pauses** during dialogue, menus, shops, and photo mode.
- Some items, fish, and bugs appear only at certain times.

**Acceptance:** Every NPC has a schedule with at least four locations over a day, and no NPC is ever unreachable behind a locked door at the wrong time without an in-game hint.

### 5.9 Weather and seasons (P1)

- Weather states: **Clear, Cloudy, Rain, Fog, Snow (winter only), Breezy**. Chosen each morning from season weights.
- Seasons last **14 in-game days** each, in the order **Spring, Summer, Autumn, Winter**. Tile and sprite variants change the look of the village.
- Weather affects: sound (rain loop), fishing catches, crop watering (rain waters crops), NPC dialogue, and some quests.
- Seasonal festival days: Blossom Picnic (spring), Lake Lanterns (summer), Harvest Fair (autumn), Starlight Night (winter), with the Lantern Festival as the finale.

### 5.10 Shop and inventory (P0)

**Inventory**

- **24 slots** at start, expandable to 36 with a backpack upgrade. Stack limit 99.
- Categories: Tools, Seeds, Crops, Fish and Bugs, Food, Gifts, Decor, Wearables, Story items.
- Actions: use, equip, gift, drop. Story items cannot be dropped, gifted, or sold.
- Sort and filter buttons. Hotbar of 6 slots for quick use.

**Shops**

| Shop | Owner | Sells | Hours |
|---|---|---|---|
| Hollow General Store | Biscuit | Tools, seeds, basics | 8:00-18:00 |
| Needle & Thread | Odalys | Outfits, accessories, hairstyles | 9:00-17:00 |
| The Warm Kettle (cafe) | Teodor | Food and drinks | 7:00-20:00 |
| Cursor Corner | Pixel | Cursor styles | 10:00-19:00 |
| Night Market stall | Lumi | Rare decor, rare seeds | 20:00-1:00 |

- Sell price is **50%** of the buy price for most items. Story items cannot be sold.
- Buy and sell dialogs show quantity steppers and the resulting coin total before confirming.

### 5.11 Coin system (P0)

- A single soft currency: **coins**. No premium currency.
- **Sources:** quest rewards, selling items, mini-game payouts, a small daily-tasks bonus, festival gifts.
- **Sinks:** shop items, cosmetics, decor, tool upgrades, home expansion.
- **Targets:** a casual player earns roughly **150-250 coins** per in-game day once past the first week. Early items cost 20-100, mid items 200-600, big items (home expansion, rare decor) 1,500-4,000.
- Coin cap of **999,999**. Coin changes animate in the HUD and play a coin sound.
- Every coin change is written to the save as part of the day-end autosave.

### 5.12 Unique NPCs and stories (P0)

**18 villagers**, each with: a name, role, home, daily schedule, favourite gift, disliked gift, a speech style, and a **three-chapter story arc** that ends with their "ember" (a memory object that goes to the lantern festival).

Friendship runs **0-10 hearts**. Talking daily (+0.25), gifts (+0.5 liked, +1 loved, -0.5 disliked), quests (+1). Chapter 2 unlocks at 3 hearts, chapter 3 at 7 hearts.

| # | Name | Role | Their quiet secret (arc seed) | Ember |
|---|---|---|---|---|
| 1 | **Marren's Cat "Soot"** (ferry cat) | Greets arrivals, appears on the dock | Carries a tiny key on a ribbon and won't say where it fits | The key |
| 2 | **Biscuit** | General store owner, cheerful, anxious about rainy days | Wants to retire to paint but fears closing the shop | A sketchbook |
| 3 | **Odalys** | Tailor | Sews a coat for someone who never comes to collect it | A half-finished coat |
| 4 | **Teodor** | Cafe owner, ex-ship cook | Has a recipe he can't finish because the last ingredient is a memory | A recipe card |
| 5 | **Pixel** | Teen who runs Cursor Corner, collects tiny drawings | Hides that they draw all the cursors themselves | A drawing pad |
| 6 | **Lumi** | Night-market vendor, speaks in riddles | Is afraid the night market will fade if no one comes | A paper moon |
| 7 | **Grandma Fenn** | Retired schoolteacher, tends the village garden | Keeps writing letters to a student who never wrote back | A bundle of letters |
| 8 | **Hobb** | Fisher, silent, patient | Lost his best fishing spot when the lake shifted | A carved bobber |
| 9 | **Juniper** | Gardener's apprentice, over-excited | Planted a seed that never grew and won't tell anyone | A pot of earth |
| 10 | **Captain Ro** | Ferry pilot | Misses the sea and wonders if staying was right | A brass compass |
| 11 | **Wren** | Musician who plays by the lake | Wrote a song with no ending | A music box |
| 12 | **Doc Alder** | Herbalist, gentle, forgetful | Forgot which tea Marren loved most | A tea tin |
| 13 | **Mina** | Child, curious about everything | Believes the lake has a name that only children hear | A shell |
| 14 | **Old Pim** | Retired clockmaker | Every clock in his house is set to a different hour on purpose | A pocket watch |
| 15 | **Sorrel** | Baker who rises at 3 a.m. | Bakes extra bread each night for someone she hasn't met | A warm loaf |
| 16 | **Vesper** | Astronomer in the hilltop observatory | Charted a star that has been missing since Marren left | A star map |
| 17 | **Basil & Thyme** (twin shopkeepers who share one stall) | Market helpers | Argue constantly but finish each other's gifts | A matching pair of mittens |
| 18 | **Marren** (revealed late) | The absent lantern keeper | Never left; has been guiding the player's letters | The lantern wick |

- NPC arcs can be started in any order. Each chapter has a short cutscene (max 90 seconds), one quest, and one change in the village (for example a new decoration, an open door, a changed shop item).
- **Dialogue** is data-driven (JSON), with conditions for time, weather, season, friendship, and completed quests.
- Writing guide: each NPC has a **voice sheet** (3 sample lines, 5 favourite words, 1 verbal habit) kept in `/content/npcs/<id>.md`.

### 5.13 Quest system (P0)

**Quest types**

| Type | Source | Example |
|---|---|---|
| Main | Lantern acts | "Find three lamp oils" |
| NPC chapter | Villagers | "Help Teodor taste the soup at dusk" |
| Small task | Daily board, 3 per day | "Catch a perch", "Water 5 plants" |
| Discovery | World | "Find all 12 lake shells" |

**Quest states:** Hidden, Available, Active, Ready to turn in, Completed.

**Rules**

- Up to **5 active quests** at once. Extras wait in the journal.
- Every active quest shows a **plain hint** in the journal. A *"Where do I go?"* button highlights the area on the village map.
- No quest can fail or expire. Daily small tasks refresh each morning but old ones are never lost.
- Rewards: coins, items, friendship, cosmetics, story progress.
- Quest data is stored as JSON definitions with objectives (collect, deliver, talk, reach, craft, time-of-day) and rewards, so new quests need no code changes.

### 5.14 Cozy mini-games (P1)

| Mini-game | Priority | Summary |
|---|---|---|
| **Fishing** | P0 for the vertical slice | Cast, wait for the bobber, press at the ripple, then hold to keep the fish in the calm zone. Slow and forgiving. Different fish by time, weather, season |
| **Gardening** | P1 | Plant seeds, water daily, harvest after N days. Rain waters crops. Seasonal crops |
| **Cooking** | P2 | Combine 2-3 ingredients into meals that restore Energy |
| **Bug and shell catching** | P2 | Quiet net-swing collecting for the collection log |

Every mini-game has an **easy-mode toggle** and can be skipped by buying the finished item at a higher price.

### 5.15 Journal, collection log, and photo mode (P1)

- **Journal** tabs: Today, Quests, People, Collection, Map.
- **People** shows each villager's portrait, hearts, favourite things (once discovered), and story chapters found.
- **Collection log** tracks fish, bugs, shells, crops, recipes, cursors, wearables, and decor with silhouettes for undiscovered items.
- **Photo mode:** hides the HUD, free camera pan, a few frames and filters (Warm, Cool, Mono, Dusk), save as PNG. Time is paused.

### 5.16 Pet companion and home decor (P1)

- **Pet:** adopt Soot the ferry cat in Act 2 (or choose a pup, bunny, or duck at the shelter). The pet follows the player, reacts to weather, and can be named. Pets give small comfort bonuses like a short "cozy glow" when idle, nothing that changes balance.
- **Home:** one cottage with **3 expansions** (porch, loft, garden). Placeable decor on a grid, rotate, remove, save layouts. Up to **120 placed items**.
- Decor sources: shops, quests, festivals, mini-game rewards.

### 5.17 Accessibility and comfort (P0)

- Full **keyboard** control with remappable keys. Full **mouse and touch** control.
- **Text size** (S, M, L, XL), **dyslexia-friendly font** option, **high-contrast UI**, **colourblind-safe** palettes (deuteranopia, protanopia, tritanopia).
- **Reduced motion** (cuts screen shake, parallax, particle density, and blinking), **reduced flashing**.
- **Pause anywhere**, **dialogue speed** (instant, fast, normal, slow), **auto-advance** option.
- **Captions** for important sounds (for example *[distant bell]*, *[rain begins]*).
- Settings apply instantly and are saved to the profile.

Target: **WCAG 2.2 AA** for all HTML UI (menus, dashboard, dialogue) and a **3:1** contrast minimum for game UI elements.

---

## 6. Technical requirements

### 6.1 Stack

| Layer | Choice | Reason |
|---|---|---|
| Game engine | Phaser 3 (Arcade physics) | Mature 2D engine with tilemap and audio support |
| Language | TypeScript | Safer content and save schemas |
| Build | Vite | Fast dev loop and static output |
| Maps | Tiled (JSON export) | Standard tile editor, supports object layers for triggers |
| UI | HTML and CSS overlay on the canvas | Accessible, screen-reader friendly, easy forms for login |
| State | A small typed store (Zustand or a plain event-driven store) | Single source of truth for inventory, quests, time |
| Backend | Supabase | Auth, Postgres, RLS, Storage, and free tier |
| Hosting | Cloudflare Pages or Vercel (static) | Free, fast, CDN |
| Analytics | Plausible or none | Privacy-friendly. Optional |

### 6.2 Supabase data model

Auth is handled by Supabase Auth (`auth.users`). All tables below use **Row Level Security**: a user can only read and write rows where `user_id = auth.uid()`.

```sql
-- Public profile, one row per account
create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 14),
  cursor_style text not null default 'classic_paw',
  settings jsonb not null default '{}',          -- audio, accessibility, keybinds
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Up to 3 save slots per user
create table save_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  player_name text not null,
  avatar jsonb not null,                          -- layered sprite choices
  day int not null default 1,
  season text not null default 'spring',
  lantern_stage smallint not null default 0,
  play_seconds int not null default 0,
  coins int not null default 0 check (coins between 0 and 999999),
  energy smallint not null default 100,
  state jsonb not null,                           -- full game state (see 6.3)
  schema_version int not null,
  revision int not null default 1,
  updated_at timestamptz not null default now(),
  unique (user_id, slot)
);

-- Friendship and story progress
create table npc_progress (
  save_id uuid references save_slots on delete cascade,
  npc_id text not null,
  hearts numeric(3,2) not null default 0 check (hearts between 0 and 10),
  chapter smallint not null default 0 check (chapter between 0 and 3),
  gifts_today smallint not null default 0,
  primary key (save_id, npc_id)
);

-- Quest log
create table quest_progress (
  save_id uuid references save_slots on delete cascade,
  quest_id text not null,
  status text not null check (status in ('hidden','available','active','ready','completed')),
  objectives jsonb not null default '{}',
  completed_at timestamptz,
  primary key (save_id, quest_id)
);

-- Collection log (fish, bugs, cursors, decor, recipes)
create table collection (
  save_id uuid references save_slots on delete cascade,
  item_id text not null,
  first_found_day int not null,
  count int not null default 1,
  primary key (save_id, item_id)
);
```

- **Inventory and home layout** live inside `save_slots.state` (JSON), since they are only ever loaded and saved with the whole slot.
- **Relational tables** hold things the dashboard and journal want to query without loading the whole save (friendship, quests, collection).
- Content definitions (items, NPCs, quests, dialogue) are **static JSON shipped with the build**, not database rows. This keeps hosting free, versions content with the code, and means the game works offline.

### 6.3 Save and sync

- **Autosave** at the end of each in-game day, on closing menus, every 30 seconds of real time in the background, and on `visibilitychange` (tab hidden).
- Saves go to **localStorage/IndexedDB first**, then sync to Supabase if signed in. Works offline and syncs when the connection returns.
- **Conflict rule:** compare `revision`. If both devices changed the same slot, show a small dialog: *"This save changed on another device. Keep this device's version or the cloud version?"* with the day, play time, and last saved time for each.
- `schema_version` + a migration function per version bump so old saves always load.
- **Guest to account:** local slots are uploaded as new rows when the player signs in; the local copy is kept until the upload succeeds.
- Account deletion removes every row (cascade) and signs the user out.

### 6.4 Security and privacy

- Supabase **anon key only** in the client. Never ship the service-role key.
- RLS on every table, with tests that prove a user cannot read another user's rows.
- Display names are validated on the client and with a database check.
- No personal data beyond email, display name, and game data. No tracking cookies.
- A short, plain-language privacy page and a one-click **Export my data** and **Delete my account**.

### 6.5 Performance budget

| Item | Budget |
|---|---|
| First load (compressed) | under 4 MB to reach the title screen, remaining assets streamed |
| Frame rate | 60 fps on mid-range laptop and phone, never below 30 |
| Memory | under 300 MB |
| Time to interactive | under 3 seconds on broadband |
| Save time | local save under 50 ms, cloud sync in background |

### 6.6 Browser and device support

Latest two versions of Chrome, Edge, Firefox, Safari (desktop and iOS 16+), and Chrome for Android. Minimum screen: 360 x 640 portrait is supported for menus; the game itself plays best in landscape with a rotate hint.

### 6.7 Suggested repository layout

```
/src
  /game        scenes, systems (time, weather, energy, quests, shop)
  /ui          HTML/CSS overlay: HUD, menus, dialogue, dashboard
  /data        items.json, npcs.json, quests.json, shops.json
  /services    supabase client, save manager, auth
/public
  /assets      sprites, tilesets, audio, cursors, fonts
/content
  /npcs        voice sheets and dialogue source
/tests         save migrations, RLS tests, quest engine
```

---

## 7. Milestones (solo developer)

Effort figures are rough. They assume part-time, steady work, and should be re-estimated after Milestone 1.

| # | Milestone | Scope | Rough effort |
|---|---|---|---|
| M0 | Foundations | Repo, Vite + Phaser + TS, 320x180 scaling, tilemap loading, player walking, one test map | 1 week |
| M1 | **Vertical slice** | Day/night, HUD with Energy and coins, inventory, one shop, dialogue engine, **3 NPCs with full arcs**, 5 quests, fishing, character creator, custom cursor, music and SFX, guest save | 4-5 weeks |
| M2 | Accounts | Supabase auth, dashboard, 3 save slots, cloud sync, guest-to-account, RLS tests | 1-2 weeks |
| M3 | Systems | Weather, seasons, gardening, journal, collection log, settings and accessibility | 3 weeks |
| M4 | Content | The other 15 NPCs and arcs, main story acts, all shops, all cursors, decor, home expansions, pet | 6-8 weeks |
| M5 | Polish and launch | Photo mode, festival events, balance pass, QA, performance, accessibility audit, privacy page, deploy | 2-3 weeks |

**Cut order if time is short** (cut first to last): bug catching, cooking, pet breeds, photo filters, weather types, seasons (keep one), then NPC count (minimum 15 as you specified).

---

## 8. Success metrics

| Metric | Target |
|---|---|
| Players who finish character creation | 85% |
| Players who return for a second session within 7 days | 35% |
| Average first-session length | 8-15 minutes |
| Players who complete one NPC chapter in the first session | 60% |
| Crash-free sessions | 99.5% |
| Save-loss reports | 0 |
| Accessibility settings used by at least one player in 5 | Track only, no target |

If analytics is not used, replace these with a short optional in-game feedback form.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| 18 NPCs with unique stories is a lot of writing and art | Schedule slips | Build the engine and 3 NPCs first; use a voice sheet template; share portrait and sprite rigs |
| Day/night + weather + seasons multiply art needs | Art workload | Colour-grade overlays instead of repainted art; seasonal variants only for tilesets |
| Cloud sync conflicts lose a player's progress | Player trust | Revision numbers, never silently overwrite, keep the last 2 cloud backups |
| Browser audio autoplay blocks | Silent first impression | Start audio on first interaction with a friendly "Tap to begin" title |
| Mobile performance | Poor feel | Integer scaling, texture atlases, object pooling, test on a real mid-range phone early |
| Scope creep from extras | Never finishes | P0/P1/P2 labels and the cut order above |

---

## 10. Open questions

1. Confirm or change the **assumptions** table in section 1.2.
2. Who draws the art and writes the music: you, a collaborator, or licensed asset packs? (This decides how unique the NPCs can look.)
3. Do you want a **Hindi/English** or other language option from the start? Dialogue stored as JSON makes adding languages straightforward if planned now.
4. Should the final game be a free public release, a portfolio piece, or a college or hackathon project? This changes how much polish and privacy work is needed.
5. Is Soot the ferry cat counted among the 18 NPCs? (Currently yes. If you want 18 humans plus pets, the list grows by one.)
