import {readFile,writeFile} from 'node:fs/promises';
import {validateData,report,exportData} from '../src/lib/data.mjs';
import {randomDraft,estimate} from '../src/lib/draft.mjs';
import {ordinal} from '../src/lib/skill.mjs';
const args=process.argv.slice(2),input=args.find(a=>!a.startsWith('--'))??'public/projects/locknight/initial-records.json';
const opt=k=>{const i=args.indexOf(k);return i<0?null:args[i+1];};
try{
 const d=validateData(JSON.parse(await readFile(input,'utf8'))),r=report(d,opt('--patch')??'all');
 console.log(`Locknight: ${r.matchCount} matches · ${d.players.length} players · ${opt('--patch')??'all patches'}`);
 console.table(r.players.map(p=>({player:p.name,rating:ordinal(p.rating).toFixed(2),mu:p.rating.mu.toFixed(2),sigma:p.rating.sigma.toFixed(2),games:p.games,wins:p.wins,winRate:p.games?`${(100*p.wins/p.games).toFixed(1)}%`:'—'})));
 const ids=d.players.filter(p=>p.enabled).slice(0,12).map(p=>p.id);
 if(ids.length===12){const teams=randomDraft(ids,r.overall,.35,d.ratingMetadata.parameters);console.log('Draft suggestion:',Object.fromEntries(Object.entries(teams).map(([team,ids])=>[team,ids.map(id=>d.players.find(p=>p.id===id).name)])));console.log('Amber estimated win chance:',estimate(teams,r.overall,d.ratingMetadata.parameters).toFixed(3));}
 if(opt('--json'))await writeFile(opt('--json'),JSON.stringify(r,null,2));
 if(opt('--rebuild'))await writeFile(opt('--rebuild'),JSON.stringify(exportData(d),null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
