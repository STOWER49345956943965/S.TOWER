# Family Atlas — GitHub Pages starter

A static, client-side interactive map. No backend or build step is required.

## Run locally
Open `index.html` with a local static server (VS Code Live Server is recommended). ES modules may not load correctly from a `file://` URL.

## Publish to GitHub Pages
1. Create a GitHub repository.
2. Upload the contents of this folder (not the enclosing ZIP).
3. In **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`.
4. Save and wait for the deployment URL.

## Customize a family
Every known family has its own file in `Dots/`. Edit its default export:
- `name`, `title`, `lore`
- `color`, `x`, `y`, `daysAway`
- `discovered` — `true` makes it public/clickable; `false` keeps its data private
- `members`, `eliminations`, `elevations`
- `badgeUri`, `bannerUri`, `profileUri`, `backgroundUri`
- `showMembers`, `showEliminations`, `showLore`, `group`

Use relative paths such as `assets/my-banner.jpg` for images. Add the image file to the repository. `profileUri` controls the circular profile image, `badgeUri` controls the badge beside the name, `bannerUri` controls the banner, and `backgroundUri` adds a panel background. Put your image files in the repository and use their relative paths.

To add another named family, create a new module in `Dots/`, import it in `Dots/index.js`, and add it to the exported array. The nine included modules are the nine discovered examples.

## Towers
Edit the five entries in `Towers/towers.js`. Towers are independent of family nodes and show generated heat, connection counts, spike telemetry, and occasional simulated restart states.

## About the 90 million nodes
The app represents a 90,000,000-node virtual field. It procedurally generates stable, deterministic decorative nodes only for the visible map area. This avoids creating 90 million DOM/canvas objects at startup and keeps navigation responsive. The nine family profiles and five tower records are explicit editable data.

## Roaming vessel
WING-GGR.8290 is a newly charted vessel that moves independently across the map. Random congregation alerts are currently disabled.

## Conflict simulation
`KILL_SWITCH` in `app.js` starts the conflict automatically when the page loads, bypassing the family-name welcome screen. Undiscovered nodes retreat, return fire, and are removed in a simulated 3-minute battle while the header count decreases. Discovered families and ships are unaffected. Set `KILL_SWITCH` to `false` to restore the normal welcome flow.

## Important
This is a front-end simulation: generated telemetry, member counts, distance values, battles, and tower activity are not live server data. A real community directory with authenticated private family information requires a backend, database, and access control. Do not put sensitive/private records in public JavaScript files.

## Search names
The welcome/search field accepts a family's displayed name, its file ID (for example `ember`), or its title. Matching ignores capitalization, spaces, punctuation, and an optional leading `@`.
