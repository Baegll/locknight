import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {emptyData,validateData} from '../src/lib/data.mjs';
const catalog=JSON.parse(await readFile(new URL('../public/projects/locknight/patch-catalog.json',import.meta.url),'utf8'));
const records=validateData({...emptyData(),patches:catalog.patches});
await writeFile(new URL('../public/projects/locknight/initial-records.json',import.meta.url),`${JSON.stringify(records,null,2)}\n`);
console.log('Empty records updated: 0 players, 0 matches, configured patches and rating parameters.');
