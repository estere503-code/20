export type Salesperson='Richard'|'Anastasia'|'Jean-Claude';
export const salespeople:Salesperson[]=['Richard','Anastasia','Jean-Claude'];
export type Split=Record<Salesperson,number>;
export function validateSplit(s:Partial<Split>):s is Split { return salespeople.every(n=>Number.isFinite(Number(s[n]))&&Number(s[n])>=0&&Number(s[n])<=100)&&Math.round(salespeople.reduce((a,n)=>a+Number(s[n]),0)*100)===10000; }
export function calculateCommission(amount:number,split:Split){const pool=Math.round(amount*0.1*100)/100;const raw=salespeople.map(n=>({name:n,value:pool*split[n]/100}));const out=Object.fromEntries(raw.map(x=>[x.name,Math.floor(x.value*100)/100])) as Split;const remainder=Math.round((pool-Object.values(out).reduce((a,b)=>a+b,0))*100)/100;const winner=[...salespeople].sort((a,b)=>split[b]-split[a]||salespeople.indexOf(a)-salespeople.indexOf(b))[0];out[winner]=Math.round((out[winner]+remainder)*100)/100;return {pool,amounts:out};}
export function companyResult(sales:number,commission:number,expenses:number){return Math.round((sales-commission-expenses)*100)/100;}
