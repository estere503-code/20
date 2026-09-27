const euro=(value:number)=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(Number(value)||0);
const pct=(value:number)=>Number(value||0).toString();
const sameSplit=(a:any,b:any)=>['Richard','Anastasia','Jean-Claude'].every(name=>Number(a?.[name]??0)===Number(b?.[name]??0));

export function submissionMessage(row:any){
  const detail=row.kind==='sale'?'project: '+(row.project?.name??row.project??'not specified'):'proposed allocation: '+(row.proposed_allocation??'not specified');
  return 'Recorded '+row.reference+' — '+(row.kind==='sale'?'Sale':'Expense')+' '+euro(row.amount)+' — '+detail+' — status: '+row.status+'.';
}

export function saleApprovalMessage(before:any,after:any){
  const proposed=before.proposed_split??{};
  const final=after.approved_split??{};
  const amounts=after.commission_amounts??{};
  const changed=!sameSplit(proposed,final);
  const lead=changed?'commission split changed.':'approved.';
  const person=(name:string)=>changed?name+': '+pct(proposed[name])+'% → '+pct(final[name])+'% ('+euro(amounts[name])+')':name+': '+pct(final[name])+'% ('+euro(amounts[name])+')';
  return 'Sale '+before.reference+' '+lead+' Sale '+euro(before.amount)+'; total commission '+euro(after.commission_pool)+'. '+person('Richard')+'. '+person('Anastasia')+'. '+person('Jean-Claude')+'.';
}

export function expenseApprovalMessage(before:any,after:any){
  const proposed=before.proposed_allocation;
  const approved=after.approved_allocation;
  if(proposed!==approved)return 'Expense '+before.reference+' — allocation changed. '+euro(before.amount)+': '+before.description+'. Proposed: '+proposed+'. Approved: '+approved+'.';
  return 'Expense '+before.reference+' — allocation confirmed. '+euro(before.amount)+': '+before.description+'. Approved: '+approved+'.';
}

export async function notify(chatId:number|undefined,text:string){if(!chatId)return {ok:false,error:'No Telegram recipient linked'};const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)return {ok:false,error:'Telegram token not configured'};try{const r=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chatId,text})});if(!r.ok)throw new Error(await r.text());return {ok:true}}catch(e){return {ok:false,error:e instanceof Error?e.message:'Telegram notification failed'}}}
