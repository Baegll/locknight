import initialRecords from '../../public/projects/locknight/initial-records.json';
import patchCatalog from '../../public/projects/locknight/patch-catalog.json';
import {heroes,heroName} from '../lib/catalog.mjs';
import {validateData,rebuild,report,correctWinner,exportData,latestPatch,patchSource} from '../lib/data.mjs';
import {randomDraft,shuffle,estimate,captainActions,reconcileDraftPool} from '../lib/draft.mjs';
import {ordinal} from '../lib/skill.mjs';
import config from '../config/draft.json';
import tips from '../config/tooltips.json';
import motion from '../config/motion.json';
import {drawHeroChoices} from '../lib/draft.mjs';
import {playerProfile,validateProfile,mergeProfile} from '../lib/profile.mjs';
import {installTooltips} from './tooltips.mjs';
import {heroPreferenceButtons,highlightPreference} from './hero-preferences.mjs';
const $=s=>document.querySelector(s),root=$('#content');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=x=>`${Math.round(x*100)}%`,num=x=>Number(x).toFixed(1),uid=p=>`${p}-${crypto.randomUUID()}`;
const headings={draft:['Draft teams','Select 12 players, then choose a draft mode.'],roster:['Players','Edit your roster and hero preferences.'],history:['Matches','Review lineups and correct results.'],reports:['Stats','Player ratings and records by patch.'],data:['Data & patches','Import records, export a backup, or add a patch.']};
const newWorkspaceData=()=>structuredClone(initialRecords);
let attendance={},showStats=true,pendingProfile=null,matchWinner='';
let data,isDemo=false,tab='draft',selected=new Set(),derived,draft=null,format='simple',mode=config.defaultMode,bias=config.balanceBias,firstBan='amber',patchId='',filter='all',preferredPlayer='',search='',viewPlayer='',storageWarning='';
try{const saved=localStorage.getItem('locknight-v1');if(saved){const state=JSON.parse(saved);data=validateData(state.data);isDemo=state.isDemo;attendance=state.attendance??{};showStats=state.showStats??true;}else data=validateData(newWorkspaceData());}catch(e){data=validateData(newWorkspaceData());storageWarning=`Saved data could not be loaded (${e.message}). Export a backup before making changes.`;}
function resetSelection(){selected=new Set(data.players.filter(p=>(attendance[p.id]??(p.enabled?'ready':'away'))==='ready').map(p=>p.id));patchId=latestPatch(data)?.id??'';preferredPlayer=data.players[0]?.id??'';viewPlayer=preferredPlayer;draft=null;matchWinner='';}
function syncReadyPool(){selected=new Set(data.players.filter(p=>(attendance[p.id]??(p.enabled?'ready':'away'))==='ready').map(p=>p.id));reconcileDraftPool(draft,selected);}
resetSelection();
function notify(message,error=false){const n=$('#notice');n.textContent=message;n.classList.toggle('error',error);n.setAttribute('role',error?'alert':'status');n.setAttribute('aria-live',error?'assertive':'polite');n.hidden=false;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){n.getAnimations().forEach(a=>a.cancel());n.animate([{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'none'}],{duration:180,easing:'ease-out'});}}
function save(){derived=rebuild(data);try{localStorage.setItem('locknight-v1',JSON.stringify({data,isDemo,attendance,showStats}));}catch{notify('Changes could not be saved in this browser. Export JSON to keep them.',true);}}
function refresh(){
 const poolScroll=root.querySelector('.players-pool')?.scrollTop??0;
 const focused=document.activeElement;
 let focusSelector='';
 if(root.contains(focused)){
   if(focused.dataset.attendance)focusSelector=`[data-attendance="${CSS.escape(focused.dataset.attendance)}"][data-status="${CSS.escape(focused.dataset.status)}"]`;
   else if(focused.id)focusSelector=`#${CSS.escape(focused.id)}`;
   else for(const key of ['hero','pref','name','attendance','manual','pick','action','correct','randomHero','choicePlayer','preferences']){
     if(focused.dataset[key]){const attribute=key.replace(/[A-Z]/g,c=>`-${c.toLowerCase()}`);focusSelector=`[data-${attribute}="${CSS.escape(focused.dataset[key])}"]`;break;}
   }
 }
 derived=rebuild(data);
 $('#mode-badge').textContent=isDemo?'Demo data':'Your data';$('#mode-badge').hidden=!isDemo;
 $('#page-title').textContent=headings[tab][0];$('#page-description').textContent='';$('#page-description').hidden=true;
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 root.innerHTML=({draft:renderDraft,roster:renderRoster,history:renderHistory,reports:renderReports,data:renderData}[tab])();
 if(tab==='draft')filterPool();applyTooltips();
 const pool=root.querySelector('.players-pool');if(pool)pool.scrollTop=poolScroll;
 if(focusSelector){
   const target=root.querySelector(focusSelector)??(focused.dataset.pick?root.querySelector('[data-pick],#ban-hero,[data-action="random-heroes"]'):null);
   target?.focus({preventScroll:true});
 }
}
const player=id=>data.players.find(p=>p.id===id);
const initials=p=>esc(p.name.split(/[\s_-]+/).map(w=>w[0]).slice(0,2).join('').toUpperCase());
const patchOptions=(value,all=false)=>(all?`<option value="all" ${value==='all'?'selected':''}>All patches</option>`:'')+[...data.patches].sort((a,b)=>Date.parse(b.effectiveAt)-Date.parse(a.effectiveAt)).map(p=>`<option value="${esc(p.id)}" ${p.id===value?'selected':''}>${esc(p.label)}</option>`).join('');
const heroOptions=(value,banned=[])=>'<option value="">Select hero</option>'+heroes.filter(h=>!banned.includes(h.id)).map(h=>`<option value="${h.id}" ${value===h.id?'selected':''}>${esc(h.name)}</option>`).join('');
const snapshot=teams=>({amberProbability:estimate(teams,derived.overall,data.ratingMetadata.parameters),ratings:Object.fromEntries(Object.values(teams).flat().map(id=>[id,{...derived.overall[id]}]))});
function filterPool(){
 const container=root.querySelector('.players-pool');if(!container)return;
 const rows=[...container.querySelectorAll('.pool-player')];
 rows.forEach(row=>{row.hidden=!player(row.dataset.player).name.toLowerCase().includes(search.toLowerCase());});
 let message=container.querySelector('.no-results');
 if(rows.length&&!message){message=document.createElement('p');message.className='help no-results';message.textContent='No matching players.';container.append(message);}
 if(message)message.hidden=rows.some(row=>!row.hidden);
}
const tip=key=>`data-tooltip="${key}"`;
function applyTooltips(){
 root.querySelectorAll('label[for][data-tooltip]').forEach(el=>{const control=document.getElementById(el.htmlFor);if(control)control.dataset.tooltip=el.dataset.tooltip;});
 root.querySelectorAll('[data-tooltip]').forEach(el=>{
   if(el.matches('h2,h3,.count,.rating,.metric,.pool-footer,.balance-meter'))el.tabIndex=0;
 });
 root.querySelectorAll('[data-hero]').forEach(el=>{el.dataset.tooltip='hero';});
}
function animateAction(ids,type='placement'){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 ids.forEach((id,i)=>{
   const slot=root.querySelector(`[data-slot-player="${CSS.escape(id)}"]`);if(!slot)return;
   slot.getAnimations().forEach(a=>a.cancel());
   const hero=draft?.heroes[id],effect=motion.heroEffects[hero]??motion.defaultEffect;
   const frames=type==='placement'?[
     {transform:'translateY(-30px) scale(1.035)',opacity:0},
     {transform:'translateY(3px) scale(.985)',opacity:1,offset:.7},
     {transform:'translateY(0) scale(1)',opacity:1}
   ]:heroFrames(effect);
   slot.dataset.effect=type==='placement'?'slam':effect;
   slot.animate(frames,{duration:type==='placement'?motion.placementMs:motion.heroMs,delay:i*motion.staggerMs,easing:'cubic-bezier(.2,.8,.2,1)'});
 });
}
function heroFrames(effect){
 const base={transform:'none',filter:'none',boxShadow:'none',opacity:1};
 const effects={
   impact:{transform:'scale(1.025) translateY(2px)'},slam:{transform:'translateY(-14px)'},
   flame:{boxShadow:'inset 5px 0 #fb923c',filter:'brightness(1.3)'},frost:{boxShadow:'inset 5px 0 #7dd3fc',filter:'brightness(1.15)'},
   spark:{boxShadow:'inset 5px 0 #c4b5fd',transform:'translateX(3px)'},fade:{opacity:.25,filter:'blur(3px)'},
   orbit:{transform:'perspective(500px) rotateY(8deg)'},leaf:{transform:'rotate(-1.5deg)',boxShadow:'inset 5px 0 #86efac'},
   spirit:{boxShadow:'inset 5px 0 #e9d5ff',filter:'brightness(1.4)'},rewind:{transform:'translateX(-12px)'},
   ooze:{transform:'scaleX(1.035) scaleY(.94)',boxShadow:'inset 5px 0 #a3e635'},slash:{transform:'skewX(-4deg) translateX(7px)'},
   rise:{transform:'translateY(10px)',opacity:.4},portal:{transform:'perspective(500px) rotateY(-15deg)',opacity:.5},
   gear:{transform:'rotate(.8deg)',boxShadow:'inset 5px 0 #fbbf24'},pulse:{boxShadow:'inset 4px 0 var(--t-cta)',filter:'brightness(1.2)'}
 };
 return [base,{...base,...(effects[effect]??effects.pulse),offset:.35},base];
}
function renderDraft(){
 const complete=draft&&draft.teams.amber.length===6&&draft.teams.sapphire.length===6,current=draft?.actions?.[draft.step],prob=complete?draft.snapshot.amberProbability:.5;
 const ready=complete&&!current&&Object.keys(draft.heroes).length===12&&new Set(Object.values(draft.heroes)).size===12&&patchId;
 const captainOptions=v=>'<option value="">Choose captain</option>'+data.players.filter(p=>selected.has(p.id)).map(p=>`<option value="${p.id}" ${p.id===v?'selected':''}>${esc(p.name)}</option>`).join('');
 const assigned=draft?Object.values(draft.teams).flat():[];
 return `<div class="draft-status" ${showStats?'':'hidden'}>${data.matches.length} matches recorded</div>
 <div class="draft-layout ${showStats?'':'stats-hidden'}"><div class="panel players-panel"><div class="panel-head"><h2 ${tip('pool')}>Player pool</h2><span class="count">${selected.size} ready</span></div>
 <div class="pool-tools"><input id="pool-search" type="search" aria-label="Search player pool" placeholder="Search players…" value="${esc(search)}"/><button class="button small" data-action="select12" ${tip('select12')}>Select 12</button></div>
 <div class="players-pool">${data.players.map(p=>{const status=attendance[p.id]??(p.enabled?'ready':'away');return `<div class="pool-player ${assigned.includes(p.id)?'assigned':''}" data-player="${p.id}" draggable="${selected.has(p.id)&&!assigned.includes(p.id)}" ${tip('drag')}><span class="avatar" aria-hidden="true">${initials(p)}</span><span class="pool-name"><span class="player-name">${esc(p.name)}</span>${showStats?`<span class="player-sub">${derived.stats[p.id].games} matches · ${num(ordinal(derived.overall[p.id]))}</span>`:''}</span><div class="availability-buttons" role="group" aria-label="Availability for ${esc(p.name)}" data-attendance-player="${p.id}" data-status="${status}">${[['ready','Ready'],['sitout','Sit out'],['away','Away']].map(([v,l])=>`<button type="button" data-attendance="${p.id}" data-status="${v}" aria-label="${l}: ${esc(p.name)}" aria-pressed="${status===v}" ${tip('attendance')}>${l}</button>`).join('')}</div></div>`;}).join('')||'<div class="empty-state">No players. Add players under Players.</div>'}</div></div>
 <div class="draft-main"><div class="panel"><div class="draft-controls"><div class="field"><label for="draft-mode" ${tip('mode')}>Mode</label><select id="draft-mode">${config.modes.map(({id,label})=>`<option value="${id}" ${mode===id?'selected':''}>${label}</option>`).join('')}</select></div><div class="field"><label for="draft-patch" ${tip('patch')}>Patch</label><select id="draft-patch"><option value="">Choose patch</option>${patchOptions(patchId)}</select></div><button class="button primary" data-action="draft" ${selected.size<12?'disabled':''}>${draft?'Redraft':'Draft teams'}</button></div>
 ${mode==='captains'?`<div class="draft-controls captain-controls"><div class="field"><label for="draft-format">Pick order</label><select id="draft-format">${[['simple','Simple Draft'],['one-ban','One Ban Draft'],['two-ban','Two Ban Draft']].map(([v,l])=>`<option value="${v}" ${format===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label for="captain-amber">Amber captain</label><select id="captain-amber">${captainOptions(draft?.captains?.amber)}</select></div><div class="field"><label for="captain-sapphire">Sapphire captain</label><select id="captain-sapphire">${captainOptions(draft?.captains?.sapphire)}</select></div><button data-action="random-captains" class="button small">Random captains</button></div><div class="controls-bottom"><label ${tip('firstBan')}>First ban <select id="first-ban"><option value="amber" ${firstBan==='amber'?'selected':''}>Amber</option><option value="sapphire" ${firstBan==='sapphire'?'selected':''}>Sapphire</option></select></label></div>`:''}
 <div class="controls-bottom">${mode==='balanced'?`<label for="balance-bias" ${tip('bias')}>Balance preference <input id="balance-bias" type="range" min="0" max="1" step=".05" value="${bias}"/><span>${pct(bias)}</span></label>`:'<span></span>'}<div class="actions"><button class="button small" data-action="statistics" aria-pressed="${!showStats}" ${tip('statistics')}>${showStats?'Hide stats':'Show stats'}</button><button class="button small" data-action="presentation">Presentation</button></div></div></div>
 ${current?`<div class="draft-turn"><span class="eyebrow">${current.type==='ban'?'HERO BAN':'PLAYER PICK'} · ${draft.step+1} / ${draft.actions.length}</span><h3>${current.team==='amber'?'Amber':'Sapphire'}’s turn</h3><div class="turn-progress">${draft.actions.map((_,i)=>`<span class="${i<draft.step?'done':''}"></span>`).join('')}</div><div class="actions">${current.type==='ban'?`<select id="ban-hero" aria-label="Hero to ban">${heroOptions('',draft.banned)}</select><button class="button" data-action="ban">Ban hero</button>`:draft.pool.map(pid=>`<button class="button" data-pick="${pid}">${esc(player(pid).name)}</button>`).join('')}</div></div>`:''}
 <div class="balance-meter" ${complete&&showStats?'':'hidden'} ${tip('estimate')}><div class="balance-title"><span>Amber ${pct(prob)}</span><span>Sapphire ${pct(1-prob)}</span></div><div class="balance-track"><span style="width:${prob*100}%"></span></div></div>
 <div class="teams">${['amber','sapphire'].map(team=>`<div class="panel team ${team}"><div class="panel-head"><h2>${team==='amber'?'Amber':'Sapphire'}</h2><span class="count">${draft?.teams[team].length??0} / 6</span></div><div class="team-slots">${Array.from({length:6},(_,i)=>{const pid=draft?.teams[team][i],p=pid?player(pid):null;return `<div class="team-slot" data-drop-team="${team}" data-slot-index="${i}" ${pid?`data-slot-player="${pid}"`:''}>${p?`<span class="avatar">${initials(p)}</span><span class="slot-info"><span class="player-name">${esc(p.name)}${draft?.captains?.[team]===pid?' (captain)':''}</span>${showStats?`<span class="player-sub" ${tip('rating')}>${num(ordinal(derived.overall[pid]))} rating</span>`:''}</span>${!current?`<div class="hero-control"><select data-hero="${pid}" aria-label="Hero for ${esc(p.name)}">${heroOptions(draft.heroes[pid],draft.banned)}</select><button class="button small" data-random-hero="${pid}" aria-label="Random heroes for ${esc(p.name)}" ${tip('hero')}>↻</button>${draft.choices?.[pid]?`<div class="hero-choices">${draft.choices[pid].map(h=>`<button class="button small ${draft.heroes[pid]===h?'chosen':''}" data-choice-player="${pid}" data-choice-hero="${h}" aria-pressed="${draft.heroes[pid]===h}">${esc(heroName(h))}</button>`).join('')}</div>`:''}</div>`:''}`:`<span class="empty-slot" ${tip('drag')}>${mode==='manual'||current?.type==='pick'?'Drop player':'Unassigned'}</span>`}</div>`;}).join('')}</div></div>`).join('')}</div>
 ${draft?.mode==='manual'?`<div class="panel panel-body manual-pool"><div class="actions">${[...new Set([...selected,...assigned])].map(pid=>`<label class="field"><span>${esc(player(pid).name)}</span><select data-manual="${pid}" aria-label="Team for ${esc(player(pid).name)}"><option value="">Unassigned</option><option value="amber" ${draft.teams.amber.includes(pid)?'selected':''}>Amber</option><option value="sapphire" ${draft.teams.sapphire.includes(pid)?'selected':''}>Sapphire</option></select></label>`).join('')}</div></div>`:''}
 ${complete&&[...selected].some(id=>!assigned.includes(id))?`<div class="bench"><h3>Not drafted</h3>${[...selected].filter(id=>!assigned.includes(id)).map(id=>`<span>${esc(player(id).name)}</span>`).join('')}</div>`:''}
 ${draft?.banned.length?`<p class="ban-chip">Banned: ${draft.banned.map(heroName).map(esc).join(' · ')}</p>`:''}
 <div class="panel result-bar"><h3 ${tip('result')}>Record result</h3><div class="actions">${complete&&!current?`<button class="button small" data-action="random-heroes" ${tip('heroes')}>Random heroes</button>`:''}<div class="field"><label for="match-winner">Winner</label><select id="match-winner"><option value="">Select winner</option><option value="amber" ${matchWinner==='amber'?'selected':''}>Amber</option><option value="sapphire" ${matchWinner==='sapphire'?'selected':''}>Sapphire</option></select></div><button data-action="record" class="button primary" ${!ready?'disabled':''}>Record match</button></div></div></div></div>`;
}
function makeDraft(captains){
 if(selected.size<12)throw Error('At least 12 players must be ready');matchWinner='';const ids=[...selected];draft={mode:mode==='balanced'?'random':mode,teams:{amber:[],sapphire:[]},heroes:{},choices:{},banned:[],settings:{bias:mode==='random'?0:bias,format,firstBan,strategy:mode},snapshot:null};
 if(mode==='random'||mode==='balanced'){draft.teams=randomDraft(ids,derived.overall,mode==='random'?0:bias,data.ratingMetadata.parameters);draft.snapshot=snapshot(draft.teams);draft.choices=drawHeroChoices(Object.values(draft.teams).flat(),heroes);}
 if(mode==='captains'){draft.captains=captains;draft.teams={amber:[captains.amber],sapphire:[captains.sapphire]};draft.pool=ids.filter(id=>!Object.values(captains).includes(id));draft.actions=captainActions(format,firstBan);draft.step=0;}
}
function pickPlayer(pid,team){
 const action=draft?.actions?.[draft.step];
 if(!action||action.type!=='pick'||action.team!==team||!draft.pool.includes(pid))throw Error('Drop a ready player on the side whose turn it is.');
 draft.teams[team].push(pid);draft.pool=draft.pool.filter(id=>id!==pid);draft.step++;
 if(Object.values(draft.teams).every(ids=>ids.length===6))draft.snapshot=snapshot(draft.teams);
 refresh();animateAction([pid]);
}
function placePlayer(pid,team){
 if(!draft&&mode==='manual')makeDraft();
 if(!draft||draft.mode!=='manual'||!new Set([...selected,...Object.values(draft?.teams??{}).flat()]).has(pid))throw Error('Start Manual teams to place players.');
 if(draft.teams[team].includes(pid))return;
 if(team&&draft.teams[team].length>=6)throw Error('That team already has six players.');
 for(const side of ['amber','sapphire'])draft.teams[side]=draft.teams[side].filter(id=>id!==pid);
 if(team)draft.teams[team].push(pid);
 if(!team){delete draft.heroes[pid];delete draft.choices[pid];}
 draft.snapshot=Object.values(draft.teams).every(ids=>ids.length===6)?snapshot(draft.teams):null;
 refresh();if(team)animateAction([pid]);
}
function setHero(pid,h){
 if(h&&(draft.banned.includes(h)||Object.entries(draft.heroes).some(([id,hero])=>id!==pid&&hero===h)||Object.entries(draft.choices??{}).some(([id,choices])=>id!==pid&&choices.includes(h))))throw Error('That hero is assigned or reserved for another player.');
 if(h)draft.heroes[pid]=h;else delete draft.heroes[pid];
 if(h&&draft.choices?.[pid]&&!draft.choices[pid].includes(h))delete draft.choices[pid];
 refresh();if(h)animateAction([pid],'hero');
}
function randomHero(pid){
 const blocked=new Set([...draft.banned,...Object.entries(draft.heroes).filter(([id])=>id!==pid).map(([,h])=>h),...Object.entries(draft.choices??{}).filter(([id])=>id!==pid).flatMap(([,hs])=>hs)]);
 const options=shuffle(heroes.filter(h=>!blocked.has(h.id))).slice(0,config.heroChoices).map(h=>h.id);
 if(options.length<config.heroChoices)throw Error('Not enough unused heroes.');
 delete draft.heroes[pid];draft.choices[pid]=options;refresh();animateAction([pid],'hero');
}
function renderRoster(){const p=player(preferredPlayer);return `<div class="toolbar"><span class="muted">${data.players.length} players</span><form id="add-player" class="actions"><input name="name" required maxlength="80" aria-label="New player name" placeholder="Player display name"/><button class="button primary">Add player</button></form></div>
 <div class="profile-tools actions"><a class="button" href="/projects/locknight/preferences/">Player preference page ↗</a><button class="button" data-action="profile-import" ${tip('profileImport')}>Import player</button><input id="profile-file" type="file" accept=".json,application/json" hidden/>${p?'<button class="button" data-action="profile-export">Export player</button>':''}</div>
 ${pendingProfile?`<div class="profile-review panel panel-body"><h3>Import ${esc(pendingProfile.player.name)}</h3><div class="actions"><select id="profile-target" aria-label="Player to update"><option value="">Add new player</option>${data.players.map(p=>`<option value="${p.id}" ${p.id===pendingProfile.player.id?'selected':''}>Update ${esc(p.name)}</option>`).join('')}</select><button class="button primary" data-action="profile-apply">Apply preferences</button><button class="button" data-action="profile-cancel">Cancel</button></div></div>`:''}
 <div class="roster-card"><div class="panel"><div class="panel-head"><h2>Roster</h2><span class="count">${data.players.length}</span></div><div class="panel-body roster-list">${data.players.map(p=>`<div class="roster-row"><input type="text" data-name="${p.id}" value="${esc(p.name)}" aria-label="Name for ${esc(p.name)}" maxlength="80"/><button class="button small" data-preferences="${p.id}">Edit</button></div>`).join('')||'<p>No players added.</p>'}</div></div><div class="panel"><div class="panel-head"><h2 ${tip('preferences')}>${p?esc(p.name)+'’s hero preferences':'Hero preferences'}</h2></div><div class="panel-body">${p?`<div class="preferences">${heroes.map(h=>heroPreferenceButtons(h,p.preferences,'data-pref')).join('')}</div><label class="field notes-field" ${tip('notes')}><span>Notes</span><textarea id="player-notes" rows="3" maxlength="2000">${esc(p.notes??'')}</textarea></label>`:'<div class="empty-state">Select a player.</div>'}</div></div></div>`;}
function renderHistory(){const matches=[...data.matches].filter(m=>filter==='all'||m.patchId===filter).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)||b.id.localeCompare(a.id));return `<div class="toolbar"><span class="muted">${matches.length} recorded games</span><select id="patch-filter" aria-label="Filter match history by patch">${patchOptions(filter,true)}</select></div><div class="panel table-wrap">${matches.length?`<table><thead><tr><th>Match / date</th><th>Patch</th><th>Lineup</th><th>Draft / estimate</th><th>Result</th></tr></thead><tbody>${matches.map(m=>`<tr><td><span class="player-name">${esc(new Date(m.timestamp).toLocaleDateString())}</span><div class="player-sub">${esc(new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}))}</div></td><td>${esc(data.patches.find(p=>p.id===m.patchId)?.label)}</td><td><details><summary>6v6 · View teams</summary><div class="history-details">${['amber','sapphire'].map(t=>`<strong>${t==='amber'?'Amber':'Sapphire'}</strong><br/>${m.teams[t].map(pid=>`${esc(player(pid).name)} — ${esc(heroName(m.heroes[pid]))}`).join('<br/>')}`).join('<br/>')}</div></details></td><td><span class="tag">${esc(m.draft.mode)}</span><div class="player-sub">Amber ${pct(m.draft.snapshot.amberProbability)} at draft</div></td><td><select data-tooltip="correction" data-correct="${m.id}" aria-label="Winner of ${esc(m.id)}"><option value="amber" ${m.winner==='amber'?'selected':''}>Amber won</option><option value="sapphire" ${m.winner==='sapphire'?'selected':''}>Sapphire won</option></select><div class="player-sub">${m.edits.length?`${m.edits.length} correction(s)`:'Original result'}</div></td></tr>`).join('')}</tbody></table>`:'<div class="empty-state"><h2>No matches recorded.</h2>Record a result from the Draft tab.</div>'}</div>`;}
function renderChart(rows){if(!rows.length)return '<div class="empty-state">No recorded matches for this player.</div>';const min=Math.min(...rows.map(h=>ordinal(h)-h.sigma))-2,max=Math.max(...rows.map(h=>ordinal(h)+h.sigma))+2,x=i=>20+i/Math.max(1,rows.length-1)*320,y=v=>170-(v-min)/(max-min)*140;const path=rows.map((h,i)=>`${i?'L':'M'}${x(i)},${y(ordinal(h))}`).join(' '),band=rows.map((h,i)=>`${x(i)},${y(ordinal(h)+h.sigma)}`).concat([...rows].reverse().map((h,i)=>`${x(rows.length-1-i)},${y(ordinal(h)-h.sigma)}`)).join(' ');return `<svg class="chart" viewBox="0 0 360 200" role="img" aria-label="Rating timeline for ${esc(player(viewPlayer)?.name)}"><path d="M20 170H340M20 100H340M20 30H340" stroke="var(--line)" fill="none"/><polygon points="${band}" fill="var(--gold)" opacity=".1"/>${rows.map((h,i)=>i&&h.patchId!==rows[i-1].patchId?`<line x1="${x(i)}" x2="${x(i)}" y1="25" y2="175" stroke="var(--muted)" stroke-dasharray="3 4"><title>${esc(data.patches.find(p=>p.id===h.patchId)?.label)}</title></line>`:'').join('')}<path d="${path}" stroke="var(--gold)" stroke-width="2.5" fill="none"/>${rows.map((h,i)=>`<circle cx="${x(i)}" cy="${y(ordinal(h))}" r="3" fill="var(--gold)"><title>${esc(new Date(h.timestamp).toLocaleDateString())}: ${num(ordinal(h))}, μ ${num(h.mu)}, σ ${num(h.sigma)}</title></circle>`).join('')}<text x="20" y="193" fill="var(--muted)" font-size="9">${esc(new Date(rows[0].timestamp).toLocaleDateString())}</text><text x="340" y="193" text-anchor="end" fill="var(--muted)" font-size="9">${esc(new Date(rows.at(-1).timestamp).toLocaleDateString())}</text></svg>`;}
function renderReports(){const r=report(data,filter),p=player(viewPlayer),timeline=derived.history.filter(h=>h.playerId===viewPlayer&&!h.heroId),pairs=Object.values(r.pairs).sort((a,b)=>b.games-a.games).slice(0,12),rows=Object.entries(r.heroStats).filter(([k])=>k.startsWith(viewPlayer+'/'));const brier=r.predictions.length?r.predictions.reduce((a,p)=>a+(p.predicted-p.actual)**2,0)/r.predictions.length:0;
 r.players.sort((a,b)=>Number(b.games>0)-Number(a.games>0)||(a.games&&b.games?b.wins/b.games-a.wins/a.games:0)||ordinal(b.rating)-ordinal(a.rating)||a.name.localeCompare(b.name));
 return `<div class="toolbar"><span class="muted">${r.matchCount} games in this view</span><select id="patch-filter" aria-label="Filter insights by patch">${patchOptions(filter,true)}</select></div><div class="metrics"><div class="metric"><div class="eyebrow">Matches</div><div class="value">${r.matchCount}</div></div><div class="metric"><div class="eyebrow" data-tooltip="prediction">Prediction error</div><div class="value">${brier.toFixed(3)}</div></div><div class="metric"><div class="eyebrow" data-tooltip="winnerEstimate">Winner estimate</div><div class="value">${r.predictions.length?pct(r.predictions.reduce((a,p)=>a+(p.actual?p.predicted:1-p.predicted),0)/r.predictions.length):'—'}</div></div><div class="metric"><div class="eyebrow" data-tooltip="ratingModel">Rating model</div><div class="value" style="font-size:18px">OpenSkill</div></div></div><div class="insight-columns"><div class="stack"><div class="panel"><div class="panel-head"><h2>Player ratings</h2><span class="count">${r.players.length} players</span></div><div class="table-wrap"><table><thead><tr><th>Player</th><th>Rating</th><th>μ / σ</th><th>Games</th><th>Win rate</th></tr></thead><tbody>${r.players.map(p=>`<tr><td>${esc(p.name)}</td><td style="color:var(--gold)">${num(ordinal(p.rating))}</td><td class="muted">${num(p.rating.mu)} / ${num(p.rating.sigma)}</td><td>${p.games}</td><td>${p.games?pct(p.wins/p.games):'—'}</td></tr>`).join('')}</tbody></table></div></div><div class="panel"><div class="panel-head"><h2>Teammate pairs</h2><span class="count">Games played</span></div><div class="table-wrap"><table><thead><tr><th>Teammates</th><th>Games</th><th>Record</th><th>Win rate</th></tr></thead><tbody>${pairs.map(p=>`<tr><td>${p.players.map(pid=>esc(player(pid).name)).join(' + ')}</td><td>${p.games}</td><td>${p.wins}–${p.games-p.wins}</td><td>${pct(p.wins/p.games)}</td></tr>`).join('')||'<tr><td colspan="4">No pair history yet.</td></tr>'}</tbody></table></div></div></div><div class="stack"><div class="panel"><div class="panel-head"><h2 data-tooltip="timeline">Rating timeline</h2></div><div class="panel-body"><select id="view-player" aria-label="Player for rating timeline">${data.players.map(p=>`<option value="${p.id}" ${p.id===viewPlayer?'selected':''}>${esc(p.name)}</option>`).join('')}</select>${renderChart(timeline)}</div></div><div class="panel"><div class="panel-head"><h2>${p?esc(p.name)+' · heroes':'Hero records'}</h2></div><div class="table-wrap"><table><thead><tr><th>Hero</th><th>μ / σ</th><th>W–L</th></tr></thead><tbody>${rows.map(([key,s])=>{const rt=r.heroRatings[key];return `<tr><td>${esc(heroName(key.split('/')[1]))}</td><td>${num(rt.mu)} / ${num(rt.sigma)}</td><td>${s.wins}–${s.games-s.wins}</td></tr>`;}).join('')||'<tr><td colspan="3">No hero games yet.</td></tr>'}</tbody></table></div></div><button class="button small" data-tooltip="ratingModel">About ratings</button></div></div>`;
}
function renderData(){return `<div class="data-columns"><div class="stack"><div class="panel"><div class="panel-head"><h2 data-tooltip="records">JSON records</h2><span class="count">JSON v1</span></div><div class="panel-body"><div class="data-buttons"><button class="button primary" data-action="export">Export JSON</button><button class="button" data-action="import">Import JSON</button><input id="import-file" type="file" accept=".json,application/json" hidden/></div><p class="help" style="margin-top:15px">${data.players.length} players · ${data.matches.length} matches · ${data.patches.length} patches</p></div></div><div class="panel"><div class="panel-head"><h2 data-tooltip="replace">Replace records</h2></div><div class="panel-body"><div class="data-buttons"><a class="button" href="/projects/locknight/initial-records.json" download>Empty JSON</a><button class="button" data-action="fresh">Start fresh</button></div></div></div><div class="panel"><div class="panel-head"><h2>Add patch</h2></div><form class="panel-body form-grid" id="add-patch"><label class="field wide"><span>Label</span><input name="label" required maxlength="100" placeholder="e.g. October balance update"/></label><label class="field wide"><span>Effective time (UTC)</span><input name="effectiveAt" type="datetime-local" required/></label><label class="field wide"><span>Source URL</span><input name="sourceUrl" type="url" value="${patchSource}" required/></label><button class="button primary wide">Add patch</button></form></div></div><div class="panel"><div class="panel-head"><h2>Patches</h2><button class="button small" data-tooltip="patchRefresh" data-action="refresh-patches">Refresh catalog</button></div><div class="panel-body"><div class="stack" style="margin-top:20px">${[...data.patches].sort((a,b)=>Date.parse(b.effectiveAt)-Date.parse(a.effectiveAt)).map(p=>`<div style="border-bottom:1px solid var(--line);padding-bottom:15px"><h3>${esc(p.label)}</h3><p class="help">Effective ${esc(p.effectiveAt)}<br/>Refreshed ${esc(p.refreshedAt)}</p><a class="button small" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer" style="margin-top:9px">SteamDB</a></div>`).join('')||'<div class="empty-state">No patches yet. Add a patch or refresh the catalog.</div>'}</div></div></div></div>`;}
async function confirmReplace(message){$('#confirm-message').textContent=message;const dlg=$('#confirm-dialog');dlg.returnValue='cancel';dlg.showModal();return new Promise(resolve=>dlg.addEventListener('close',()=>resolve(dlg.returnValue==='confirm'),{once:true}));}
function downloadObject(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(exportData(data),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`locknight-${isDemo?'demo-':''}${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('JSON exported.');}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;$('#notice').hidden=true;refresh();}));$('#export-top').addEventListener('click',download);
root.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
 if(b.dataset.pref){player(preferredPlayer).preferences[b.dataset.pref]=Number(b.dataset.priority);save();highlightPreference(b);return;}
 if(b.dataset.preferences){preferredPlayer=b.dataset.preferences;refresh();return;}
 if(b.dataset.attendance){attendance[b.dataset.attendance]=b.dataset.status;syncReadyPool();save();refresh();return;}
 if(b.dataset.pick){pickPlayer(b.dataset.pick,draft.actions[draft.step].team);return;}
 if(b.dataset.randomHero){randomHero(b.dataset.randomHero);return;}
 if(b.dataset.choicePlayer){setHero(b.dataset.choicePlayer,b.dataset.choiceHero);return;}
 const a=b.dataset.action;
 if(a==='export'){download();return;}if(a==='import'){$('#import-file').click();return;}
 if(a==='select12'){data.players.forEach((p,i)=>attendance[p.id]=i<12?'ready':((attendance[p.id]??(p.enabled?'ready':'away'))==='away'?'away':'sitout'));syncReadyPool();save();refresh();}
 if(a==='statistics'){showStats=!showStats;save();refresh();}
 if(a==='profile-import'){$('#profile-file').click();return;}
 if(a==='profile-export'){downloadObject(playerProfile(player(preferredPlayer)),`locknight-player-${preferredPlayer}.json`);return;}
 if(a==='profile-cancel'){pendingProfile=null;refresh();return;}
 if(a==='profile-apply'){const target=$('#profile-target').value,importedId=target||pendingProfile.player.id;data=validateData(mergeProfile(data,pendingProfile,target));pendingProfile=null;syncReadyPool();preferredPlayer=importedId;save();refresh();notify('Player preferences imported.');return;}
 if(a==='presentation')document.body.classList.toggle('presentation');
 if(a==='random-captains'){const ids=shuffle([...selected]);$('#captain-amber').value=ids[0]??'';$('#captain-sapphire').value=ids[1]??'';}
 if(a==='draft'){const captains={amber:$('#captain-amber')?.value,sapphire:$('#captain-sapphire')?.value};if(mode==='captains'&&(!captains.amber||!captains.sapphire||captains.amber===captains.sapphire))throw Error('Choose two different captains');makeDraft(captains);refresh();animateAction(Object.values(draft.teams).flat());}
 if(a==='ban'){const h=$('#ban-hero').value;if(!h)throw Error('Select a hero to ban');draft.banned.push(h);draft.step++;refresh();}
 if(a==='random-heroes'){const ids=Object.values(draft.teams).flat();draft.heroes={};draft.choices=drawHeroChoices(ids,heroes,draft.banned);refresh();animateAction(ids,'hero');}
 if(a==='record'){const winner=$('#match-winner').value;if(!winner)throw Error('Select the winning team');if(!draft?.snapshot)throw Error('Finish drafting first');const match={id:uid('match'),timestamp:new Date().toISOString(),patchId,teams:structuredClone(draft.teams),heroes:{...draft.heroes},winner,draft:{mode:draft.mode,settings:{...draft.settings,bannedHeroes:[...draft.banned],captains:draft.captains??null,heroOptions:structuredClone(draft.choices),readyPlayers:[...new Set([...selected,...Object.values(draft.teams).flat()])]},snapshot:draft.snapshot},edits:[]};data=validateData({...data,matches:[...data.matches,match]});for(const p of data.players)if(attendance[p.id]==='sitout'&&!Object.values(draft.teams).flat().includes(p.id))attendance[p.id]='ready';save();resetSelection();refresh();notify('Match recorded.');}
 if(a==='fresh'){if(await confirmReplace('Clear the roster and match records? Export a backup first to keep them.')){data=validateData(newWorkspaceData());isDemo=false;filter='all';attendance={};resetSelection();save();refresh();notify('Records cleared. Add players.');}}
 if(a==='refresh-patches'){b.disabled=true;try{const response=await fetch('/projects/locknight/patch-catalog.json',{cache:'no-store'});if(!response.ok)throw Error('Catalog unavailable');const catalog=await response.json();if(!Array.isArray(catalog.patches)||!catalog.patches.length)throw Error('No synchronized patches available');const map=new Map(data.patches.map(p=>[p.id,p]));for(const p of catalog.patches)map.set(p.id,p);data=validateData({...data,patches:[...map.values()]});patchId=latestPatch(data)?.id??patchId;save();refresh();notify('Patch catalog refreshed.');}catch(err){b.disabled=false;throw Error(`${err.message}. Existing patches kept. Add a patch manually or try again later.`);}}
 }catch(err){notify(err.message,true);}});
