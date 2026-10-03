import { probability, rating } from './skill.mjs';
import config from '../config/draft.json' with {type:'json'};
import heroRandom from '../config/hero-random.json' with {type:'json'};
export const snake=['sapphire','amber','amber','sapphire','sapphire','amber','amber','sapphire','sapphire','amber'];
export function shuffle(values,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function estimate(teams,ratings,params){return probability(['amber','sapphire'].map(t=>teams[t].map(id=>ratings[id]??rating(params))),params);}
export function randomDraft(ids,ratings,bias=config.balanceBias,params){if(ids.length<12)throw new Error('At least 12 players must be ready');const lineup=shuffle(ids).slice(0,12);let teams,p;for(let i=0;i<config.balanceAttempts;i++){const players=shuffle(lineup);teams={amber:players.slice(0,6),sapphire:players.slice(6)};p=estimate(teams,ratings,params);if(Math.random()<Math.exp(-Math.abs(p-.5)*bias*12))break;}return teams;}
export function drawHeroChoices(ids,heroes,banned=[],count=config.heroChoices,allowDuplicateHeroes=false,preferencesByPlayer={},weights=heroRandom.preferenceWeights){
 const available=heroes.filter(h=>h.active!==false&&!banned.includes(h.id));
 if(available.length<(allowDuplicateHeroes?count:ids.length*count))throw Error('Not enough available heroes for this draw');
 for(const value of [-1,0,1,2,3])if(!Number.isFinite(weights?.[value])||weights[value]<=0)throw Error('Hero preference weights must be positive numbers.');
 const choices={};
 // Shuffle players before reserving heroes so roster position gives no advantage.
 for(const id of shuffle(ids)){
  const pool=allowDuplicateHeroes?[...available]:available,preferences=preferencesByPlayer[id]??{};
  choices[id]=[];
  for(let pick=0;pick<count;pick++){
   const chances=pool.map(hero=>weights[preferences[hero.id]??0]??weights[0]);
   let ticket=crypto.getRandomValues(new Uint32Array(1))[0]/4294967296*chances.reduce((sum,weight)=>sum+weight,0),index=pool.length-1;
   for(let i=0;i<pool.length;i++){ticket-=chances[i];if(ticket<0){index=i;break;}}
   choices[id].push(pool.splice(index,1)[0].id);
  }
 }
 return choices;
}
export function reconcileDraftPool(draft,readyIds){
  if(draft?.mode==='captains'){
    const assigned=new Set(Object.values(draft.teams).flat());
    draft.pool=[...readyIds].filter(id=>!assigned.has(id));
  }
  return draft;
}
export function captainActions(format,firstBan='amber'){
  const other=firstBan==='amber'?'sapphire':'amber';
  const picks=snake.map(team=>({type:'pick',team:team==='amber'?firstBan:other}));
  const bans=[{type:'ban',team:firstBan},{type:'ban',team:other}];
  if(format==='simple')return picks;
  // Captains are already assigned. Third drafted pick per side is pick 6.
  if(format==='one-ban')return [...bans,...picks];
  return [...bans,...picks.slice(0,6),...bans,...picks.slice(6)];
}
