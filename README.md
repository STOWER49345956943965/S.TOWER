# FAMILYATLAS — GitHub Pages starter

A static, interactive family-network atlas inspired by the supplied visual reference.

## Run locally
Because this project uses JavaScript modules, run it through a local static server rather than opening `index.html` directly. In VS Code, use the **Live Server** extension, or run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish on GitHub Pages
1. Create a GitHub repository.
2. Upload the contents of this folder (keep the `Dots` and `Towers` folders).
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**, select `main` and `/ (root)`, then save.

## Customize each dot
Every dot has its own JavaScript file in `Dots/`. Example:

```js
export default {
  id: "dot-001",
  name: "Far_Signal",
  title: "Far Signal",
  discovered: true,
  color: "#f06bff",
  daysAway: 2554,
  x: 400,
  y: 260,
  group: "MID-DARK",
  badgeUri: "https://your-site.com/badge.gif",
  badgeBackgroundUri: "https://your-site.com/badge-background.png",
  bannerUri: "https://your-site.com/banner.jpg",
  profileBackgroundUri: "https://your-site.com/avatar.gif",
  description: "Short public description.",
  lore: "Long family lore goes here.",
  members: 1200,
  elevations: 18,
  connections: 12,
  status: "KNOWN SIGNAL"
};
```

- `discovered: true` makes the dot clickable and reveals its public family card.
- `discovered: false` leaves it visible but locks members, elevations and lore.
- `daysAway` remains visible for undiscovered dots.
- `color`, `x`, `y`, `group`, `title`, image URIs and text are independently editable.
- To add a new dot file, also import it and add it to the `dots` array in `Dots/index.js`. Keep IDs unique.

The ten initially discovered records are the only clickable family dots. The other 90 records are visible, undiscovered signals.

## Customize server towers
Each tower has an individual config in `Towers/`. The five towers are imported through `Towers/index.js`.

## Notes
This is a front-end prototype. Membership counts, elevations, tower telemetry, alerts, raids and reinforcements are simulated locally; they are not connected to real accounts or live servers. Do not put private personal information in a public GitHub repository. Use image URLs that permit public embedding.
