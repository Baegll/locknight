const loadedSources=new Map();

export function heroPortraitSources(hero){
 const file=name=>`https://deadlock.wiki/Special:Redirect/file/${encodeURIComponent(name)}?width=160`;
 return [...new Set([loadedSources.get(hero.id),hero.portrait,hero.portraitSource,file(`${hero.name}_card.png`),file(`${hero.name}.png`),...(hero.id==='rat-king'?[file('Rat King Render.png')]:[])].filter(Boolean))];
}

export function loadHeroPortrait(hero,container){
 const sources=heroPortraitSources(hero),img=document.createElement('img');img.alt='';img.decoding='async';let index=0;
 const ready=new Promise(resolve=>{
  img.addEventListener('load',()=>{loadedSources.set(hero.id,sources[index]);container.classList.add('portrait-loaded');resolve();},{once:true});
  img.addEventListener('error',()=>{if(++index<sources.length)img.src=sources[index];else{img.remove();resolve();}});
 });
 img.src=sources[0];container.append(img);return ready;
}
