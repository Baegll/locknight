# Locknight UI and copy

Locknight is a project on Natalie's portfolio. Its route uses `Portfolio.astro`, including the site navigation, top strip, footer, fonts, and theme setting. Source tokens are in `public/design-tokens.json`; `theme.js` exposes them as `--t-*` variables. App styles are scoped to `.locknight`.

## Visual rules

- Use Archivo for headings, Space Grotesk for body text, and IBM Plex Mono for compact metadata. Use the site's heading weights and spacing.
- Use the site's surface, text, border, and pink CTA tokens in both themes. Error colors may differ to communicate a validation failure.
- Use the portfolio's editorial structure: headings, whitespace, and separators. Add a panel boundary only when it clarifies a group of controls.
- Use tabs within the project, keeping the site's navigation visible. Keep team names explicit so color is not required to distinguish them.
- Use tabular digits for ratings, probabilities, and counts. Balance heading lines and use pretty paragraph wrapping.
- Inputs and buttons use the site's 6px radius. A confirmation dialog has enough padding that its controls do not sit against its rounded edges.
- Use short, interruptible transitions for control feedback and the estimate bar. Do not animate headings on section changes or every player row on an edit. Respect reduced motion.
- Animate the slot that receives a player or hero. Cancel its previous effect before starting another. Keep timings and hero effects in `src/config/motion.json`.
- Align the bottom edges of adjacent buttons and select fields. Use a shared control height and keep labels above fields.
- Use the available browser width for Locknight. Keep modest outer gutters, a flexible pool column, and wider gaps on desktop. Preserve the compact mobile layout.

## Copy rules

- Name the action or information: Draft teams, Record result, Players, Matches, Stats, Export JSON.
- Put optional explanations in `src/config/tooltips.json`. Show them on hover and keyboard focus. Give errors a cause and an available next step.
- Use short sentences and consistent terms. Use records for stored data, matches for games, and players for the roster.
- Avoid slogans, rhetorical questions, motivational promises, invented product vocabulary, and decorative status labels.
- Put model explanations in the rating tooltips. Keep implementation commands and developer details in the README.
- Keep the demo label visible while sample records are loaded. Show win estimates only when both teams have been assigned.

These rules apply the relevant recommendations from Jakub Krehel's [Details that make interfaces feel better](https://jakub.kr/writing/details-that-make-interfaces-feel-better) and [Less is more, more or less](https://jakub.kr/writing/less-is-more): careful text wrapping, stable numbers, consistent controls, and motion or decoration that serves an interaction.

The existing portfolio is the reference for branding and tone. Its tokens take precedence over introducing a separate Locknight visual identity.
