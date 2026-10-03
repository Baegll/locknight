import catalog from '../config/heroes.json' with { type: 'json' };
export const allHeroes = catalog;
export const heroes = catalog.filter(h=>h.active!==false);
export const heroName = id => allHeroes.find(h=>h.id===id)?.name ?? id;