root.addEventListener('input',e=>{if(e.target.id==='pool-search'){search=e.target.value;filterPool();}if(e.target.id==='balance-bias'){bias=Number(e.target.value);e.target.nextElementSibling.textContent=pct(bias);}});
root.addEventListener('change',async e=>{const el=e.target;try{
 if(el.id==='draft-mode'){mode=el.value;draft=null;refresh();}if(el.id==='draft-format'){format=el.value;draft=null;refresh();}if(el.id==='first-ban'){firstBan=el.value;draft=null;refresh();}if(el.id==='draft-patch'){patchId=el.value;refresh();}if(el.id==='match-winner')matchWinner=el.value;
 if(el.dataset.hero){setHero(el.dataset.hero,el.value);}
 if(el.dataset.manual){placePlayer(el.dataset.manual,el.value);}
 if(el.id==='profile-file'){const file=el.files[0];if(!file)return;if(file.size>1024*1024)throw Error('Player file must be smaller than 1 MB');pendingProfile=validateProfile(JSON.parse(await file.text()));refresh();}
 if(el.dataset.name){const p=player(el.dataset.name);if(!el.value.trim()){el.value=p.name;throw Error('Player name cannot be empty');}p.name=el.value.trim();save();refresh();}
 if(el.id==='player-notes'){player(preferredPlayer).notes=el.value;save();}
 if(el.dataset.correct){correctWinner(data,el.dataset.correct,el.value);save();refresh();notify('Result corrected. Ratings updated.');}
 if(el.id==='patch-filter'){filter=el.value;refresh();}if(el.id==='view-player'){viewPlayer=el.value;refresh();}
 if(el.id==='import-file'){const file=el.files[0];if(!file)return;if(file.size>25*1024*1024)throw Error('Import must be smaller than 25 MB');const candidate=validateData(JSON.parse(await file.text()));if(await confirmReplace(`Replace current records with ${candidate.players.length} players and ${candidate.matches.length} matches from ${file.name}? Export a backup first to keep the current records.`)){data=candidate;isDemo=false;filter='all';attendance={};resetSelection();save();refresh();notify('Records imported. Ratings updated.');}else el.value='';}
 }catch(err){if(el.dataset.hero||el.dataset.manual)refresh();notify(err.message,true);if(el.id==='import-file'||el.id==='profile-file')el.value='';}});
