import config from '../config/draft.json';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function heroPreferenceButtons(hero,preferences,attribute){
 const current=preferences[hero.id]??0;
 return `<div class="preference"><span>${escape(hero.name)}</span><div class="priority-buttons" role="group" aria-label="${escape(hero.name)} preference">${config.preferences.map(({value,label,shortLabel})=>`<button type="button" ${attribute}="${hero.id}" data-priority="${value}" aria-label="${escape(hero.name)}: ${escape(label)}" aria-pressed="${current===value}" data-tooltip="preferences">${escape(shortLabel??label)}</button>`).join('')}</div></div>`;
}

export function highlightPreference(button){
 for(const option of button.closest('.priority-buttons').querySelectorAll('button')){
  option.setAttribute('aria-pressed',String(option===button));
 }
}
