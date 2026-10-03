import { allHeroes as heroes } from './catalog.mjs';
import { parameters, rating, rateTeams, ordinal, probability } from './skill.mjs';
export const teamIds=['amber','sapphire'];
export const patchSource='https://steamdb.info/app/1422450/patchnotes/';
const assert=(v,message)=>{if(!v)throw new Error(message);};
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const str=v=>typeof v==='string'&&v.trim().length>0&&v.length<=500;
const date=v=>typeof v==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function unique(rows,label){const ids=new Set();for(const row of rows){assert(object(row)&&id(row.id),`${label}: invalid ID`);assert(!ids.has(row.id),`${label}: duplicate ID ${row.id}`);ids.add(row.id);}return ids;}
export function emptyData(){return {schemaVersion:1,calculationVersion:1,players:[],patches:[],matches:[],ratingMetadata:{model:'PlackettLuce',parameters:{...parameters},calculationVersion:1}};}
export function validateData(input){
  assert(object(input)&&input.schemaVersion===1&&input.calculationVersion===1,'Unsupported schema or calculation version');
  const d=structuredClone(input);
  for(const key of ['players','patches','matches'])assert(Array.isArray(d[key])&&d[key].length<=100000,`${key} must be an array (maximum 100,000 records)`);
  const ps=unique(d.players,'Players'), patches=unique(d.patches,'Patches');unique(d.matches,'Matches');
  const hs=new Set(heroes.map(h=>h.id));
  assert(object(d.ratingMetadata)&&d.ratingMetadata.model==='PlackettLuce'&&d.ratingMetadata.calculationVersion===1,'Unsupported rating model');
  const params=d.ratingMetadata.parameters;
  assert(object(params),'Missing rating parameters');
  for(const key of Object.keys(parameters))assert(finite(params[key])&&params[key]>=0&&params[key]<=1000&&(key==='tau'||params[key]>0),`Invalid rating parameter ${key}`);
  for(const p of d.players){assert(str(p.name)&&typeof p.enabled==='boolean','Invalid player name or enabled state');assert(p.notes===undefined||typeof p.notes==='string','Invalid player notes');assert(object(p.preferences),'Missing hero preferences');for(const [h,v] of Object.entries(p.preferences))assert(hs.has(h)&&Number.isInteger(v)&&v>=-1&&v<=3,`Invalid hero preference for ${p.name}`);}
  for(const p of d.patches){assert(str(p.label)&&date(p.effectiveAt)&&date(p.refreshedAt),'Invalid patch label or UTC timestamp');assert(p.sourceUrl===patchSource||/^https:\/\/steamdb\.info\/patchnotes\/\d+\/?$/.test(p.sourceUrl),'Patch source must be SteamDB');}
  for(const m of d.matches){
    assert(date(m.timestamp)&&patches.has(m.patchId),'Invalid match date or patch ID');
    assert(object(m.teams)&&object(m.heroes),'Missing match teams or heroes');
    const all=teamIds.flatMap(t=>{assert(Array.isArray(m.teams[t])&&m.teams[t].length===6,'Matches must be 6v6');return m.teams[t];});
    assert(new Set(all).size===12&&all.every(p=>ps.has(p)),'Unknown or duplicate match player');
    const duplicates=m.draft?.settings?.allowDuplicateHeroes===true;
    assert(Object.keys(m.heroes).length===12&&all.every(p=>hs.has(m.heroes[p]))&&(duplicates||new Set(all.map(p=>m.heroes[p])).size===12),'Each player needs a catalog hero; duplicates require duplicate-hero mode');
    assert(teamIds.includes(m.winner),'Invalid winner');
    assert(object(m.draft)&&['captains','random','manual'].includes(m.draft.mode)&&object(m.draft.settings),'Invalid draft mode or settings');
    if(m.draft.settings.allowDuplicateHeroes!==undefined)assert(typeof m.draft.settings.allowDuplicateHeroes==='boolean','Invalid duplicate-hero setting');
    if(m.draft.settings.excludedHeroes!==undefined){const excluded=m.draft.settings.excludedHeroes;assert(Array.isArray(excluded)&&new Set(excluded).size===excluded.length&&excluded.every(h=>hs.has(h)),'Invalid random exclusion list');}
    const s=m.draft.snapshot;assert(object(s)&&finite(s.amberProbability)&&s.amberProbability>=0&&s.amberProbability<=1&&object(s.ratings),'Invalid draft rating snapshot');
    assert(Object.keys(s.ratings).length===12&&all.every(pid=>object(s.ratings[pid])),'Snapshot must include all 12 match players');
    for(const r of Object.values(s.ratings))assert(object(r)&&finite(r.mu)&&finite(r.sigma)&&r.sigma>0,'Invalid snapshot rating');
    if(m.draft.settings.bannedHeroes!==undefined){assert(Array.isArray(m.draft.settings.bannedHeroes)&&m.draft.settings.bannedHeroes.every(h=>hs.has(h)),'Invalid banned heroes');assert(all.every(pid=>!m.draft.settings.bannedHeroes.includes(m.heroes[pid])),'Match assigns a banned hero');}
    if(m.draft.settings.readyPlayers!==undefined){const ready=m.draft.settings.readyPlayers;assert(Array.isArray(ready)&&new Set(ready).size===ready.length&&ready.every(pid=>ps.has(pid))&&all.every(pid=>ready.includes(pid)),'Invalid ready player pool');}
    if(m.draft.settings.heroOptions!==undefined){const options=m.draft.settings.heroOptions;assert(object(options),'Invalid hero options');const seen=new Set();for(const [pid,values] of Object.entries(options)){assert(all.includes(pid)&&Array.isArray(values)&&values.length>0&&new Set(values).size===values.length&&values.every(h=>hs.has(h)&&(duplicates||!seen.has(h))&&!m.draft.settings.bannedHeroes?.includes(h)),'Invalid or repeated hero option');for(const h of values){assert(duplicates||!seen.has(h),'Repeated hero option');seen.add(h);}}}
    assert(Array.isArray(m.edits)&&m.edits.every(e=>object(e)&&date(e.at)&&teamIds.includes(e.previousWinner)&&teamIds.includes(e.winner)),'Invalid result edit history');
  }
  // Derived records are always rebuilt from source matches.
  delete d.ratingHistory;
  return d;
}
export function rebuild(d){
  const params=d.ratingMetadata.parameters;
  const overall=Object.fromEntries(d.players.map(p=>[p.id,rating(params)])), heroRatings={},history=[];
  const stats=Object.fromEntries(d.players.map(p=>[p.id,{games:0,wins:0}])),heroStats={},pairs={},predictions=[];
  const matches=[...d.matches].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)||a.id.localeCompare(b.id,'en'));
  for(const m of matches){
    const winner=teamIds.indexOf(m.winner);
    const before=teamIds.map(t=>m.teams[t].map(pid=>overall[pid]));
    const predicted=probability(before,params);
    const next=rateTeams(before,winner,params);
    const hkeys=teamIds.map(t=>m.teams[t].map(pid=>`${pid}/${m.heroes[pid]}`));
    const hnext=rateTeams(hkeys.map(keys=>keys.map(k=>heroRatings[k]??rating(params))),winner,params);
    predictions.push({matchId:m.id,patchId:m.patchId,predicted:m.draft.snapshot.amberProbability,recalculated:predicted,actual:winner===0?1:0});
    teamIds.forEach((t,i)=>m.teams[t].forEach((pid,j)=>{
      overall[pid]=next[i][j];heroRatings[hkeys[i][j]]=hnext[i][j];
      stats[pid].games++;stats[pid].wins+=i===winner?1:0;
      const h=heroStats[hkeys[i][j]]??={games:0,wins:0};h.games++;h.wins+=i===winner?1:0;
      history.push({playerId:pid,heroId:null,matchId:m.id,timestamp:m.timestamp,patchId:m.patchId,...overall[pid]},{playerId:pid,heroId:m.heroes[pid],matchId:m.id,timestamp:m.timestamp,patchId:m.patchId,...hnext[i][j]});
      for(const other of m.teams[t].slice(j+1)){const k=[pid,other].sort().join('/');const pair=pairs[k]??={players:[pid,other],games:0,wins:0};pair.games++;pair.wins+=i===winner?1:0;}
    }));
  }
  return {overall,heroRatings,history,stats,heroStats,pairs,predictions};
}
export function report(d,patchId='all'){
  const derived=rebuild(d),filtered=patchId==='all'?d.matches:d.matches.filter(m=>m.patchId===patchId);
  const segment=rebuild({...d,matches:filtered});
  // Replay up to the selected patch's end, including prior patches. A player
  // who sat out retains their prior rating; future outcomes cannot leak in.
  const patch=d.patches.find(p=>p.id===patchId);
  const cutoff=filtered.length?Math.max(...filtered.map(m=>Date.parse(m.timestamp))):Date.parse(patch?.effectiveAt??'');
  const continuous=patchId==='all'?derived:rebuild({...d,matches:d.matches.filter(m=>Date.parse(m.timestamp)<=cutoff)});
  const players=d.players.map(p=>({...p,rating:continuous.overall[p.id],...segment.stats[p.id]})).sort((a,b)=>ordinal(b.rating)-ordinal(a.rating));
  return {...derived,overall:continuous.overall,heroRatings:continuous.heroRatings,players,pairs:segment.pairs,heroStats:segment.heroStats,predictions:derived.predictions.filter(x=>patchId==='all'||x.patchId===patchId),matchCount:filtered.length};
}
export function correctWinner(d,matchId,winner){assert(teamIds.includes(winner),'Invalid winner');const m=d.matches.find(m=>m.id===matchId);assert(m,'Match not found');if(m.winner!==winner){m.edits.push({at:new Date().toISOString(),previousWinner:m.winner,winner});m.winner=winner;}return rebuild(d);}
export function exportData(d){return {...d,ratingHistory:rebuild(d).history};}
export function isTitledPatch(p){const title=String(p.title??p.label??'').trim();return Boolean(title)&&!/^(?:no\s+title|untitled)\b/i.test(title)&&!/^\d+$/.test(title);}
export function titledPatches(d){return d.patches.filter(isTitledPatch).sort((a,b)=>Date.parse(b.effectiveAt)-Date.parse(a.effectiveAt));}
export function latestPatch(d,now=Date.now()){return titledPatches(d).find(p=>Date.parse(p.effectiveAt)<=now);}
