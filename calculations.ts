export type EmployeeName = 'Richard'|'Anastasia'|'Jean-Claude'|'Kevin'|'Svetlana';
export const COMMISSION_RATE = 0.10;
export const splitWeights: Record<EmployeeName, number> = { Richard: 0.35, Anastasia: 0.25, 'Jean-Claude': 0.20, Kevin: 0.20, Svetlana: 0 };
const priority: EmployeeName[] = ['Richard','Anastasia','Jean-Claude','Kevin','Svetlana'];
export function calculateCommission(amount: number, weights = splitWeights) {
  const pool = Math.round(amount * COMMISSION_RATE * 100) / 100;
  const raw = priority.map(name => ({ name, value: pool * (weights[name] ?? 0) }));
  const rounded = raw.map(x => ({ ...x, value: Math.floor(x.value * 100) / 100 }));
  let remainder = Math.round((pool - rounded.reduce((s,x)=>s+x.value,0))*100);
  const largest = [...priority].sort((a,b)=>(weights[b]??0)-(weights[a]??0) || priority.indexOf(a)-priority.indexOf(b))[0];
  const target = rounded.find(x=>x.name===largest)!;
  target.value = Math.round((target.value + remainder / 100) * 100) / 100;
  return { pool, splits: Object.fromEntries(rounded.map(x=>[x.name,x.value])) as Record<EmployeeName,number> };
}
export function calculateCompanyResult(sales: number, commissions: number, expenses: number) { return Math.round((sales-commissions-expenses)*100)/100; }
export function calculateProjectResult(sales: number, commissions: number, expenses: number) { return calculateCompanyResult(sales,commissions,expenses); }
