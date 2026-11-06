# Family Atlas — GitHub Pages starter

A neon sci-fi family network atlas with searchable discovered families, procedurally generated undiscovered signals, privacy-redacted unknown profiles, and five simulated live server towers.

## Run locally
Because the project uses JavaScript modules, serve the folder with a local static server:
- `python -m http.server 8000`
- open `http://localhost:8000`

## Publish on GitHub Pages
1. Create a GitHub repository and upload the contents of this folder.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**, select `main` and `/ (root)`, then save.

## Customize
- `Dots/`: one independent JS config per discovered family.
- `Towers/`: one independent JS config per tower.
- `src/data.js`: register each config file here.
- `src/main.js`: map behavior, search, profiles and live tower simulation.
- `styles.css`: visual system, glows, motion, layout.

This is a front-end prototype. Tower telemetry and procedural unknown signals are simulated locally; connect a backend/database before using real private member or server data.
