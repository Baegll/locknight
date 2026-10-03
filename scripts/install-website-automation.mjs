import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const targetArg=process.argv[2];
if(!targetArg)throw Error('Usage: node scripts/install-website-automation.mjs <website directory>');
const target=resolve(targetArg);
const manifest=JSON.parse(await readFile(join(target,'package.json'),'utf8'));
if(!manifest.dependencies?.astro)throw Error('Target must be the Astro website');
const modules=await readFile(join(target,'.gitmodules'),'utf8');
if(!/^\s*path\s*=\s*tools\/locknight\s*$/m.test(modules)||!modules.includes('https://github.com/Baegll/locknight.git'))throw Error('Expected tools/locknight submodule is missing');
const destination=join(target,'.github/workflows/sync-locknight.yml');
const source=await readFile(new URL('../automation/website/sync-locknight.yml',import.meta.url),'utf8');
try{
 const existing=await readFile(destination,'utf8');
 if(existing!==source)throw Error('sync-locknight.yml already exists with different contents. Review it before replacing it.');
 console.log('Website sync workflow is already installed.');
}catch(error){
 if(error.code!=='ENOENT')throw error;
 await mkdir(join(target,'.github/workflows'),{recursive:true});
 await copyFile(new URL('../automation/website/sync-locknight.yml',import.meta.url),destination);
 console.log(`Installed ${destination}`);
}
