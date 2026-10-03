# Locknight JSON format

## Purpose

Use this document to check a Locknight JSON file.
The procedures use short sentences and one action per step.
The writing reference is [ASD-STE100, Issue 9](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf).
Field names and software terms are technical names in this document.

## Terms

| Term | Meaning |
| --- | --- |
| JSON | A text format that contains named fields and values. |
| Object | A group of named fields inside `{}`. |
| Array | A list of values inside `[]`. |
| ID | A permanent identifier for one record. |
| UTC | The time reference for all stored dates. |
| Hero catalog | The list of permitted hero IDs in `src/config/heroes.json`. |
| `mu` | The estimated skill value. |
| `sigma` | The uncertainty in the skill value. |
| Snapshot | Rating values saved at the time of a draft. |

## File types

Locknight uses two file types.

- A records file contains the roster, patches, matches, and rating settings.
- A player file contains one player's name, hero preferences, and notes.

Import a records file under **Data & patches**.
Import a player file under **Players**.
A player import does not replace match records.

## Check a file

1. Export a backup of the current records.
2. Open the file in a text editor.
3. Check the file type.
4. Check each ID.
5. Check each date.
6. Check the hero IDs against the hero catalog.
7. Check the values against the tables below.
8. Import the file in Locknight.
9. Read the validation message.
10. If the file is valid, confirm the import.

Use double quotes around field names and text values.
Do not put a comma after the last item.
Do not put comments in JSON.
Use `true` and `false` without quotes.
Use numbers without quotes.

## IDs and dates

An ID has 1 to 100 characters.
Permitted characters are letters, digits, underscores, and hyphens.
Do not use `__proto__`, `constructor`, or `prototype` as an ID.
Each record must have a unique ID within its record type.
Keep the player ID when you change the player's name.

Use a date with a time and a timezone.
Example: `2026-10-03T00:51:00.000Z`.
The final `Z` means UTC.
The manual patch form converts its input to UTC.

## Records file

An empty records file has this form:

```json
{
  "schemaVersion": 1,
  "calculationVersion": 1,
  "players": [],
  "patches": [],
  "matches": [],
  "ratingMetadata": {
    "model": "PlackettLuce",
    "calculationVersion": 1,
    "parameters": {
      "mu": 25,
      "sigma": 8.333333333333334,
      "beta": 4.166666666666667,
      "tau": 0.08333333333333333
    }
  }
}
```

| Field | Check |
| --- | --- |
| `schemaVersion` | Must be `1`. |
| `calculationVersion` | Must be `1`. |
| `players` | An array of player records. |
| `patches` | An array of patch records. |
| `matches` | An array of match records. |
| `ratingMetadata` | Must contain the model, version, and four parameters. |
| `ratingHistory` | Optional calculated records. The app replaces these records during import. |

### Player record

```json
{
  "id": "player-ivy-main",
  "name": "Ivy Main",
  "enabled": true,
  "preferences": {"ivy": 3, "abrams": -1},
  "notes": "Available after 20:00."
}
```

| Field | Check |
| --- | --- |
| `id` | A permanent player ID. |
| `name` | Nonempty text. The UI permits 80 characters. Import permits 500 characters. |
| `enabled` | A Boolean field retained for records-file compatibility. |
| `preferences` | An object with hero IDs as field names. |
| `notes` | Optional text. |

The UI uses Ready, Sit out, and Away instead of an enabled switch.
Old records with `enabled: false` start as Away.
The leader can change that status to Ready.
The status does not delete the player or match history.
Sit out returns to Ready after one recorded match without that player.
Away remains Away.
Pool edits do not remove players from an existing draft.
Assigned players remain in the current match.
Their availability changes apply to later drafts.

| Preference | Meaning |
| --- | --- |
| `-1` | Avoid |
| `0` | Neutral |
| `1` | Comfortable |
| `2` | Preferred |
| `3` | Favorite |

A missing hero preference means `0`.
Preferences do not change random hero draws.

### Patch record

```json
{
  "id": "steamdb-25689475",
  "buildId": "25689475",
  "title": "No title",
  "label": "No title · 25689475",
  "effectiveAt": "2026-10-03T00:51:00.000Z",
  "sourceUrl": "https://steamdb.info/patchnotes/25689475/",
  "refreshedAt": "2026-10-03T14:00:00.000Z"
}
```

| Field | Check |
| --- | --- |
| `id` | A unique patch ID. |
| `label` | Nonempty text shown in the patch selector. |
| `effectiveAt` | The time when the patch became effective. |
| `sourceUrl` | A SteamDB patch URL or the Deadlock patch-list URL. |
| `refreshedAt` | The time when the catalog obtained the record. |
| `buildId` | Optional SteamDB BuildID. Store it as text. |
| `title` | Optional original patch title. |

