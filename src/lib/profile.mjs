import {allHeroes as heroes} from './catalog.mjs';
const safeId = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v) && !['__proto__','constructor','prototype'].includes(v);
export function validateProfile(input) {
  if (!input || input.type !== 'locknight-player' || input.schemaVersion !== 1) throw Error('Use a Locknight player preference file.');
  const p = input.player;
  if (!p || !safeId(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80) throw Error('Player ID or name is invalid.');
  if (!p.preferences || typeof p.preferences !== 'object' || Array.isArray(p.preferences)) throw Error('Hero preferences must be an object.');
  for (const [id, value] of Object.entries(p.preferences)) {
    if (!heroes.some(h => h.id === id) || !Number.isInteger(value) || value < -1 || value > 3) throw Error(`Invalid preference: ${id}`);
  }
  if (p.notes !== undefined && (typeof p.notes !== 'string' || p.notes.length > 2000)) throw Error('Notes must contain at most 2000 characters.');
  return {type: 'locknight-player', schemaVersion: 1, player: {id: p.id, name: p.name.trim(), preferences: {...p.preferences}, notes: p.notes ?? ''}};
}
export function playerProfile(player) { return validateProfile({type:'locknight-player',schemaVersion:1,player}); }
export function playerProfileFilename(player) {
 const name=player.name.normalize('NFKC').trim().replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'Player';
 return `locknight-player-${name}.json`;
}
export function mergeProfile(data, profile, targetId = '') {
  const {player: incoming} = validateProfile(profile);
  const next = structuredClone(data);
  const existing = next.players.find(p => p.id === (targetId || incoming.id));
  if (targetId && !existing) throw Error('Select an existing player.');
  if (existing) { existing.name = incoming.name; existing.preferences = {...incoming.preferences}; existing.notes = incoming.notes; }
  else next.players.push({...incoming, enabled:true});
  return next;
}
