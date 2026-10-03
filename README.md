# Locknight

6v6 Deadlock drafts, hero preferences, match records, and player ratings.

## Run locally

Use Node 24.19.0 or newer. In a fresh clone:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4321/projects/locknight/.

## Run a lobby

1. Add players under **Players**, or import existing records under **Data & patches**.
2. Mark players **Ready**, **Sit out**, or **Away**. More than 12 can be Ready; each match drafts 12.
3. Choose **Balanced random**, **Random**, **Captains**, or **Manual teams**.
4. Assign heroes, select the winning team, and record the match.
5. Export JSON to keep a backup.

Balanced random favors even teams. Random ignores ratings. Both give each player two hero choices. Captains use snake picks and optional hero bans. Manual teams support drag and drop.

Changing availability keeps the current draft. Sit out returns to Ready after a recorded match the player did not play. Away stays until changed. Hero priorities are saved for reference; they do not bias random draws.

Share `/projects/locknight/preferences/` with players. They can export their preferences for the lobby leader to import under **Players**.

## Records

Records stay in the current browser; there is no shared database. New browsers start with an empty roster and match history. **Start fresh** clears records after confirmation. Export a backup before clearing browser storage or replacing records.

Imports validate records. Corrections keep an edit trail. Player and hero ratings carry across patches.

- [Empty starting records](public/projects/locknight/initial-records.json)
- [JSON format reference](docs/json-format.md)
- [Records schema](public/projects/locknight/schema-v1.json)
- [Player schema](public/projects/locknight/player-schema-v1.json)

Synthetic records are kept in `tests/fixtures/`, outside the app bundle. Keep real backups in the ignored `records/` or `private/` folders.

## Configuration

| File | Settings |
| --- | --- |
| [draft.json](src/config/draft.json) | Modes, balance settings, hero choice count, priority labels. |
| [heroes.json](src/config/heroes.json) | Stable hero IDs and names. |
| [hero-random.json](src/config/hero-random.json) | Preference weights, duplicate heroes, default random bans, temporary Rat King roll. |
| [hero-particles.json](src/config/hero-particles.json) | Case reveal colors, shapes, motion, size, distance, spin, and duration for each hero. |
| [ratings.json](src/config/ratings.json) | Rating defaults for new records. |
| [tooltips.json](src/config/tooltips.json) | Hover and keyboard explanations. |
| [motion.json](src/config/motion.json) | Placement and hero effects. |
| [patch-catalog.json](public/projects/locknight/patch-catalog.json) | Patch titles, UTC times, and BuildIDs. |

Keep hero IDs stable. After editing the catalog, run `node scripts/schema.mjs`. After changing rating defaults or patches, run `npm run prepare:empty`. Existing records keep their own rating settings. The patch catalog is a saved snapshot; use `npm run sync:patches` to update it. Only titled patches are listed. New matches automatically use the latest titled patch; there is no draft patch selector.

Use the website's layout and design tokens, direct labels, optional tooltips, and motion that respects reduced-motion settings.

**Allow duplicate heroes** permits shared heroes; each player's options stay distinct. The **Random ban list** excludes heroes from normal rolls, with Rat King excluded by default. Manual selections remain available. **Random for Rat King** rolls one standalone hero with Rat King included and does not assign it to a player.

`preferenceWeights` sets relative draw weights by preference value. Neutral is `1`; Avoid is `9/49` (about `0.184`), Comfortable is `1.125`, Preferred is `1.15`, and Favorite is `1.175`. With one rated hero and nine neutral heroes, the first draw gives Avoid a 1-in-50 chance and Comfortable a 1-in-9 chance. Each option is drawn without replacement, so later odds depend on remaining heroes and reservations. Players are shuffled before heroes are reserved. Set every weight to `1` for unweighted draws. The standalone case roll has no player preferences.

Baba, Deadman Danny, Nurse Harrow, Solomon, and Violet have inactive catalog entries. Set `active` to `true` when you want to include them. Fetch wiki portraits with `npm run sync:portraits`, or use `node scripts/sync-wiki-portraits.mjs --html path/to/saved-heroes-page.html`. Existing portraits are preserved on failure; cards try wiki file links when local portraits are missing, then show initials if no image loads.

## Commands

```sh
npm run build
npm test
npm run test:browser
npm run report -- records/locknight.json
npm run sync:patches
npm run prepare:empty
```

Browser checks require Chrome. Set `CHROME_PATH` for another Chromium installation. Results go in `artifacts/`. On Windows, use `npm.cmd` if PowerShell blocks `npm`.

## Website updates

The website uses this repository as the `tools/locknight` submodule and deploys at `/projects/locknight/`.

Pushes to `main` request a website build and update one **Update Locknight** PR on `automation/locknight`. Merge it to publish. A scheduled check runs about every 15 minutes. Start a sync manually under **Actions > Sync Locknight > Run workflow**.

To install the website workflow, run this from the website directory and commit the resulting file:

```sh
node ../locknight/scripts/install-website-automation.mjs .
```

Merge the workflow into the website's `main`. In its **Settings > Actions > General**, allow GitHub Actions to create pull requests. For immediate notifications, save `WEBSITE_SYNC_TOKEN` in Locknight's Actions secrets: a fine-grained token restricted to `Baegll.github.io`, with **Actions: Read and write**. Without it, the scheduled check handles updates.

For manual integration, update the submodule and run `node tools/locknight/scripts/integrate.mjs .` from the website directory.

OpenSkill attribution and its MIT license are retained in [src/vendor/openskill/LICENSE](src/vendor/openskill/LICENSE).
