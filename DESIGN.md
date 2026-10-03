# Deadlock Inhouse Helper — Design Brief

## Goal

Help a regular group assemble fair 6v6 Deadlock matches, record each game's players, teams, heroes, and result, then learn from those results. Keep source data portable as versioned JSON so ratings and reports can be rebuilt when the rules or analysis change.

## System and data

The tool is an Astro front end that can be hosted under `Baegll.github.io/projects/` and used locally. It has no shared server-side database: import the group's JSON file, work with it in the browser, then download the updated file. The browser can perform drafting and rating updates; a local script can also process or report on the same data. A demo mode can use bundled sample data without exposing real player data.

Store a versioned JSON document (or a JSON manifest plus `matches.jsonl`) with three kinds of records:

- **Players:** stable ID, display name, enabled state, and optional notes.
- **Hero preferences:** per-player, per-hero integer value limited to `-1`, `0`, `1`, `2`, or `3`. Store values now. Using them to bias random hero assignment or presenting them as captain guidance is out of scope for this version.
- **Patches:** stable patch ID, display label, effective time, SteamDB source link, and the time patch info was last refreshed. SteamDB timestamps are UTC.
- **Matches:** stable ID, timestamp, patch ID, two teams of six player IDs, each player's hero, winning team, draft mode and settings, and the rating snapshot used when the draft was made.
- **Rating metadata and history:** OpenSkill model and parameters, schema version, and calculation version. Carry each player's overall and player/hero rating state forward at patch boundaries, then update it from matches in the new patch. Record derived rating snapshots by player, hero where applicable, match/time, and patch, including OpenSkill uncertainty fields. These snapshots provide a graph-ready rating timeline across patches. Ratings can be rebuilt from match history; snapshots are derived data, not the historical source of truth.

Imports validate schema and IDs before replacing current working data. Invalid files leave current data intact. Exports include all source records. Hero IDs should come from a maintained catalog so name changes do not split statistics.

## Feature set 1: Draft and match UI

- Manage roster: add players, enable/disable them for drafting, and edit each player's per-hero preference integer.
- Draft 12 enabled players in three modes: captains (captains chosen manually or randomly by button, with a pick-order selector for `Simple Draft`, `One Ban Draft`, and `Two Ban Draft`), random (shuffle players onto teams with fresh randomness per click and a light preference for smaller OpenSkill rating differences), and manual team assignment. Show overall-rating-based team estimates and disclose that they are estimates.
- Assign one hero to each drafted player, then record the winning team. Allow correction of a result and rebuild derived ratings.
- Associate every match with a patch. Refresh the patch catalog from the [SteamDB Deadlock patch notes](https://steamdb.info/app/1422450/patchnotes/), show the current patch as the default for new matches, and allow historical patch selection. If refresh fails, keep existing patch data and allow manual selection/addition.
- Upload/download versioned JSON. Import replaces the current working data after validation and a clear confirmation.
- Use Astro and AstroAnimate for pick transitions and roster feedback, respecting reduced-motion settings. The tool can later be integrated during the site's planned Astro migration.

## Feature set 2: Local stats and rating service

- Use the same JSON source of truth in the browser and from a local script. Validate matches and produce match history, draft suggestions, and reports.
- Report ratings and results by patch while retaining the continuous rating timeline across patch boundaries. Record dated rating snapshots so future graphs can show overall and per-hero rating changes over time. Refresh patch metadata through a small local sync script or service; do not make match entry depend on SteamDB being available.
- Update overall player OpenSkill ratings from every 6v6 result, plus a parallel player/hero rating for each hero used in that result. Both use team win/loss only; neither claims to measure individual contribution. Record the model and parameters.
- Report overall player rating and win rate; player/hero rating and record; teammate-pair records; and draft value (predicted team win probability at draft time compared with actual outcomes). Show sample counts and rating uncertainty so sparse hero and pairing history is visible.
- Recalculate reports from match history after imports, edits, or model changes. Apply matches in a deterministic order. Keep win/loss outcomes separate from any future per-player stats such as kills or objective score.

## First delivery

1. Settle match size and exact captain pick/ban sequences.
2. Freeze the JSON schema and ship roster, draft, hero assignment, result entry, and import/export.
3. Add OpenSkill recalculation and reports from recorded results.
4. Add sample/demo mode and presentation controls if they are still useful after the local flow works.

## Decisions to settle (only when they come up)

1. Are matches always 6v6? How should substitutes, fewer-player games, remakes, or abandoned games be recorded?
2. What exact action sequence should `Simple Draft`, `One Ban Draft`, and `Two Ban Draft` use? Who bans, how many heroes or players are removed per ban, and who gets first pick?
3. For simple draft, should captains alternate picks, use snake order, or follow another sequence? Do captains count as already assigned, or do they draft themselves?
4. How strong should the rating-balance preference be in random team assignment? A small tunable bias can keep outcomes varied while nudging expected team ratings closer.
5. Should a corrected match overwrite its prior result, or retain an edit history?
6. For draft value, is a team's predicted win probability at draft time the intended measure? It can compare rating-based expectation with results, though it cannot establish that captain choices caused the outcome.
7. Should every SteamDB patch-note entry, including hotfixes, start a new reporting segment, or should related updates be grouped into a broader balance patch? Ratings carry forward either way.
