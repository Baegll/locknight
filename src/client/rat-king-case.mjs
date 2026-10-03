import {shuffle} from '../lib/draft.mjs';
import {revealHeroParticles} from './hero-particles.mjs';
import {loadHeroPortrait} from './hero-portraits.mjs';

function portrait(hero,art){
 const fallback=document.createElement('span');fallback.className='case-initials';fallback.textContent=hero.name.split(/\s+/).map(word=>word[0]).slice(0,2).join('');art.append(fallback);
 return loadHeroPortrait(hero,art);
}

export async function openRatKingCase(pool,config){
 if(!pool.length)throw Error('No heroes available for this roll.');
 const winner=config.forceRatKing?pool.find(hero=>hero.id==='rat-king'):shuffle(pool)[0];
 if(!winner)throw Error('Rat King is unavailable for the forced roll.');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const dialog=document.createElement('dialog');dialog.className='rat-case-dialog';
 const heading=document.createElement('h2');heading.id='rat-case-title';heading.textContent='Random for Rat King';
 dialog.setAttribute('aria-labelledby',heading.id);
 const viewport=document.createElement('div');viewport.className='case-viewport';viewport.setAttribute('aria-hidden','true');
 const reel=document.createElement('div');reel.className='case-reel';viewport.append(reel);
 const result=document.createElement('p');result.className='case-result';result.setAttribute('aria-live','polite');result.textContent='Rolling…';
 const attribution=document.createElement('a');attribution.href='https://deadlock.wiki/Heroes';attribution.target='_blank';attribution.rel='noopener noreferrer';attribution.textContent='Hero artwork: The Deadlock Wiki';attribution.className='case-credit';
 const close=document.createElement('button');close.type='button';close.className='button';close.textContent='Close';close.addEventListener('click',()=>dialog.close());
 dialog.append(heading,viewport,result,attribution,close);document.body.append(dialog);
 let animation;
 dialog.addEventListener('close',()=>{animation?.cancel();for(const effect of dialog.getAnimations({subtree:true}))effect.cancel();dialog.remove();},{once:true});
 const index=config.targetIndex,total=config.cards,portraits=[];
 if(!Number.isInteger(total)||!Number.isInteger(index)||index<1||index>=total||!Number.isFinite(config.durationMs)||config.durationMs<0){dialog.remove();throw Error('Invalid case animation configuration.');}
 for(let i=0;i<total;i++){
  const hero=i===index?winner:shuffle(pool)[0],card=document.createElement('div');card.className='case-card';card.dataset.hero=hero.id;
  const art=document.createElement('div');art.className='case-art';portraits.push(portrait(hero,art));
  const label=document.createElement('span');label.textContent=hero.name;card.append(art,label);reel.append(card);
 }
 dialog.showModal();
 result.textContent='Loading heroes…';
 let loadTimeout;
 await Promise.race([Promise.all(portraits),new Promise(resolve=>{loadTimeout=setTimeout(resolve,2500);})]);
 clearTimeout(loadTimeout);if(!dialog.open)return;result.textContent='Rolling…';
 const target=reel.children[index],destination=viewport.clientWidth/2-target.offsetLeft-target.offsetWidth/2;
 if(!reduced){
  const offset=(Math.random()<.5?-1:1)*target.offsetWidth*(.15+Math.random()*.23),stop=destination+offset;
  animation=reel.animate([{transform:'translateX(0)'},{transform:`translateX(${stop}px)`}],{duration:config.durationMs,easing:'cubic-bezier(.12,.82,.18,1)',fill:'forwards'});
  try{await animation.finished;}catch{return;}
  if(!dialog.open)return;
  reel.style.transform=`translateX(${stop}px)`;animation.cancel();
  animation=reel.animate([{transform:`translateX(${stop}px)`,offset:0},{transform:`translateX(${stop}px)`,offset:.35},{transform:`translateX(${destination}px)`,offset:1}],{duration:config.snapDurationMs??400,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  try{await animation.finished;}catch{return;}
  reel.style.transform=`translateX(${destination}px)`;animation.cancel();
 }else reel.style.transform=`translateX(${destination}px)`;
 if(!dialog.open)return;
 result.textContent=winner.name;target.classList.add('case-winner');
 revealHeroParticles(dialog,viewport,winner.id,config.sparkCount??28);
 if(winner.id==='rat-king'){
  dialog.classList.add('rat-king-jackpot');
  if(!reduced){
   dialog.animate([{transform:'scale(.98)'},{transform:'translateX(-5px) scale(1.015)'},{transform:'translateX(5px) scale(1.015)'},{transform:'translateX(-3px) scale(1.005)'},{transform:'none'}],{duration:600,easing:'ease-out'});
   target.animate([{transform:'scale(.85)',filter:'brightness(1.6)'},{transform:'scale(1.08)',filter:'brightness(1.2)',offset:.35},{transform:'none',filter:'none'}],{duration:850,easing:'cubic-bezier(.16,1,.3,1)'});
   result.animate([{transform:'scale(.7) translateY(8px)',opacity:0},{transform:'scale(1.12)',opacity:1,offset:.4},{transform:'none',opacity:1}],{duration:700,easing:'ease-out'});
  }
 }
 close.focus({preventScroll:true});
 return winner;
}
