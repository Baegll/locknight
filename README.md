# Locknight

A browser app for 6v6 Deadlock drafts, match records, and player ratings, implemented from [DESIGN.md](DESIGN.md). Data can be imported and exported as JSON.

## Run

Use Node 24.19.0 (see `.node-version`). Normally run `npm ci`, then `npm run dev`. In this managed workspace, `node_modules` is a junction to the existing personal site's Astro installation because npm network access is blocked. Do not run `npm install` through that junction; use a regular installation when moving the project.

Open **http://127.0.0.1:4321/projects/locknight/**. The portfolio homepage and projects listing in this workspace are copies of `../Baegll.github.io`; the projects page links to Locknight. `localhost:4321` also currently reaches the preview; the numeric IPv4 URL avoids depending on local hostname resolution.

New browsers start with an empty roster and match history. Add players in **Players**, or import records in **Data & patches**. Download the configured [empty JSON](public/projects/locknight/initial-records.json) to prepare records yourself. **Start fresh** restores that file after confirmation. Existing saved browser records are preserved on upgrade. Mark at least 12 players Ready, draft teams, choose heroes, select a winner, and record the match. More players can be ready than will be drafted. Sit out skips one recorded match; Away lasts until changed. Export JSON before clearing browser data. An unrecorded draft is temporary; records persist in local storage.

See [PUBLISH.md](PUBLISH.md) for GitHub setup and deployment through the personal website. Synthetic data is kept only in `tests/fixtures/` and is not included in the app build.

The interface uses the personal site's `Portfolio.astro` layout and shared design tokens, fonts, and theme preference. [BRAND.md](BRAND.md) describes the visual and copy rules. The app uses direct labels and short instructions, with optional explanations on hover and keyboard focus. [CONFIG.md](CONFIG.md) lists the editable files. [JSON-FORMAT.md](JSON-FORMAT.md) explains both file formats using simplified technical English.

## Draft rules

- Games are always 6v6. Substitutes become distinct roster players. Remakes and abandoned games are not recorded as completed results.
- Pool availability edits preserve the current draft, hero choices, bans, and winner. Captain drafts update only their undrafted pick pool. Assigned players stay in the current match even when marked Away or Sit out; those statuses affect later drafts. Sit out returns to Ready after a match that the player did not play.
- Captains are assigned to their own teams before picking. Choose them manually or use Random captains.
- Simple Draft: Sapphire, Amber, Amber, Sapphire, Sapphire, Amber, Amber, Sapphire, Sapphire, Amber. The first-side selector defaults to Amber.
- One Ban Draft: Amber hero ban, Sapphire hero ban, then the ten snake picks. The first-banning side receives the last player pick.
- Two Ban Draft: first ban round, six player picks (three drafted players per side, in addition to the captains), second ban round, four remaining player picks. Each ban removes one hero. The First ban selector can reverse sides.
- Balanced random draws 12 Ready players, then prefers estimates near 50%. Random draws 12 Ready players without that balance bias. Both offer two distinct heroes per player. Choose one option before recording. Random heroes rerolls all options; the per-player ↻ button rerolls only that player. Hero preferences are stored, not used to bias assignment.
- Manual mode assigns exactly six distinct players per side. Drag Ready players into slots or use team selectors. Captain drafts also accept drops on the side whose turn it is. Heroes must be unique across both teams; banned and other players’ reserved heroes cannot be assigned.

## Data and ratings

The frozen [JSON schema](public/projects/locknight/schema-v1.json) is version 1. Runtime validation additionally checks unique and safe IDs, cross-record references, two distinct six-player teams, 12 catalog heroes, full draft rating snapshots, and ban constraints. Invalid imports preserve the current records. Valid imports require confirmation before replacement.

Match ordering is timestamp followed by ID. Corrections keep an edit trail; the original draft snapshot stays intact. Every replay starts with the declared priors and updates overall and player/hero ratings from team wins and losses. Ratings carry across patch boundaries. Reports show sample counts, μ and σ, conservative μ − 3σ, hero records, teammate pairs, and draft-time expectations versus outcomes. Sparse history does not measure individual contribution.

`src/lib/skill.mjs` specializes the MIT-licensed OpenSkill Plackett–Luce equations for two teams and equal participation. It follows the upstream tau update and uses a normal CDF approximation (error under 8e-8). This is a focused local implementation, not the npm OpenSkill package. Attribution and the license are in `src/vendor/`. Control feedback uses short CSS transitions. Placement and hero selection animate the affected slots. These effects are configured per hero and respect reduced motion. Ordinary row updates and section changes do not replay entrance animations.

## Commands

```sh
npm run build
npm test
npm run test:browser
npm run report -- tests/fixtures/demo-source.json --patch demo-patch-01 --json artifacts/report.json
npm run report -- tests/fixtures/demo-source.json --rebuild artifacts/rebuilt.json
npm run sync:patches
node scripts/sync-patches.mjs --html path/to/saved-steamdb-page.html
node scripts/sync-heroes.mjs
node scripts/schema.mjs
node scripts/generate-demo.mjs
```

Patch sync attempts SteamDB and preserves the existing catalog if its request or parsing fails. A saved page with rendered patch rows can be supplied with `--html`. The UI loads that catalog; for a deployed static site, rebuild and deploy after syncing. Manual UTC patches work independently of SteamDB. The checked-in catalog contains the 24 SteamDB rows supplied by the user on 2026-10-03. It is a saved snapshot, not a verified live fetch; synthetic patches exist only in test fixtures. Fresh records load this catalog. Refresh catalog merges it into existing records. Hero sync accepts a saved Deadlock API JSON as its optional first argument and preserves existing IDs. Regenerate the schema after catalog changes.

Browser tests use installed Chrome with an isolated profile in `artifacts/`, disabled GPU acceleration and no browser sandbox inside the already restricted execution environment. Set `CHROME_PATH` for another Chromium installation. They use Chrome's native DevTools protocol; no browser automation package download is required. Screenshots and test results are saved in `artifacts/`.

## Personal website integration

The local portfolio integration is implemented and browser-tested in this workspace. The original sibling site directory is outside the writable workspace. The complete integration can be applied from a session with write access to that site:

```sh
npm run integrate -- ../Baegll.github.io
```

This copies the app route/modules, empty starting records, schemas, catalog and retained licenses, adds the Locknight project card once, and adjusts the project count. It needs only the site's existing Astro dependency. Run the site's build to produce `/projects/locknight/index.html`; publish through the site's normal GitHub Pages workflow. The app uses the root `/projects/locknight/` path and does not require Sites hosting.

The standalone app and portfolio preview build successfully. A full sibling-site copy was also staged under `integration-check/`; its existing Quartz blog bundler fails in this managed environment because esbuild cannot read parent directories while resolving imports. Full-site build verification and application to the original site remain pending in a session with the required filesystem access.

Sources: [OpenSkill equations](https://github.com/philihp/openskill.js), [SteamDB patch catalog](https://steamdb.info/app/1422450/patchnotes/), [Deadlock Labs draft reference](https://deadlocklabs.gg/draft-pick/), [Deadlock hero API](https://assets.deadlock-api.com/v2/heroes). The draft reference informed the flow; no source or assets were copied from it.

## Player preferences

Share `/projects/locknight/preferences/` with players. Each player fills in their name and preferences, then downloads a small JSON file. **Players → Import player** validates it and lets the leader choose a roster record to update or add it as a new player. This preserves match history and stable roster IDs. The profile page stores its own draft separately from the leader’s data. The optional player schema is `public/projects/locknight/player-schema-v1.json`.
