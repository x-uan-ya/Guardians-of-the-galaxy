# MARS: OUTPOST ZERO

**An educational space-survival simulation made for the 2026 NASA Space Apps Challenge.**

You manage a Mars outpost for 30 Sols — balancing power, water, food and oxygen, responding to crises and learning how every decision ripples forward in time. When the mission ends, a full debrief shows what happened, why it mattered and how real NASA missions handled the same problems.

🌐 **Play now (no account needed):** [guardians-of-the-galaxy-flax.vercel.app](https://guardians-of-the-galaxy-flax.vercel.app/)
*Click **Continue as Guest** on the login screen. Account sign-up and the shared leaderboard need a database that is not connected on the public copy.*

📦 **Source code:** [github.com/x-uan-ya/Guardians-of-the-galaxy](https://github.com/x-uan-ya/Guardians-of-the-galaxy)

---

## What the game does

| Feature | Detail |
| --- | --- |
| **30-Sol survival loop** | Each Sol you pick one action and end the day. The engine applies production, consumption, delayed effects and then checks whether a new event fires. |
| **Eight occupations** | Engineer, Scientist, Medical Officer, Botanist, Geologist, Chemist, Commander, Pilot — each changes starting attributes and adds a unique passive every Sol. |
| **Three mission sites** | Lunar Outpost (Moderate), Mars Outpost (Hard), Deep-Space Outpost (Extreme). Each has distinct modifiers: radiation rate, solar factor, resupply rules. |
| **50+ events across 5 chapters** | Storyline events trigger on fixed Sols; crisis events (solar storm, water contamination, power instability …) trigger when conditions are met. |
| **Resource allocation controls** | Prioritise life support, food, power-saving mode, backup generator and emergency allocation — all go through the engine, never direct state mutations. |
| **Multi-Sol projects** | Repair the generator (2 Sols), plant crops (3 Sols), reinforce shielding (3 Sols), rest and recover — the result fires as a delayed effect. |
| **Power blackout rule** | A Sol that ends at 0 power counts. Three consecutive blackout Sols end the mission: "The outpost stayed without power for too long. Life support failed." |
| **Decision timeline** | The debrief shows every decision as an expandable row; consequence rows (delayed effects that really fired) are linked back to the choice that caused them. |
| **Leadership profile** | Five trait signals (Risk Taker, Survivor, Optimiser, Humanitarian, Explorer) are scored across all decisions and shown in the debrief. |
| **Educational lessons** | 10 topics — resource scarcity, redundancy, radiation, life support, thermal control, power management, risk management, decision under uncertainty, cascading failures, water and food — each with real NASA/ESA references. |
| **AI Mission Controller** | Rule-based by default (the Mission Safety Protocol). Plug in your own LLM server via `VITE_ADVISOR_ENDPOINT` in `.env`. |
| **Accounts + leaderboard** | Optional: requires a Neon Postgres database (see Server setup below). Without it, the game runs entirely in browser localStorage. |

---

## NASA data and resources used

The game's educational lessons link directly to NASA and ESA primary sources.
All gameplay numbers are illustrative assumptions — they are not real NASA mission data or engineering specifications.

**NASA pages referenced inside the game's debrief:**

| Topic | NASA source |
| --- | --- |
| Resource scarcity | [Environmental Control and Life Support Systems (ECLSS)](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/) |
| Redundancy | [Fault Tolerance in Space Shuttle Systems (NTRS paper)](https://ntrs.nasa.gov/api/citations/20070031840/downloads/20070031840.pdf) |
| Apollo 13 | [Apollo 13: Mission Overview](https://www.nasa.gov/mission/apollo-13/) |
| Radiation | [Space Radiation](https://www.nasa.gov/directorates/esdmd/hhp/space-radiation/) |
| Space weather | [NOAA Space Weather Prediction Center](https://www.spaceweather.gov/) |
| Oxygen / life support | [ECLSS Fact Sheet](https://www.nasa.gov/missions/station/station-tech-demo-eclss-factsheet/) |
| Thermal control | [ISS Active Thermal Control System Overview (PDF)](https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf) |
| Mars environment | [Mars Facts](https://science.nasa.gov/mars/facts/) |
| Solar power | [Solar Arrays on the ISS](https://www.nasa.gov/image-article/solar-arrays-international-space-station-2/) |
| Radioisotope power | [Radioisotope Power Systems](https://science.nasa.gov/planetary-science/programs/radioisotope-power-systems/) |
| Risk management | [NASA's Understanding of Risk in Apollo and Shuttle (PDF)](https://ntrs.nasa.gov/api/citations/20190002249/downloads/20190002249.pdf) |
| Challenger | [35 Years Ago: Remembering Challenger](https://www.nasa.gov/history/35-years-ago-remembering-challenger-and-her-crew/) |
| Mars comms delay | [Mars 2020 Perseverance Rover Communications](https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/) |
| Columbia | [Columbia Accident Investigation Board Synopsis](https://www.nasa.gov/history/columbia-accident-investigation-board-synopsis/) |
| Water recovery | [NASA Achieves Water Recovery Milestone on the ISS](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/) |
| Growing food in space | [Growing Plants in Space](https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/) |

**ESA pages referenced:**
- [Advanced Closed Loop System](https://www.esa.int/articles/about-us/directorates/human-and-robotic-exploration/advanced-closed-loop-system)
- [New life support system cleans air on the Space Station](https://www.esa.int/articles/about-us/directorates/human-and-robotic-exploration/new-life-support-system-cleans-air-during-full-house-space-station)

**Background image:** the Mars background (`public/mars-bg.webp`) is an official NASA concept artwork showing two astronauts working on Mars. It has been cropped to remove the NASA logo and www.nasa.gov caption.

---

## AI tools used

This project used AI tools to accelerate implementation.

| What | Tool | How |
| --- | --- | --- |
| Code (all TypeScript / React / CSS) | Kiro (AI coding assistant) | Implementation, test generation, debugging |
| Chapter introduction artwork (`public/chapters/`) | AI image generator | Labelled "AI-generated image" in the game UI as required by the NASA Space Apps rules |
| Mission ending artwork (`public/endings/`) | AI image generator | Labelled "AI-generated image" in the game UI |
| How to Play video (`public/tutorial/how-to-play.webm`) | Screen-recording script + AI-assisted caption | The script plays the real game; captions and title cards were AI-assisted |

The game concept, design, game rules, educational content and NASA references were created by the team.
No NASA logos, flags or mission identifiers appear in any AI-generated content.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| UI library | React 18 |
| Language | TypeScript (strict mode) |
| Build / dev | Vite 5 |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| Tests | Vitest + jsdom (35 test files) |
| Persistence | Browser `localStorage` (guest) + optional Neon Postgres (accounts) |
| Hosting | Vercel (static front-end) |

---

## Running locally

Requires Node 18+ and npm.

```bash
npm install        # install dependencies
npm run dev        # start the dev server  (http://localhost:5173)
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build locally
npm test           # run all tests once
npm run lint       # run ESLint
```

The game works without any environment variables. Guest mode runs entirely in the browser.

### Optional: accounts and leaderboard

Create a `.env` file in the project root:

```
DATABASE_URL=postgres://...   # Neon Postgres connection string (pooled)
```

The dev server reads this and exposes `/api/users`, `/api/leaderboard` and `/api/state` via the Vite plugin in `server/leaderboardApiPlugin.ts`. The front-end tables are managed by `server/usersDb.ts` and `server/leaderboardDb.ts`.

### Optional: live AI advisor

```
VITE_ADVISOR_ENDPOINT=https://your-server/advisor
```

The game POSTs a compact summary to that URL and expects JSON
`{ actionId, confidence: "low"|"medium"|"high", reason, risk, expectedConsequence }`.
The fallback (rule-based Mission Safety Protocol) activates automatically if the endpoint is missing, slow or returns invalid data. To test the fallback without a server, open the game with `?advisor=outage`.

---

## Project structure

```
src/
  app/                  Composition root + navigation
  components/           App chrome and reusable UI pieces
  features/
    simulation/         ★ The authoritative engine (owns game state)
    decisions/          Decision types + read-only history selectors
    events/             Event types, catalog and triggers
    dashboard/          Mission tablet, bunker view, resource HUD
    mission/            Mission config, occupations, setup screens
    debrief/            Timeline, outcome analysis, leadership profile
    educational-explanations/  Topic lessons + live NASA/ESA references
    storyline/          Chapter introductions
    ai-advisor/         Rule-based advisor + optional AI provider
    auth/               Login, sign-up, guest session
    leaderboard/        Score submission and display
    history/            Per-account play history
    progression/        Badges and rank progression
    glossary/           Hover tooltips for space terms
    how-to-play/        In-game tutorial video
    tutorial/           First-time 5-step interactive tutorial
  hooks/
    useGameState.ts     ★ The single React entry point to the engine
  lib/                  localStorage, validation, seeded RNG, IDs
  tests/                35 Vitest suites
  main.tsx              Entry point
server/                 Node-side Vite plugin + Neon DB modules (optional)
tools/tutorial-video/   How to Play video recording tools (not part of the app)
docs/                   Architecture notes
public/
  chapters/             Chapter introduction artwork (AI-generated)
  endings/              Mission outcome artwork (AI-generated)
  tutorial/             How to Play video
  mars-bg.webp          NASA Mars concept artwork (cropped, credit: NASA)
```

---

## Engine guarantees

The simulation engine (`src/features/simulation/simulationEngine.ts`) is the only thing that mutates game state. All other modules read state and dispatch intents.

- **Immutability** — inputs are never mutated; a new state is always returned.
- **Determinism** — same config + same decision sequence = identical result. No `Math.random` in the engine.
- **Bounds** — all metrics stay within `[0, 100]`; `NaN` / `Infinity` are rejected.
- **Causality** — each delayed effect fires exactly once, only when `day >= scheduledDay`.
- **Validation** — unknown or unavailable action IDs are rejected; decisions cannot be made after the mission has ended.

### Mission status rules

| Status | Trigger |
| --- | --- |
| `failed` | Oxygen or crew health hits 0, radiation reaches 100, or power is 0 for 3 consecutive Sols |
| `completed` | Survived to Sol 30 while active |
| `critical` | Any resource ≤ 15, health ≤ 15, or radiation ≥ 80 (recoverable) |
| `active` | Otherwise |

Terminal statuses (`failed` / `completed`) are never downgraded.

---

## Team

Built for the 2026 NASA Space Apps Challenge.
