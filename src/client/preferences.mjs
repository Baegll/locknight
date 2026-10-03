import {heroes} from '../lib/catalog.mjs';
import {playerProfile,validateProfile} from '../lib/profile.mjs';
import config from '../config/draft.json';
import tips from '../config/tooltips.json';
import {installTooltips} from './tooltips.mjs';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let p={id:`player-${crypto.randomUUID()}`,name:'',preferences:{},notes:''};
try{const saved=localStorage.getItem('locknight-profile-v1');if(saved)p=validateProfile(JSON.parse(saved)).player;}catch{}
function render(){
 $('#profile-name').value=p.name;$('#profile-notes').value=p.notes;
 $('#profile-preferences').innerHTML=heroes.map(h=>`<label class="preference"><span>${esc(h.name)}</span><select data-profile-hero="${h.id}" aria-label="${esc(h.name)} preference" data-tooltip="preferences">${config.preferences.map(({value,label})=>`<option value="${value}" ${(p.preferences[h.id]??0)===value?'selected':''}>${value} · ${label}</option>`).join('')}</select></label>`).join('');
 $('.profile-page h1').dataset.tooltip='profile';$('.profile-page h1').tabIndex=0;$('#profile-notes').dataset.tooltip='notes';
 update();
}
function update(){
 const value={type:'locknight-player',schemaVersion:1,player:p};
 $('#profile-json').value=JSON.stringify(value,null,2);
 try{localStorage.setItem('locknight-profile-v1',JSON.stringify(value));}catch{}
}
function notice(message,error=false){const el=$('#profile-notice');el.hidden=false;el.textContent=message;el.classList.toggle('error',error);el.setAttribute('role',error?'alert':'status');}
$('#profile-form').addEventListener('input',e=>{if(e.target.id==='profile-name')p.name=e.target.value;if(e.target.id==='profile-notes')p.notes=e.target.value;if(e.target.dataset.profileHero)p.preferences[e.target.dataset.profileHero]=Number(e.target.value);update();});
$('#profile-form').addEventListener('submit',e=>{e.preventDefault();try{
 const profile=playerProfile(p),url=URL.createObjectURL(new Blob([JSON.stringify(profile,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=`locknight-player-${p.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Send this JSON file to the lobby leader.');
}catch(err){notice(err.message,true);}});
$('#load-profile').addEventListener('click',()=>$('#profile-upload').click());
$('#profile-upload').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1024*1024)throw Error('Player file must be smaller than 1 MB.');p=validateProfile(JSON.parse(await file.text())).player;render();notice('Preferences loaded.');}catch(err){notice(err.message,true);}finally{e.target.value='';}});
installTooltips($('.locknight'),tips);render();