The app selects the latest patch whose effective time is not in the future.
The app keeps named patch titles.
For an untitled build, the label includes `No title` and its BuildID.
Synthetic demo patches have synthetic labels.

### Match record

| Field | Check |
| --- | --- |
| `id` | A unique match ID. |
| `timestamp` | A date with a timezone. |
| `patchId` | Must identify a patch in `patches`. |
| `teams.amber` | Exactly six player IDs. |
| `teams.sapphire` | Exactly six other player IDs. |
| `heroes` | Exactly 12 fields. Each field name is a match player ID. Each value is a hero ID. |
| `winner` | Must be `amber` or `sapphire`. |
| `draft.mode` | Must be `random`, `captains`, or `manual`. |
| `draft.settings` | An object with the draft settings. |
| `draft.snapshot.amberProbability` | A number from `0` to `1`. |
| `draft.snapshot.ratings` | Exactly 12 player rating objects. Each object contains `mu` and `sigma`. |
| `edits` | An array. Use `[]` when the result has no corrections. |

All 12 player IDs must exist in the roster.
A player cannot occur in both teams.
All 12 heroes must be different.
A match cannot contain a banned hero.
Each snapshot must have a positive `sigma`.
Balanced random uses `draft.mode: "random"` and `draft.settings.strategy: "balanced"`.
Unbalanced random uses `draft.settings.strategy: "random"` and `draft.settings.bias: 0`.
The ready pool can contain more than 12 players.
Only the 12 drafted players occur in the match teams.

The settings can contain `bias`, `format`, `firstBan`, `strategy`, `bannedHeroes`, and `captains`.
The settings can also contain `heroOptions` and `readyPlayers` for draft review.
These settings do not replace the final `heroes` record.

A correction has this form:

```json
{"at": "2026-10-03T22:00:00Z", "previousWinner": "amber", "winner": "sapphire"}
```

Keep previous corrections in the `edits` array.
The original draft snapshot does not change after a correction.

### Rating metadata and history

The model must be `PlackettLuce`.
The metadata calculation version must be `1`.
`mu`, `sigma`, and `beta` must be greater than zero.
`tau` must be zero or greater.
Each parameter must be 1000 or less.

The app calculates ratings from match results.
It applies matches in date order, then ID order.
Ratings continue across patch boundaries.
Each history record contains a player ID, match ID, patch ID, date, `mu`, and `sigma`.
An overall history record has `heroId: null`.
A hero history record has a hero ID.
Do not edit `ratingHistory` to change a result.
Change the match winner instead.

## Player preference file

```json
{
  "type": "locknight-player",
  "schemaVersion": 1,
  "player": {
    "id": "player-ivy-main",
    "name": "Ivy Main",
    "preferences": {"ivy": 3, "abrams": -1},
    "notes": "Available after 20:00."
  }
}
```

The `type` must be `locknight-player`.
The schema version must be `1`.
The name must contain 1 to 80 characters.
Notes can contain up to 2000 characters.
The preference values must be integers from `-1` to `3`.

### Send preferences

1. Open the player preference page.
2. Enter your name.
3. Set your hero preferences.
4. Select **Download JSON**.
5. Send the file to the lobby leader.

### Import preferences

1. Open **Players**.
2. Select **Import player**.
3. Select the player file.
4. Select an existing player or **Add new player**.
5. Select **Apply preferences**.

An existing player's ID does not change.
The import replaces that player's name, preferences, and notes.
The import does not change existing matches or rating settings.

## Common problems

| Message or symptom | Check |
| --- | --- |
| Unsupported version | Check both version fields. |
| Duplicate ID | Check records for repeated IDs. |
| Unknown player | Compare each team ID with the roster IDs. |
| Invalid hero preference | Check the hero ID and integer value. |
| Invalid patch date | Check the time and timezone. |
| Matches must be 6v6 | Count the IDs in each team. |
| Snapshot must include all 12 players | Compare the snapshot field names with the team IDs. |
| Match assigns a banned hero | Compare `heroes` with `bannedHeroes`. |
| Player import rejected | Check `type`, `schemaVersion`, and `player`. |

The runtime validator also checks IDs and record references.
The JSON schema alone cannot check all record references.
The records schema is `public/projects/locknight/schema-v1.json`.
The complete sample records are in `tests/fixtures/demo-source.json`.
The single-match sample is [tests/fixtures/example-records.json](tests/fixtures/example-records.json).
Both sample files contain synthetic data.

## Local browser state

The browser stores attendance and the statistics switch beside the records file.
The key is `locknight-v1`.
The player preference page uses the separate key `locknight-profile-v1`.
Records exports do not contain attendance or the statistics switch.
Unrecorded drafts and hero options are temporary.
