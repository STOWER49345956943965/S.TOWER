# S.TOWER — Network Atlas

A React + Vite prototype of the interactive family/server atlas.

## Run locally
1. Install Node.js 20+
2. In this folder run `npm install`
3. Run `npm run dev`
4. Open the local URL Vite prints.

## Customize families
Edit the individual files in `src/Dots/`. Each file exports its own family configuration:
- `discovered`: controls whether the profile can be opened
- `color`, `glowColor`: node identity and glow
- `daysAway`: sample value (the prototype recalculates map distance relative to the selected origin)
- `badgeURI`, `badgeBackgroundURI`, `bannerURI`
- `members`, `elevations`, `lore`
- `x`, `y`: normalized map coordinates from 0 to 1
- `connections`, `group`

Register each new dot in `src/data.js`. The map renders 1,150 procedural ambient signal points as a lightweight infinite-feeling background; named family records are individually configurable.

## Customize towers
Edit `src/Towers/Tower_01.js` through `Tower_05.js`, then register additional towers in `src/towers.js`.

## Important prototype notes
- The origin is intentionally **not persisted**. Refreshing the page returns to the family search screen.
- The five tower telemetry streams are simulated client-side. They are not real server measurements.
- The initial atlas contains five sample family records, four discovered and one undiscovered. Add the remaining discovered family records to reach your planned initial ten.
- The demo does not yet have a secure backend. Do not put real private family data in public JS files. A production release needs server-side access control and a database/API.
- Distances are prototype estimates derived from normalized map coordinates. Replace the distance scale with your canonical world-distance model when defined.
