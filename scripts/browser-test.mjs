import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
await mkdir('artifacts',{recursive:true});
const executable=process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port=9432,profile=resolve('artifacts/browser-profile');
const chrome=spawn(executable,['--headless=new','--disable-gpu','--no-sandbox','--disable-gpu-sandbox','--remote-allow-origins=*',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
chrome.stderr.on('data',chunk=>writeFile('artifacts/chrome.stderr.log',chunk,{flag:'a'}));
const delay=ms=>new Promise(r=>setTimeout(r,ms));let ws,sequence=0,pending=new Map(),errors=[],checks=[];
chrome.on('error',e=>{console.error(e);process.exitCode=1;});
async function retry(fn){let err;for(let i=0;i<100;i++){try{return await fn();}catch(e){err=e;await delay(100);}}throw err;}
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{if(pending.delete(id))reject(Error(`Timed out: ${method}`));},15000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value;}
async function waitFor(expression){return retry(async()=>{const value=await evaluate(expression);assert.ok(value,expression);return value;});}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(70);}
async function change(selector,value){await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(el.dataset.attendance){el.closest('.availability-buttons').querySelector('[data-status="'+${JSON.stringify(value)}+'"]').click();return;}el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(70);}
async function check(name,fn){await fn();checks.push(name);console.log(`PASS ${name}`);}
async function chooseAllHeroes(){const ids=await evaluate(`[...document.querySelectorAll('.hero-choices')].map(el=>el.querySelector('button').dataset.choicePlayer)`);for(const id of ids)await click(`[data-choice-player="${id}"]`);}
async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(`artifacts/${name}.png`,Buffer.from(r.data,'base64'));}
try{
 const pages=await retry(async()=>{const r=await fetch(`http://127.0.0.1:${port}/json/list`);return r.json();});
 ws=new WebSocket(pages[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 ws.addEventListener('close',e=>console.log('CDP closed',e.code,e.reason));
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);});
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:4321/projects/'});await waitFor(`document.querySelector('a[href="/projects/locknight/"]')`);
 await screenshot('portfolio-reference');
 await check('Personal portfolio links to Locknight',()=>click('a[href="/projects/locknight/"]'));
 await waitFor(`document.querySelector('[data-action="draft"]')`);await evaluate(`localStorage.removeItem('locknight-v1');localStorage.removeItem('theme')`);await send('Page.reload');await delay(300);await waitFor(`document.querySelector('[data-action="draft"]')`);
 await check('New session starts empty with configured patches',async()=>{assert.equal(await evaluate(`document.querySelectorAll('[data-attendance-player]').length`),0);await click('[data-tab="data"]');assert.ok(await evaluate(`['0 players','0 matches','24 patches'].every(text=>document.querySelector('#content').textContent.includes(text))`));assert.equal(await evaluate(`!!document.querySelector('[data-action="demo"]')`),false);});
 const fixture=await readFile('tests/fixtures/demo-source.json','utf8');
 await evaluate(`(()=>{const input=document.querySelector('#import-file'),dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(fixture)}],'fixture.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await waitFor(`document.querySelector('#confirm-dialog').open`);await click('#confirm-dialog button[value="confirm"]');await click('[data-tab="draft"]');await waitFor(`document.querySelectorAll('[data-attendance-player]').length===18`);
 await check('Imported fixture contains 18 players and 48 games',async()=>{assert.equal(await evaluate(`document.querySelectorAll('[data-attendance-player]').length`),18);assert.ok(await evaluate(`document.querySelector('.draft-status').textContent.includes('48')`));});
 await check('Locknight uses portfolio layout, fonts and theme tokens',async()=>{const style=await evaluate(`({heading:getComputedStyle(document.querySelector('.locknight h1')).fontFamily,body:getComputedStyle(document.querySelector('.locknight')).fontFamily,accent:getComputedStyle(document.documentElement).getPropertyValue('--t-cta').trim(),rail:!!document.querySelector('.sidebar'),active:document.querySelector('.sidebar [aria-current="page"]').textContent.trim(),tabular:getComputedStyle(document.querySelector('.locknight')).fontVariantNumeric})`);assert.ok(style.heading.includes('Archivo'));assert.ok(style.body.includes('Space Grotesk'));assert.equal(style.accent.toLowerCase(),'#f472b6');assert.equal(style.active,'projects');assert.ok(style.rail);assert.equal(style.tabular,'tabular-nums');});
 await screenshot('locknight-desktop');
 await check('Empty draft does not show a fabricated estimate',async()=>assert.equal(await evaluate(`document.querySelector('.balance-meter').hidden`),true));
 await check('Status buttons keep pool scroll and highlight only the active choice',async()=>{
   const id=await evaluate(`(()=>{const pool=document.querySelector('.players-pool');pool.scrollTop=300;const button=pool.querySelectorAll('[data-status="away"][data-attendance]')[5];button.focus({preventScroll:true});return button.dataset.attendance;})()`),before=await evaluate(`document.querySelector('.players-pool').scrollTop`);
   assert.ok(before>0);await click(`[data-attendance="${id}"][data-status="away"]`);
   assert.equal(await evaluate(`document.querySelector('.players-pool').scrollTop`),before);
   assert.equal(await evaluate(`document.querySelector('[data-attendance-player="${id}"] [aria-pressed="true"]').dataset.status`),'away');
   assert.equal(await evaluate(`document.querySelectorAll('[data-attendance-player="${id}"] [aria-pressed="true"]').length`),1);
   assert.equal(await evaluate(`document.activeElement.dataset.status`),'away');
   await click(`[data-attendance="${id}"][data-status="ready"]`);assert.equal(await evaluate(`document.querySelector('.players-pool').scrollTop`),before);
   await evaluate(`document.querySelector('.players-pool').scrollTop=0`);
 });
 await check('Search retains input focus and filters without replacing controls',async()=>{await evaluate(`(()=>{const el=document.querySelector('#pool-search');el.focus();window.savedDraftMode=document.querySelector('#draft-mode');el.value='no-matching-player';el.dispatchEvent(new Event('input',{bubbles:true}));})()`);assert.equal(await evaluate(`document.activeElement.id`),'pool-search');assert.equal(await evaluate(`document.querySelector('.no-results').hidden`),false);await evaluate(`(()=>{const el=document.querySelector('#pool-search');el.value='Avery';el.dispatchEvent(new Event('input',{bubbles:true}));})()`);assert.equal(await evaluate(`[...document.querySelectorAll('.pool-player')].filter(row=>!row.hidden).length`),1);await evaluate(`(()=>{const el=document.querySelector('#pool-search');el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));})()`);assert.ok(await evaluate(`window.savedDraftMode===document.querySelector('#draft-mode')`));assert.equal(await evaluate(`document.querySelector('.no-results').hidden`),true);});
 await click('[data-action="select12"]');
 await check('Random draft creates 12 players and rerolls',async()=>{await click('[data-action="draft"]');assert.equal(await evaluate(`document.querySelectorAll('[data-hero]').length`),12);const first=await evaluate(`[...document.querySelectorAll('.team.amber [data-hero]')].map(e=>e.dataset.hero).join(',')`);await click('[data-action="draft"]');const next=await evaluate(`[...document.querySelectorAll('.team.amber [data-hero]')].map(e=>e.dataset.hero).join(',')`);assert.notEqual(first,next);});
 await check('Pool edits and Select 12 preserve drafted teams, heroes and winner',async()=>{
   await click('[data-choice-player]');await change('#match-winner','amber');
   const state=()=>evaluate(`({teams:[...document.querySelectorAll('[data-slot-player]')].map(el=>[el.closest('.team').className,el.dataset.slotPlayer]),heroes:[...document.querySelectorAll('[data-hero]')].map(el=>[el.dataset.hero,el.value]),choices:[...document.querySelectorAll('[data-choice-hero]')].map(el=>el.dataset.choiceHero),winner:document.querySelector('#match-winner').value,estimate:document.querySelector('.balance-title').textContent})`);
   const before=await state(),assigned=before.teams[0][1];
   await change(`[data-attendance="${assigned}"]`,'away');assert.deepEqual(await state(),before);
   await click('[data-action="select12"]');assert.deepEqual(await state(),before);
 });
 await check('Player identity and hero controls occupy separate rows',async()=>{
   const boxes=await evaluate(`(()=>{const slot=document.querySelector('[data-slot-player]'),a=slot.querySelector('.avatar').getBoundingClientRect(),n=slot.querySelector('.slot-info').getBoundingClientRect(),h=slot.querySelector('.hero-control').getBoundingClientRect();return {gap:n.left-a.right,nameWidth:n.width,heroTop:h.top,identityBottom:Math.max(a.bottom,n.bottom)};})()`);
   assert.ok(boxes.gap>=13);assert.ok(boxes.nameWidth>150);assert.ok(boxes.heroTop>boxes.identityBottom);
 });
 await click('[data-action="random-heroes"]');await chooseAllHeroes();await change('#match-winner','amber');await click('[data-action="record"]');
 await check('Match recording saves heroes, ratings and result',async()=>{const d=await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).data`);assert.equal(d.matches.length,49);assert.equal(d.matches.at(-1).winner,'amber');assert.equal(Object.keys(d.matches.at(-1).draft.snapshot.ratings).length,12);});
 await click('[data-tab="history"]');const latest=await evaluate(`document.querySelector('[data-correct]').dataset.correct`);await change(`[data-correct="${latest}"]`,'sapphire');
 await check('Result correction retains an edit record',async()=>{const d=await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).data`);assert.equal(d.matches.at(-1).edits.length,1);assert.equal(d.matches.at(-1).winner,'sapphire');});
 await click('[data-tab="roster"]');await evaluate(`document.querySelector('#add-player input').value='Browser Test Player';document.querySelector('#add-player').requestSubmit()`);await change('[data-pref="abrams"]','3');
 await check('Roster and preference changes persist',async()=>{const d=await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).data`);assert.equal(d.players.at(-1).name,'Browser Test Player');assert.equal(d.players.at(-1).preferences.abrams,3);});
 await click('[data-tab="draft"]');await change('#draft-mode','captains');await change('#draft-format','two-ban');await click('[data-action="random-captains"]');await click('[data-action="draft"]');
 const bannedHeroIds=[];
 await check('Captain draft completes two hero ban rounds and snake picks',async()=>{let picks=0,bans=0;for(let i=0;i<14;i++){const banning=await evaluate(`!!document.querySelector('#ban-hero')`);if(banning){if(bans===2)assert.equal(picks,6);const hero=await evaluate(`(()=>{const el=document.querySelector('#ban-hero');el.value=el.options[1].value;return el.value;})()`);bannedHeroIds.push(hero);await click('[data-action="ban"]');bans++;}else{await click('[data-pick]');picks++;}if(i===3){const before=await evaluate(`({slots:[...document.querySelectorAll('[data-slot-player]')].map(el=>el.dataset.slotPlayer),turn:document.querySelector('.draft-turn .eyebrow').textContent,banOptions:!!document.querySelector('#ban-hero')})`),pid=await evaluate(`document.querySelector('[data-pick]').dataset.pick`);await change(`[data-attendance="${pid}"]`,'away');assert.equal(await evaluate(`!!document.querySelector('[data-pick="${pid}"]')`),false);assert.deepEqual(await evaluate(`({slots:[...document.querySelectorAll('[data-slot-player]')].map(el=>el.dataset.slotPlayer),turn:document.querySelector('.draft-turn .eyebrow').textContent,banOptions:!!document.querySelector('#ban-hero')})`),before);await change(`[data-attendance="${pid}"]`,'ready');assert.ok(await evaluate(`!!document.querySelector('[data-pick="${pid}"]')`));}}assert.equal(picks,10);assert.equal(bans,4);assert.equal(await evaluate(`document.querySelectorAll('[data-hero]').length`),12);assert.ok(await evaluate(`document.querySelector('.ban-chip').textContent.includes('Banned:')`));});
 await screenshot('locknight-captains');
 await click('[data-action="random-heroes"]');await chooseAllHeroes();
 await check('Hero edits retain keyboard focus and do not replay animation',async()=>{const first=await evaluate(`document.querySelector('[data-hero]').dataset.hero`);await evaluate(`document.querySelector('[data-hero]').focus()`);const free=await evaluate(`(()=>{const assigned=[...document.querySelectorAll('[data-hero]')].map(el=>el.value).concat([...document.querySelectorAll('[data-choice-hero]')].map(el=>el.dataset.choiceHero));return [...document.querySelector('[data-hero]').options].find(o=>o.value&&!assigned.includes(o.value)).value;})()`);await change(`[data-hero="${first}"]`,free);assert.equal(await evaluate(`document.activeElement.dataset.hero`),first);assert.equal(await evaluate(`getComputedStyle(document.querySelector('.team-slot')).animationName`),'none');});
 await check('Banned heroes are excluded from assignments',async()=>{assert.ok(await evaluate(`![...document.querySelectorAll('[data-hero]')].some(el=>${JSON.stringify(bannedHeroIds)}.includes(el.value))`));});
 await change('#draft-mode','manual');await click('[data-action="draft"]');
 const manualIds=await evaluate(`[...document.querySelectorAll('[data-manual]')].map(el=>el.dataset.manual)`);for(let i=0;i<12;i++)await change(`[data-manual="${manualIds[i]}"]`,i<6?'amber':'sapphire');
 await check('Manual draft assigns six players to each team',async()=>assert.equal(await evaluate(`document.querySelectorAll('[data-hero]').length`),12));
 await click('[data-tab="reports"]');await check('Insights render ratings, pair records and timeline',async()=>{assert.ok(await evaluate(`!!document.querySelector('svg.chart')`));assert.ok(await evaluate(`document.querySelector('#content').textContent.includes('Teammate pairs')`));});await screenshot('locknight-insights');
 await click('[data-tab="data"]');
 await check('Invalid import leaves working data intact',async()=>{const prior=await evaluate(`localStorage.getItem('locknight-v1')`);await evaluate(`(()=>{const input=document.querySelector('#import-file'),dt=new DataTransfer();dt.items.add(new File(['{"schemaVersion":999}'],'invalid.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await waitFor(`document.querySelector('#notice').classList.contains('error')`);assert.equal(await evaluate(`localStorage.getItem('locknight-v1')`),prior);});
 const importData=await readFile('tests/fixtures/demo-source.json','utf8');
 await evaluate(`(()=>{const input=document.querySelector('#import-file'),dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(importData)}],'demo.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await waitFor(`document.querySelector('#confirm-dialog').open`);await click('#confirm-dialog button[value="cancel"]');
 await check('Import confirmation can be canceled',async()=>assert.equal(await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).data.matches.length`),49));
 await evaluate(`(()=>{const input=document.querySelector('#import-file'),dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(importData)}],'demo.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await waitFor(`document.querySelector('#confirm-dialog').open`);await click('#confirm-dialog button[value="confirm"]');await waitFor(`document.querySelector('#mode-badge').textContent==='Your data'`);
 await check('Confirmed import replaces data and rebuilds',async()=>assert.equal(await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).data.matches.length`),48));
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve('artifacts/downloads')});await click('[data-action="export"]');
 await check('Export produces portable JSON with derived timelines',async()=>{const {readdir}=await import('node:fs/promises');const files=await retry(async()=>{const f=await readdir('artifacts/downloads');assert.ok(f.some(f=>f.endsWith('.json')));return f;});const exported=JSON.parse(await readFile(`artifacts/downloads/${files.find(f=>f.endsWith('.json'))}`,'utf8'));assert.equal(exported.matches.length,48);assert.equal(exported.ratingHistory.length,48*24);});
 await click('[data-action="refresh-patches"]');await waitFor(`document.querySelector('#notice').textContent.includes('Patch catalog refreshed')`);
 await check('Patch refresh loads supplied SteamDB titles and retains demo patches',async()=>assert.equal(await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).data.patches.length`),27));
 await click('[data-tab="draft"]');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await check('Mobile layout fits viewport and respects reduced motion',async()=>{assert.ok(await evaluate(`document.documentElement.scrollWidth<=390`));assert.equal(await evaluate(`getComputedStyle(document.querySelector('.team-slot')).animationName`),'none');});await screenshot('locknight-mobile');
 await click('.sidebar .icon-btn');await screenshot('locknight-light');
 await check('Theme preference is shared with portfolio',async()=>{assert.equal(await evaluate(`localStorage.getItem('theme')`),'light');assert.equal(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--t-cta').trim().toLowerCase()`),'#be185d');});
 await check('All sections fit the mobile viewport',async()=>{for(const section of ['roster','history','reports','data','draft']){await click(`[data-tab="${section}"]`);assert.ok(await evaluate(`document.documentElement.scrollWidth<=390`),`${section} overflow`);assert.equal(await evaluate(`document.querySelector('.ln-tabs [aria-current="page"]').dataset.tab`),section);}});
 await check('UI text preserves Unicode characters',async()=>assert.ok(await evaluate(`!document.querySelector('#content').textContent.includes('\u00e2\u20ac')`)));
 await click('[data-tab="data"]');
 await check('Manual patch entry stores UTC and becomes current default',async()=>{await evaluate(`(()=>{const f=document.querySelector('#add-patch');f.elements.label.value='Browser test patch';f.elements.effectiveAt.value='2026-10-03T13:00';f.requestSubmit();})()`);const d=await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).data`);assert.equal(d.patches.at(-1).effectiveAt,'2026-10-03T13:00:00.000Z');});
 await check('Fresh session replacement can be canceled',async()=>{const prior=await evaluate(`localStorage.getItem('locknight-v1')`);await click('[data-action="fresh"]');await waitFor(`document.querySelector('#confirm-dialog').open`);await click('#confirm-dialog button[value="cancel"]');assert.equal(await evaluate(`localStorage.getItem('locknight-v1')`),prior);});
 await check('Data and shared theme survive page reload',async()=>{await send('Page.reload');await delay(300);await waitFor(`document.querySelector('[data-action="draft"]')`);assert.ok(await evaluate(`document.querySelector('#draft-patch').selectedOptions[0].textContent.includes('Browser test patch')`));assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`),false);});

 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await click('[data-action="select12"]');
 const attendanceIds=await evaluate(`[...document.querySelectorAll('[data-attendance-player]')].map(el=>el.dataset.attendancePlayer)`);
 await change(`[data-attendance="${attendanceIds[12]}"]`,'ready');await change(`[data-attendance="${attendanceIds[13]}"]`,'ready');
 await check('Fourteen ready players draft twelve with two on the bench',async()=>{
   assert.equal(await evaluate(`[...document.querySelectorAll('[data-attendance-player]')].filter(el=>el.dataset.status==='ready').length`),14);
   await change('#draft-mode','balanced');await click('[data-action="draft"]');
   assert.equal(await evaluate(`document.querySelectorAll('[data-hero]').length`),12);
   assert.equal(await evaluate(`document.querySelectorAll('.bench > span').length`),2);
   assert.equal(await evaluate(`document.querySelectorAll('[data-choice-hero]').length`),24);
   assert.equal(await evaluate(`new Set([...document.querySelectorAll('[data-choice-hero]')].map(el=>el.dataset.choiceHero)).size`),24);
 });
 await check('Draft placement has action-specific animation',async()=>{await click('[data-action="draft"]');assert.ok(await evaluate(`document.querySelector('[data-slot-player]').getAnimations().length>0`));});
 await check('Statistics switch hides all draft ratings and persists',async()=>{
   await click('[data-action="statistics"]');assert.equal(await evaluate(`document.querySelector('.balance-meter').hidden`),true);
   assert.equal(await evaluate(`document.querySelectorAll('.draft-layout .player-sub').length`),0);
   assert.equal(await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).showStats`),false);
   await click('[data-action="statistics"]');
 });
 await check('Random mode has no balance bias and offers two heroes',async()=>{await change('#draft-mode','random');await click('[data-action="draft"]');assert.equal(await evaluate(`!!document.querySelector('#balance-bias')`),false);assert.equal(await evaluate(`document.querySelectorAll('[data-choice-hero]').length`),24);});
 await check('Sit out returns after one match; Away stays unavailable',async()=>{
   await change(`[data-attendance="${attendanceIds[13]}"]`,'sitout');await change(`[data-attendance="${attendanceIds[14]}"]`,'away');await click('[data-action="draft"]');
   await chooseAllHeroes();await change('#match-winner','amber');await click('[data-action="record"]');
   assert.equal(await evaluate(`document.querySelector('[data-attendance="${attendanceIds[13]}"]').closest('.availability-buttons').dataset.status`),'ready');
   assert.equal(await evaluate(`document.querySelector('[data-attendance="${attendanceIds[14]}"]').closest('.availability-buttons').dataset.status`),'away');
 });
 await change('#draft-mode','manual');await click('[data-action="draft"]');
 await check('Drag and drop assigns a ready player to a manual slot',async()=>{
   await evaluate(`(()=>{const row=document.querySelector('[data-player="${attendanceIds[0]}"]'),slot=document.querySelector('[data-drop-team="amber"]'),dt=new DataTransfer();row.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));slot.dispatchEvent(new DragEvent('dragover',{bubbles:true,dataTransfer:dt}));slot.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));})()`);
   assert.equal(await evaluate(`document.querySelector('.team.amber [data-slot-player]').dataset.slotPlayer`),attendanceIds[0]);
 });
 await check('Per-player random heroes work before manual lineup is complete',async()=>{await click(`[data-random-hero="${attendanceIds[0]}"]`);assert.equal(await evaluate(`document.querySelectorAll('[data-choice-player="${attendanceIds[0]}"]').length`),2);await click(`[data-choice-player="${attendanceIds[0]}"]`);assert.ok(await evaluate(`document.querySelector('[data-hero="${attendanceIds[0]}"]').value`));});
 await check('Manual availability changes preserve assigned player and hero',async()=>{const hero=await evaluate(`document.querySelector('[data-hero="${attendanceIds[0]}"]').value`);await change(`[data-attendance="${attendanceIds[0]}"]`,'away');assert.equal(await evaluate(`document.querySelector('[data-hero="${attendanceIds[0]}"]').value`),hero);assert.equal(await evaluate(`document.querySelector('[data-manual="${attendanceIds[0]}"]').value`),'amber');});
 await check('Hero-specific effects animate only the selected player',async()=>{await change(`[data-hero="${attendanceIds[0]}"]`,'infernus');assert.equal(await evaluate(`document.querySelector('[data-slot-player="${attendanceIds[0]}"]').dataset.effect`),'flame');assert.ok(await evaluate(`document.querySelector('[data-slot-player="${attendanceIds[0]}"]').getAnimations().length>0`));});
 await check('Reduced motion suppresses hero effects',async()=>{await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await delay(450);await change(`[data-hero="${attendanceIds[0]}"]`,'kelvin');assert.equal(await evaluate(`document.querySelector('[data-slot-player="${attendanceIds[0]}"]').getAnimations().length`),0);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});});
 await check('Keyboard focus shows configured tooltip and Escape dismisses it',async()=>{await evaluate(`document.querySelector('[data-action="statistics"]').focus({preventScroll:true})`);assert.equal(await evaluate(`document.querySelector('.ln-tooltip').hidden`),false);await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);assert.equal(await evaluate(`document.querySelector('.ln-tooltip').hidden`),true);});
 await check('Primary draft controls align on one baseline',async()=>{const bottoms=await evaluate(`[...document.querySelector('.draft-controls').querySelectorAll('select,button')].map(el=>el.getBoundingClientRect().bottom)`);assert.ok(Math.max(...bottoms)-Math.min(...bottoms)<2);});
 await screenshot('locknight-updated-desktop');
 await check('Populated draft rows keep names readable on mobile',async()=>{await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.ok(await evaluate(`document.documentElement.scrollWidth<=390`));assert.ok(await evaluate(`document.querySelector('.slot-info').getBoundingClientRect().width>200`));await screenshot('locknight-draft-spacing-mobile');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});});
 await check('A match remains recordable after a drafted player is marked Away',async()=>{
   const ids=await evaluate(`[...document.querySelectorAll('[data-manual]')].map(el=>el.dataset.manual)`),remaining=ids.filter(id=>id!==attendanceIds[0]).slice(0,11);
   for(let i=0;i<remaining.length;i++)await change(`[data-manual="${remaining[i]}"]`,i<5?'amber':'sapphire');
   await click('[data-action="random-heroes"]');await chooseAllHeroes();await change('#match-winner','amber');await click('[data-action="record"]');
   const d=await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).data`),m=d.matches.at(-1);assert.ok(m.teams.amber.includes(attendanceIds[0]));assert.ok(m.draft.settings.readyPlayers.includes(attendanceIds[0]));assert.equal(await evaluate(`document.querySelector('[data-attendance="${attendanceIds[0]}"]').closest('.availability-buttons').dataset.status`),'away');
 });
 await click('[data-tab="roster"]');
 await check('Roster has no enabled/disabled switch',async()=>assert.equal(await evaluate(`document.querySelectorAll('[data-enabled]').length`),0));
 const profile={type:'locknight-player',schemaVersion:1,player:{id:'profile-browser',name:'Shared Player',preferences:{abrams:3,ivy:-1},notes:'Shared preference test'}};
 await check('Player profile import merges preferences without replacing matches',async()=>{
   const prior=await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).data.matches.length`);
   await evaluate(`(()=>{const dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(JSON.stringify(profile))}],'player.json',{type:'application/json'}));const el=document.querySelector('#profile-file');el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
   await waitFor(`document.querySelector('[data-action="profile-apply"]')`);await click('[data-action="profile-apply"]');
   const d=await evaluate(`JSON.parse(localStorage.getItem('locknight-v1')).data`);assert.equal(d.matches.length,prior);assert.equal(d.players.at(-1).preferences.abrams,3);
 });
 await send('Page.navigate',{url:'http://127.0.0.1:4321/projects/locknight/preferences/'});await waitFor(`document.querySelectorAll('[data-profile-hero]').length===39`);
 await check('All supplied released heroes appear in preference controls',async()=>{for(const id of ['rem','graves','silver','venator','celeste','apollo','rat-king'])assert.ok(await evaluate(`!!document.querySelector('[data-profile-hero="${id}"]')`));});
 await check('Standalone preference page produces valid player JSON',async()=>{await evaluate(`(()=>{const name=document.querySelector('#profile-name');name.value='Independent Player';name.dispatchEvent(new Event('input',{bubbles:true}));const pref=document.querySelector('[data-profile-hero="abrams"]');pref.value='2';pref.dispatchEvent(new Event('input',{bubbles:true}));})()`);const value=await evaluate(`JSON.parse(document.querySelector('#profile-json').value)`);assert.equal(value.type,'locknight-player');assert.equal(value.player.preferences.abrams,2);assert.equal(value.player.name,'Independent Player');assert.ok(value.player.id);await evaluate(`document.querySelector('#profile-form').requestSubmit()`);assert.ok(await evaluate(`document.querySelector('#profile-notice').textContent.includes('lobby leader')`));});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await check('Standalone preference page fits mobile',async()=>assert.ok(await evaluate(`document.documentElement.scrollWidth<=390`)));
 await screenshot('locknight-preferences-mobile');
 await check('No uncaught browser errors',async()=>assert.deepEqual(errors,[]));
 await writeFile('artifacts/browser-results.json',JSON.stringify({url:'http://127.0.0.1:4321/projects/locknight/',checks,errors},null,2));
 console.log(`${checks.length} browser checks passed. Screenshots and results in artifacts/.`);
}catch(e){console.error(e);let page;try{page=await evaluate(`({url:location.href,title:document.title,text:document.body?.innerText.slice(0,2500)})`);console.log(page);await screenshot('browser-failure');}catch{}await writeFile('artifacts/browser-results.json',JSON.stringify({checks,errors,failure:e.message,page},null,2));process.exitCode=1;}
finally{ws?.close();chrome.kill();}
