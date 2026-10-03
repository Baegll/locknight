import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {emptyData,validateData,patchSource,isTitledPatch} from '../src/lib/data.mjs';
export function parsePatches(html,refreshedAt=new Date().toISOString()){
 const result=[];
 for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)??[]){
  const patchId=row.match(/href=["'](?:https:\/\/steamdb\.info)?\/patchnotes\/(\d+)\/?["']/i)?.[1];
  const epoch=row.match(/data-(?:timestamp|time)=["'](\d{10,13})["']/i)?.[1];
  const iso=row.match(/datetime=["']([^"']+)["']/i)?.[1];
  const timestamp=epoch?new Date(Number(epoch)*(epoch.length===10?1000:1)):new Date(iso);
  if(!patchId||!Number.isFinite(timestamp.getTime()))continue;
  const titleCell=row.match(/<td\b[^>]*class=["'][^"']*(?:patchnotes-title|patch-title)[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)?.[1];
  const title=(titleCell??row.match(/<a\b[^>]*href=["'][^"']*\/patchnotes\/\d+\/?["'][^>]*>([\s\S]*?)<\/a>/i)?.[1]??'').replace(/<span\b[^>]*class=["'][^"']*(?:badge|label)[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').trim()||'No title';
  result.push({id:`steamdb-${patchId}`,buildId:patchId,title,label:title==='No title'?`No title · ${patchId}`:title,effectiveAt:timestamp.toISOString(),sourceUrl:`https://steamdb.info/patchnotes/${patchId}/`,refreshedAt});
 }
 return [...new Map(result.map(p=>[p.id,p])).values()];
}
async function main(){
 const args=process.argv.slice(2),index=args.indexOf('--html');
 let html;
 if(index>=0)html=await readFile(args[index+1],'utf8');
 else{const response=await fetch(patchSource,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Locknight local patch sync'}});if(!response.ok)throw Error(`SteamDB returned ${response.status}`);html=await response.text();}
 const patches=parsePatches(html).filter(isTitledPatch);if(!patches.length)throw Error('SteamDB returned no titled patch rows; existing catalog kept. Save the SteamDB page and use --html, or add patches manually.');
 validateData({...emptyData(),patches});
 const file='public/projects/locknight/patch-catalog.json';await mkdir('public/projects/locknight',{recursive:true});
 let prior=[];try{prior=JSON.parse(await readFile(file,'utf8')).patches;}catch{}
 const merged=[...new Map([...prior,...patches].filter(isTitledPatch).map(p=>[p.id,p])).values()];
 const text=JSON.stringify({schemaVersion:1,sourceUrl:patchSource,refreshedAt:new Date().toISOString(),patches:merged},null,2);
 await writeFile(`${file}.tmp`,text);await rename(`${file}.tmp`,file);console.log(`Synchronized ${patches.length} SteamDB patches (${merged.length} retained). Rebuild the site when publishing.`);
}
if(process.argv[1]?.endsWith('sync-patches.mjs'))main().catch(e=>{console.error(`Patch refresh failed: ${e.message}`);process.exitCode=1;});
