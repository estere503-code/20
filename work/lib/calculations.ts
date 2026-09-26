export type Salesperson='Richard'|'Anastasia'|'Jean-Claude';
export const salespeople:Salesperson[]=['Richard','Anastasia','Jean-Claude'];
export type Split=Record<Salesperson,number>;
export function validateSplit(s:Partial<Split>):s is Split { return salespeople.every(n=>Number.isFinite(Number(s[n]))&&Number(s[n])>=0&&Number(s[n])<=100)&&Math.round(salespeople.reduce((a,n)=>a+Number(s[n]),0)*100)===10000; }
export function calculateCommission(amount:number,split:Split){const pool=Math.round(amount*0.1*100)/100;const out:Split={Richard:Math.floor(pool*split.Richard)/100,Anastasia:Math.floor(pool*split.Anastasia)/100,'Jean-Claude':Math.floor(pool*split['Jean-Claude'])/100};const remainder=Math.round((pool-(out.Richard+out.Anastasia+out['Jean-Claude']))*100)/100;const winner=salespeople.slice().sort((a,b)=>split[b]-split[a]||salespeople.indexOf(a)-salespeople.indexOf(b))[0];out[winner]=Math.round((out[winner]+remainder)*100)/100;return {pool,amounts:out};}
export function companyResult(sales:number,commission:number,expenses:number){return Math.round((sales-commission-expenses)*100)/100;}
