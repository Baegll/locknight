import { writeFile } from 'node:fs/promises';
import { heroes } from '../src/lib/catalog.mjs';
import { rating, probability, rateTeams } from '../src/lib/skill.mjs';
import { validateData } from '../src/lib/data.mjs';

let seed = 0x10c4a17;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
const shuffle = (items) => { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; };
const heroIds = heroes.map(hero => hero.id);
const names = ['Avery','Blake','Casey','Devon','Ellis','Finley','Gray','Harper','Indigo','Jules','Kai','Lane','Morgan','Noel','Parker','Quinn','Riley','Sage'];
const players = names.map((name, i) => {
  const preferences = {};
  for (const heroId of heroIds) {
    const roll = random();
    preferences[heroId] = roll < 0.06 ? -1 : roll < 0.14 ? 3 : roll < 0.25 ? 2 : roll < 0.39 ? 1 : 0;
  }
  return { id: `demo-player-${String(i + 1).padStart(2, '0')}`, name, enabled: i !== 17, ...(i === 17 ? { notes: 'Synthetic demo reserve; disabled for drafting.' } : {}), preferences };
});
const patchDates = ['2025-01-06T00:00:00.000Z', '2025-02-03T00:00:00.000Z', '2025-03-03T00:00:00.000Z'];
const patches = patchDates.map((date, i) => ({ id: 'demo-patch-0' + (i+1), label: 'Synthetic demo patch ' + String.fromCharCode(65+i), effectiveAt: date, sourceUrl: 'https://steamdb.info/app/1422450/patchnotes/', refreshedAt: date }));
const skill = players.map(() => random() * 2 - 1);
const parameters = { mu: 25, sigma: 25/3, beta: 25/6, tau: 25/300 };
const currentRatings = Object.fromEntries(players.map(player => [player.id, rating(parameters)]));
const matches = [];
for (let i = 0; i < 48; i++) {
  const patchIndex = Math.floor(i / 16), selected = shuffle(players.slice(0, 17)).slice(0, 12);
  const amberPlayers = selected.slice(0, 6), sapphirePlayers = selected.slice(6);
  const teams = { amber: amberPlayers.map(player => player.id), sapphire: sapphirePlayers.map(player => player.id) };
  const assignedHeroes = shuffle(heroIds).slice(0, 12);
  const heroMap = Object.fromEntries(selected.map((player, j) => [player.id, assignedHeroes[j]]));
  const trueAmber = amberPlayers.reduce((sum, player) => sum + skill[players.indexOf(player)], 0);
  const trueSapphire = sapphirePlayers.reduce((sum, player) => sum + skill[players.indexOf(player)], 0);
  const winner = random() < 1 / (1 + Math.exp(-(trueAmber - trueSapphire) * 0.48)) ? 'amber' : 'sapphire';
  const ratings = Object.fromEntries(selected.map(player => [player.id, { ...currentRatings[player.id] }]));
  const teamRatings = [teams.amber, teams.sapphire].map(team => team.map(id => currentRatings[id]));
  const amberProbability = probability(teamRatings, parameters);
  const timestamp = new Date(Date.UTC(2025, patchIndex, 7 + i % 16, 18 + i % 4, i * 13 % 60)).toISOString();
  matches.push({
    id: `demo-match-${String(i+1).padStart(3,'0')}`,
    timestamp,
    patchId: patches[patchIndex].id,
    teams,
    heroes: heroMap,
    winner,
    draft: { mode: ['random','manual','captains'][i%3], settings: {}, snapshot: { amberProbability: Number(amberProbability.toFixed(6)), ratings } },
    edits: [],
  });
  const result = rateTeams(teamRatings, winner === 'amber' ? 0 : 1, parameters);
  teams.amber.forEach((id, j) => { currentRatings[id] = result[0][j]; });
  teams.sapphire.forEach((id, j) => { currentRatings[id] = result[1][j]; });
}
const document = { schemaVersion: 1, calculationVersion: 1, players, patches, matches, ratingMetadata: { model: 'PlackettLuce', parameters, calculationVersion: 1 } };
const validated = validateData(document);
await writeFile(new URL('../tests/fixtures/demo-source.json', import.meta.url), `${JSON.stringify(validated, null, 2)}\n`);
