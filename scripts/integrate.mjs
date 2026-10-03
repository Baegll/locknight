// Writes only when explicitly run. Uses a project directory supplied by the user.
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const targetArg=process.argv[2];
if(!targetArg){console.error('Usage: npm run integrate -- <Astro personal-site directory>');process.exitCode=1;}
else{
 const target=resolve(targetArg),manifest=JSON.parse(await readFile(join(target,'package.json'),'utf8'));
 if(!manifest.dependencies?.astro)throw Error('Target must be an Astro project');
 // Copy only the app modules and route. The portfolio source remains site-owned.
 for(const entry of ['src/client','src/lib','src/config','src/styles/locknight.css','src/vendor','src/pages/projects/locknight','public/projects/locknight']){
  const destination=join(target,entry);await mkdir(resolve(destination,'..'),{recursive:true});await cp(join(sourceRoot,entry),destination,{recursive:true});
 }
 const page=join(target,'src/pages/projects/index.astro');let source=await readFile(page,'utf8');
 if(!source.includes('href="/projects/locknight/"')){
  const card=`\n  <a href="/projects/locknight/" class="project-row"><span class="project-num">02</span><div><div class="project-info"><span class="project-name">Locknight</span><span class="project-desc">6v6 Deadlock drafts, match records, and player ratings.</span></div><div class="project-tags"><span class="tag">Astro</span><span class="tag">OpenSkill</span><span class="tag">Deadlock</span></div></div><span class="project-arrow">→</span></a>\n`;
  source=source.replace(/(\d+) total/,(_,n)=>`${Number(n)+1} total`).replace('</Portfolio>',`${card}</Portfolio>`);
 }
 source=source.replace('Fair 6v6 Deadlock inhouses. Draft teams, track matches, and learn from your games.','6v6 Deadlock drafts, match records, and player ratings.');
 await writeFile(page,source);
 console.log(`Locknight integrated at ${join(target,'src/pages/projects/locknight')}. Run the personal site's build before publishing.`);
}
