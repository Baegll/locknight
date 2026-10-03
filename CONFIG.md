# Quick configuration

Edit these files, then rebuild the site. Astro reloads them during local development.

| File | Contents |
| --- | --- |
| [tooltips.json](src/config/tooltips.json) | Hover and keyboard-focus explanations. Keys map to `data-tooltip` attributes. |
| [draft.json](src/config/draft.json) | Mode labels, default mode, balance preference, attempt limit, hero choice count, preference labels. |
| [heroes.json](src/config/heroes.json) | Stable hero IDs and display names. Hero sync writes here. |
| [ratings.json](src/config/ratings.json) | OpenSkill priors and parameters for new records. Existing records retain their own metadata. |
| [motion.json](src/config/motion.json) | Placement timing, hero timing, stagger, and effect per hero. |
| [initial-records.json](public/projects/locknight/initial-records.json) | Empty starting records, patch list, and rating metadata. Existing saved records are preserved. Regenerate with `node scripts/prepare-empty.mjs` after changing rating defaults or the patch catalog. |
| [patch-catalog.json](public/projects/locknight/patch-catalog.json) | Patch titles, UTC times, and BuildIDs. Fresh records start with this catalog. |

Games remain 6v6. Changing the match size requires a schema change.
Keep hero IDs stable. Change only their display names when a hero is renamed.
Run `node scripts/schema.mjs` after adding heroes.
Changing rating defaults does not modify imported records or historical draft snapshots.

The hero catalog contains all 39 names in the release table supplied on 2026-10-03.
Existing IDs remain unchanged. The table's numeric IDs and update labels were not imported.
The added heroes are Rem, Graves, Silver, Venator, Celeste, Apollo, and Rat King.
The live Deadlock API could not be read during this update; the supplied table is the catalog snapshot source.

Hero options reserve distinct heroes across all players. The default needs 24 available heroes for 12 players.
Changing `heroChoices` increases the catalog size required after bans.

Placement uses a brief drop and impact. Hero choices use the effect mapped to that hero.
Supported effects: `impact`, `slam`, `flame`, `frost`, `spark`, `fade`, `orbit`, `leaf`, `spirit`, `rewind`, `ooze`, `slash`, `rise`, `portal`, `gear`, `pulse`.
All effects stop under reduced motion. Ordinary edits do not replay unrelated slots.

The checked-in patch catalog comes from the table supplied on 2026-10-03.
Its provenance field records that origin. It is not a live-fetch claim.
Demo patches remain synthetic. Use **Refresh catalog** to load the supplied builds into existing records.
SteamDB sync updates the catalog when network access is available.
