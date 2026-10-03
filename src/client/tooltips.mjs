export function installTooltips(root, tips) {
  const bubble=document.createElement('div');bubble.className='ln-tooltip';bubble.id='ln-tooltip';bubble.role='tooltip';bubble.hidden=true;document.body.append(bubble);
  let current=null,timer,hideTimer;
  function hide(){clearTimeout(timer);clearTimeout(hideTimer);if(current){current.removeAttribute('aria-describedby');current=null;}bubble.hidden=true;}
  function show(el){
    const text=tips[el.dataset.tooltip];if(!text)return;
    hide();current=el;bubble.textContent=text;bubble.hidden=false;el.setAttribute('aria-describedby',bubble.id);
    const rect=el.getBoundingClientRect();
    bubble.style.left=`${Math.max(8,Math.min(rect.left,innerWidth-bubble.offsetWidth-8))}px`;
    bubble.style.top=`${Math.max(8,Math.min(rect.bottom+8,innerHeight-bubble.offsetHeight-8))}px`;
  }
  root.addEventListener('pointerover',e=>{clearTimeout(hideTimer);const el=e.target.closest('[data-tooltip]');if(el&&el!==current){clearTimeout(timer);timer=setTimeout(()=>show(el),350);}});
  root.addEventListener('pointerout',e=>{if(!e.relatedTarget||!e.target.closest('[data-tooltip]')?.contains(e.relatedTarget)){clearTimeout(timer);hideTimer=setTimeout(hide,120);}});
  bubble.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
  bubble.addEventListener('pointerleave',hide);
  root.addEventListener('focusin',e=>{const el=e.target.closest('[data-tooltip]');if(el)show(el);});
  root.addEventListener('focusout',hide);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  document.addEventListener('scroll',hide,true);
  new MutationObserver(()=>{if(current&&!current.isConnected)hide();}).observe(root,{childList:true,subtree:true});
}
