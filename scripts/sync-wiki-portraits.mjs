import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {allHeroes} from '../src/lib/catalog.mjs';

const wiki='https://deadlock.wiki',args=process.argv.slice(2),index=args.indexOf('--html');
const normalized=name=>name.toLowerCase().replace(/^the /,'').replace(/[^a-z0-9]/g,'');
async function get(url){const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Locknight hero portrait sync'}});if(!response.ok)throw Error(`Wiki returned ${response.status}`);return response;}
try{
 const html=index>=0?await readFile(args[index+1],'utf8'):await (await get(`${wiki}/Heroes`)).text();
 const found=new Map();
 for(const tag of html.match(/<img\b[^>]*>/gi)??[]){
  const src=tag.match(/\b(?:src|data-src)=["']([^"']+)["']/i)?.[1];if(!src)continue;
  const url=new URL(src.replace(/&amp;/g,'&'),wiki);
  if(url.hostname!=='deadlock.wiki'||url.protocol!=='https:'||!url.pathname.startsWith('/images/'))continue;
  const filename=decodeURIComponent(url.pathname.split('/').at(-1)).replace(/^\d+px-/,'').replace(/\.(?:png|webp|jpg|jpeg)$/i,'');
  const key=normalized(filename.replace(/[_ ](?:card|icon|render|portrait)$/i,''));
  const hero=allHeroes.find(h=>normalized(h.name)===key);if(!hero)continue;
  const score=/[_ ]card$/i.test(filename)?2:1;
  if((found.get(hero.id)?.score??0)<score)found.set(hero.id,{url:url.href,score});
 }
 if(!found.size)throw Error('No matching hero portraits in the page. Existing artwork kept.');
 await mkdir('public/projects/locknight/heroes',{recursive:true});
 const catalog=structuredClone(allHeroes);let downloaded=0;
 for(const hero of catalog){
  const record=found.get(hero.id);if(!record)continue;
  try{
   const response=await get(record.url),type=response.headers.get('content-type')??'';
   const extension=type.includes('png')?'png':type.includes('webp')?'webp':type.includes('jpeg')?'jpg':null;
   if(!extension)throw Error('Unsupported image response');
   const file=`${hero.id}.${extension}`;
   await writeFile(`public/projects/locknight/heroes/${file}`,Buffer.from(await response.arrayBuffer()));
   hero.portrait=`/projects/locknight/heroes/${file}`;hero.portraitSource=record.url;hero.wikiUrl=`${wiki}/${hero.name.replaceAll(' ','_')}`;downloaded++;
  }catch(error){console.error(`${hero.name}: ${error.message}. Existing portrait kept.`);}
 }
 if(!downloaded)throw Error('No artwork could be downloaded. Existing catalog kept.');
 await writeFile('src/config/heroes.json',JSON.stringify(catalog,null,2)+'\n');
 console.log(`Downloaded ${downloaded} wiki portraits. Rebuild to publish them.`);
}catch(error){console.error(`Wiki sync failed: ${error.message}`);process.exitCode=1;}
