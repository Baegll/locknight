import catalog from '../config/heroes.json' with { type: 'json' };
export const heroes = catalog;
export const heroName = id => heroes.find(h=>h.id===id)?.name ?? id;
