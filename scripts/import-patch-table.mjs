// Snapshot supplied by the lobby leader, 2026-10-03. All times are UTC.
import {writeFile} from 'node:fs/promises';
import {emptyData,validateData,patchSource} from '../src/lib/data.mjs';
const rows=[
 ['2026-10-03','00:51','No title','25689475'],['2026-10-02','22:36','No title','25687758'],
 ['2026-10-02','21:34','No title','25686905'],['2026-10-02','21:23','No title','25686732'],
 ['2026-10-02','21:01','Listen up, Crumbums! Your King is here.','25686410'],['2026-10-02','21:00','No title','25686246'],
 ['2026-10-01','22:41','No title','25664168'],['2026-10-01','19:36','No title','25660886'],['2026-10-01','16:57','No title','25658155'],
 ['2026-09-30','22:35','No title','25639407'],['2026-09-30','12:33','No title','25627654'],
 ['2026-09-29','23:01','No title','25614556'],['2026-09-29','20:28','No title','25612104'],
 ['2026-09-29','20:26','City Never Sleeps','25611908'],['2026-09-25','18:23','No title','25535087'],
 ['2026-09-18','16:27','No title','25379491'],['2026-09-17','22:59','No title','25379260'],['2026-09-17','19:43','No title','25376188'],
 ['2026-09-16','20:17','Minor Update - 09-16-2026','25354466'],['2026-09-11','18:51','No title','25260093'],
 ['2026-09-11','17:35','No title','25258232'],['2026-09-09','17:24','No title','25213504'],
 ['2026-09-07','19:05','No title','25173285'],['2026-08-22','21:41','Minor Update - 08-22-2026','24882156']
];
const refreshedAt=new Date().toISOString();
const patches=rows.map(([date,time,title,buildId])=>({id:`steamdb-${buildId}`,buildId,title,label:title==='No title'?`No title · ${buildId}`:title,effectiveAt:`${date}T${time}:00.000Z`,sourceUrl:`https://steamdb.info/patchnotes/${buildId}/`,refreshedAt}));
validateData({...emptyData(),patches});
await writeFile('public/projects/locknight/patch-catalog.json',JSON.stringify({schemaVersion:1,sourceUrl:patchSource,provenance:'User-supplied SteamDB table, 2026-10-03. Live synchronization not verified.',refreshedAt,patches},null,2)+'\n');
