import {readFile,writeFile} from 'node:fs/promises';
import {heroes} from '../src/lib/catalog.mjs';
const args=process.argv.slice(2),input=args[0];
try{
 const incoming=input?JSON.parse(await readFile(input,'utf8')):await (await fetch('https://assets.deadlock-api.com/v2/heroes',{signal:AbortSignal.timeout(15000)})).json();
 if(!Array.isArray(incoming)||!incoming.length)throw Error('No heroes returned. Existing catalog kept.');
 const catalog=new Map(heroes.map(h=>[h.id,h]));
 const normalize=name=>name.toLowerCase().replace(/^the /,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const aliases={'grey-talon':'grey-talon','mo-and-krill':'mo-and-krill','the-doorman':'doorman'};
 for(const h of incoming){if(h.player_selectable===false)continue;if(typeof h.name!=='string'||!h.name.trim()||!Number.isInteger(h.id))throw Error('Unexpected hero record. Existing catalog kept.');const slug=normalize(h.name),prior=heroes.find(old=>old.sourceId===h.id||normalize(old.name)===slug);const id=prior?.id??aliases[slug]??`hero-${h.id}`;catalog.set(id,{id,name:h.name,sourceId:h.id});}
 const output=[...catalog.values()].sort((a,b)=>a.name.localeCompare(b.name));
 await writeFile('src/config/heroes.json',JSON.stringify(output,null,2)+'\n');
 console.log(`Maintained ${output.length} heroes. Rebuild and regenerate schema after syncing.`);
}catch(e){console.error(`Hero refresh failed: ${e.message}`);process.exitCode=1;}
