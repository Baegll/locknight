import particles from '../config/hero-particles.json';

// Each hero combines a silhouette, palette, and trajectory. Coordinates stay
// relative to the reveal viewport so mobile and desktop use the same effect.
export function revealHeroParticles(dialog,viewport,heroId,count=28,options={}){
 const config=particles.heroes[heroId]??particles.default;
 dialog.style.setProperty('--case-color',config.colors[0]);
 dialog.classList.add('case-particle-win');
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
 const burst=document.createElement('div');burst.className='case-particles';burst.setAttribute('aria-hidden','true');viewport.append(burst);
 burst.style.setProperty('--particle-origin-y',options.originY??'40%');
 const scale=options.scale??1,finished=[];
 const royal=heroId==='rat-king',total=Math.min(96,Math.max(0,Math.floor((Number(count)||0)*(config.reveal?.particleMultiplier??1))));
 if(!total){burst.remove();return Promise.resolve();}
 if(royal)royalBurst(burst,config,scale,finished);
 for(let i=0;i<total;i++){
  const particle=document.createElement('span');particle.className='case-particle';particle.dataset.shape=royal?(i%7===0?'crown':i%3===0?'bolt':'spark'):config.shape;
  const color=config.colors[i%config.colors.length],size=config.size*Math.sqrt(scale)*(.7+Math.random()*.6);
  particle.style.setProperty('--particle-color',color);particle.style.setProperty('--particle-size',`${size}px`);burst.append(particle);
  const angle=i/total*Math.PI*2+Math.random()*.2,distance=config.distance*(.5+Math.random()*.5),x=Math.cos(angle)*distance,y=Math.sin(angle)*distance;
  const side=i%2?-1:1,jitter=(Math.random()-.5)*distance;
  let start=[0,0],mid=[x*.5,y*.5],end=[x,y];
  switch(config.motion){
   case 'rise': start=[jitter*.6,25];mid=[jitter,-distance*.45];end=[jitter+Math.sin(angle)*25,-distance];break;
   case 'fall': start=[jitter*.4,-30];mid=[x*.65,5];end=[x,distance];break;
   case 'fountain': mid=[x*.65,-distance*.65];end=[x,distance*.55];break;
   case 'sweep': mid=[side*distance*.45,jitter*.25-15];end=[side*distance,jitter*.6];break;
   case 'spiral': mid=[Math.cos(angle+1.5)*distance*.55,Math.sin(angle+1.5)*distance*.55];end=[Math.cos(angle+3)*distance,Math.sin(angle+3)*distance];break;
   case 'orbit': start=[x*.55,y*.55];mid=[-y*.8,x*.8];end=[-x,-y];break;
   case 'implode': start=[x,y];mid=[x*.4,y*.4];end=[0,0];break;
  }
  const rotation=config.shape==='spark'||config.shape==='slash'?angle*180/Math.PI:Math.random()*180;
  const transform=(point,spin,particleScale)=>`translate(calc(-50% + ${point[0]*scale}px),calc(-50% + ${point[1]*scale}px)) rotate(${spin}deg) scale(${particleScale})`;
  const effect=particle.animate([
   {transform:transform(start,rotation,.5),opacity:0},
   {transform:transform(start,rotation,1),opacity:1,offset:.08},
   {transform:transform(mid,rotation+config.spin*.5,config.shape==='smoke'?1.4:.85),opacity:.85,offset:.5},
   {transform:transform(end,rotation+config.spin,config.shape==='smoke'?2:.15),opacity:0}
  ],{duration:config.durationMs*(particles.durationScale??1)*(.85+Math.random()*.3),delay:Math.random()*(royal?500:80),easing:'cubic-bezier(.16,.7,.3,1)',fill:'both'});
  const cleanup=()=>particle.remove();
  finished.push(effect.finished.then(cleanup,cleanup));
 }
 return Promise.all(finished).then(()=>burst.remove());
}

function royalBurst(burst,config,scale,finished){
 const duration=config.reveal.durationMs;
 const animate=(element,frames,timing)=>{
  burst.append(element);const effect=element.animate(frames,{fill:'both',...timing});
  finished.push(effect.finished.then(()=>element.remove(),()=>element.remove()));
 };
 const rays=document.createElement('span');rays.className='rat-reveal-rays';rays.style.setProperty('--royal-size',`${360*scale}px`);
 animate(rays,[{transform:'translate(-50%,-50%) rotate(-25deg) scale(.15)',opacity:0},{transform:'translate(-50%,-50%) rotate(0deg) scale(1)',opacity:.8,offset:.2},{transform:'translate(-50%,-50%) rotate(65deg) scale(1.4)',opacity:0}],{duration,easing:'ease-out'});
 for(let i=0;i<config.reveal.rings;i++){
  const ring=document.createElement('span');ring.className='rat-reveal-ring';ring.style.setProperty('--royal-size',`${220*scale}px`);
  animate(ring,[{transform:'translate(-50%,-50%) scale(.08)',opacity:.9},{transform:'translate(-50%,-50%) scale(1.5)',opacity:0}],{duration:1200,delay:i*180,easing:'cubic-bezier(.12,.7,.3,1)'});
 }
 const crown=document.createElement('span');crown.className='rat-reveal-crown';crown.style.setProperty('--royal-size',`${54*scale}px`);
 animate(crown,[{transform:'translate(-50%,-50%) scale(.1) rotate(-18deg)',opacity:0},{transform:`translate(-50%,calc(-50% - ${45*scale}px)) scale(1.3) rotate(8deg)`,opacity:1,offset:.2},{transform:`translate(-50%,calc(-50% - ${65*scale}px)) scale(1) rotate(0deg)`,opacity:1,offset:.65},{transform:`translate(-50%,calc(-50% - ${100*scale}px)) scale(.8)`,opacity:0}],{duration,easing:'ease-out'});
}
