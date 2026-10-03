// Two-team, equal-participation specialization of OpenSkill's MIT licensed
// Plackett-Luce model. Source inspected 2026-10-03:
// https://github.com/philihp/openskill.js/blob/main/src/models/plackett-luce.ts
// https://github.com/philihp/openskill.js/blob/main/src/util.ts
// https://github.com/philihp/openskill.js/blob/main/src/rate.ts
// License retained in src/vendor/openskill/LICENSE. No ties or individual stats.
import defaults from '../config/ratings.json' with { type: 'json' };
export const parameters = defaults;
export const rating = (p=parameters) => ({mu:p.mu,sigma:p.sigma});
export const ordinal = r => r.mu - 3*r.sigma;
const sum = xs=>xs.reduce((a,b)=>a+b,0);
export function rateTeams(teams,winner,p=parameters) {
  const processed = teams.map(t=>t.map(r=>({...r,sigma:Math.sqrt(r.sigma**2+p.tau**2)})));
  const means=processed.map(t=>sum(t.map(r=>r.mu)));
  const variances=processed.map(t=>sum(t.map(r=>r.sigma**2)));
  const c=Math.sqrt(sum(variances)+2*p.beta**2);
  const winShare=1/(1+Math.exp((means[1-winner]-means[winner])/c));
  return processed.map((team,i)=>{
    const omega=(i===winner?1:-1)*(1-winShare)*variances[i]/c;
    const delta=winShare*(1-winShare)*variances[i]/c**2*Math.sqrt(variances[i])/c;
    return team.map(r=>({mu:r.mu+r.sigma**2/variances[i]*omega,sigma:r.sigma*Math.sqrt(Math.max(1-r.sigma**2/variances[i]*delta,0.0001))}));
  });
}
// Normal CDF approximation (absolute error < 8e-8), replacing erf dependency.
export function normalCDF(x) {
  if(x===0)return 0.5;
  const z=Math.abs(x),t=1/(1+0.2316419*z);
  const tail=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return x>0?1-tail:tail;
}
export function probability(teams,p=parameters) {
  const means=teams.map(t=>sum(t.map(r=>r.mu)));
  const variance=sum(teams.flat().map(r=>r.sigma**2))+2*p.beta**2;
  return normalCDF((means[0]-means[1])/Math.sqrt(variance));
}