root.addEventListener('submit',e=>{e.preventDefault();try{const form=e.target,f=new FormData(form);if(form.id==='add-player'){const name=String(f.get('name')).trim();if(!name)throw Error('Enter a player name');const p={id:uid('player'),name,enabled:true,preferences:{},notes:''};data.players.push(p);preferredPlayer=p.id;attendance[p.id]='ready';syncReadyPool();save();refresh();notify(`${name} added to the roster.`);}if(form.id==='add-patch'){const patch={id:uid('patch'),label:String(f.get('label')).trim(),effectiveAt:new Date(`${f.get('effectiveAt')}:00Z`).toISOString(),sourceUrl:String(f.get('sourceUrl')).trim(),refreshedAt:new Date().toISOString()};data=validateData({...data,patches:[...data.patches,patch]});patchId=latestPatch(data)?.id??patch.id;save();refresh();notify('Patch added. Effective time stored in UTC.');}}catch(err){notify(err.message,true);}});
let draggedPlayer='';
root.addEventListener('dragstart',e=>{const row=e.target.closest('[data-player]');if(!row||row.draggable!==true)return;draggedPlayer=row.dataset.player;e.dataTransfer.setData('text/plain',draggedPlayer);e.dataTransfer.effectAllowed='move';});
root.addEventListener('dragover',e=>{const slot=e.target.closest('[data-drop-team]');if(!slot||slot.dataset.slotPlayer)return;e.preventDefault();slot.classList.add('drop-target');e.dataTransfer.dropEffect='move';});
root.addEventListener('dragleave',e=>e.target.closest('[data-drop-team]')?.classList.remove('drop-target'));
root.addEventListener('drop',e=>{const slot=e.target.closest('[data-drop-team]');if(!slot)return;e.preventDefault();slot.classList.remove('drop-target');try{const pid=e.dataTransfer.getData('text/plain')||draggedPlayer;if(slot.dataset.slotPlayer)throw Error('Drop on an empty slot.');if(draft?.mode==='captains')pickPlayer(pid,slot.dataset.dropTeam);else placePlayer(pid,slot.dataset.dropTeam);}catch(err){notify(err.message,true);}draggedPlayer='';});
root.addEventListener('dragend',()=>{draggedPlayer='';root.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));});
installTooltips(root,tips);
refresh();if(storageWarning)notify(storageWarning,true);
