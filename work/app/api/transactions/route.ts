import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { calculateCommission, salespeople, validateSplit } from '@/lib/calculations';
import { notify, expenseApprovalMessage, saleApprovalMessage, submissionMessage } from '@/lib/notifications';
import { syncTransaction } from '@/lib/sheets';

const employees=['Richard','Anastasia','Jean-Claude','Kevin','Svetlana'];
const manager='Svetlana';

async function saveDelivery(id:string,notification:any|null,sync:any){
  const update:any={sync_status:sync.ok?'synced':'failed',sync_error:sync.ok?null:sync.error};
  if(notification){update.notification_status=notification.ok?'sent':'failed';update.notification_error=notification.ok?null:notification.error;}
  await db().from('transactions').update(update).eq('id',id);
}
async function syncSafe(row:any){try{return await syncTransaction(row)}catch(e){return {ok:false,error:e instanceof Error?e.message:'Google Sheets sync failed'}}}

export async function GET(){const {data,error}=await db().from('transactions').select('*').order('created_at',{ascending:false});return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({transactions:data??[]})}

export async function POST(req:NextRequest){try{
  const b=await req.json();
  if(!employees.includes(b.role))return NextResponse.json({error:'Unknown role'},{status:400});
  if(b.kind==='sale'&&!salespeople.includes(b.role))return NextResponse.json({error:'Only salespeople can submit sales'},{status:403});
  if(b.kind==='expense'&&b.role!=='Kevin')return NextResponse.json({error:'Only Kevin can submit expenses'},{status:403});
  if(!['sale','expense'].includes(b.kind)||!b.reference||!/^([SE])\d+$/i.test(b.reference)||!Number.isFinite(Number(b.amount))||Number(b.amount)<=0||!b.description)return NextResponse.json({error:'Reference, positive amount, and description are required'},{status:400});
  if(b.kind==='sale'&&(!b.customer||!['Project A','Project B'].includes(b.project)||!validateSplit(b.split)))return NextResponse.json({error:'Sales require customer, project, and splits totaling 100%'},{status:400});
  if(b.kind==='expense'&&(!['Materials','Travel','Other'].includes(b.category)||!['Project A','Project B','Company overhead'].includes(b.proposedAllocation)))return NextResponse.json({error:'Expenses require category and allocation'},{status:400});
  const sup=db();
  const {data:employee}=await sup.from('employees').select('id,telegram_chat_id').eq('name',b.role).single();
  if(!employee)return NextResponse.json({error:'Employee not configured'},{status:400});
  const ref=String(b.reference).toUpperCase();
  const {data:existing}=await sup.from('transactions').select('id').eq('reference',ref).maybeSingle();
  if(existing)return NextResponse.json({error:'Duplicate reference'},{status:409});
  let projectId=null;if(b.project){const {data:p}=await sup.from('projects').select('id').eq('name',b.project).single();projectId=p?.id??null}
  const split=b.kind==='sale'?b.split:{Richard:0,Anastasia:0,'Jean-Claude':0};
  const c=b.kind==='sale'?calculateCommission(Number(b.amount),split):{pool:0,amounts:{}};
  const overhead=b.kind==='expense'&&b.proposedAllocation==='Company overhead';
  const row:any={reference:ref,kind:b.kind,employee_id:employee.id,project_id:projectId,customer:b.customer??null,description:b.description,category:b.category??null,amount:Math.round(Number(b.amount)*100)/100,status:b.kind==='expense'?(overhead?'approved':'awaiting_allocation'):'pending',proposed_split:split,approved_split:null,commission_pool:c.pool,commission_amounts:null,proposed_allocation:b.proposedAllocation??null,approved_allocation:overhead?'Company overhead':null,source:b.source??'web',telegram_chat_id:b.telegram_chat_id??employee.telegram_chat_id,sync_status:'pending',notification_status:'pending'};
  const {data,error}=await sup.from('transactions').insert(row).select('*').single();if(error)throw error;
  await sup.from('audit_logs').insert({transaction_id:data.id,actor_employee_id:employee.id,action:'created',after_state:data});
  const notification=await notify(row.telegram_chat_id,submissionMessage({...row,project:b.project}));
  const sync=await syncSafe({...data,employee:{name:b.role},project:b.project?{name:b.project}:undefined});
  await saveDelivery(data.id,notification,sync);
  return NextResponse.json({transaction:data,notification,sync},{status:201});
}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to create transaction'},{status:500})}}

export async function PATCH(req:NextRequest){try{
  const b=await req.json();if(b.role!==manager)return NextResponse.json({error:'Only Svetlana can approve or correct transactions'},{status:403});
  const sup=db();const {data:before}=await sup.from('transactions').select('*').eq('id',b.id).single();
  if(!before)return NextResponse.json({error:'Transaction not found'},{status:404});if(before.status==='approved')return NextResponse.json({error:'Approved transactions cannot be changed'},{status:409});
  if(before.kind==='sale'&&b.status==='approved'&&!validateSplit(b.split??before.proposed_split))return NextResponse.json({error:'Sale approval requires a valid final split'},{status:400});
  if(before.kind==='expense'&&b.status==='approved'&&!['Project A','Project B','Company overhead'].includes(b.allocation))return NextResponse.json({error:'Choose a final allocation'},{status:400});
  const managerId=(await sup.from('employees').select('id').eq('name',manager).single()).data?.id;
  const update:any={status:b.status??'approved',approved_by:managerId,approved_at:new Date().toISOString()};
  if(before.kind==='sale'&&update.status==='approved'){const c=calculateCommission(Number(before.amount),b.split??before.proposed_split);update.approved_split=b.split??before.proposed_split;update.commission_pool=c.pool;update.commission_amounts=c.amounts}
  if(before.kind==='expense'&&update.status==='approved'){update.approved_allocation=b.allocation;if(b.allocation!=='Company overhead'){const {data:p}=await sup.from('projects').select('id').eq('name',b.allocation).single();update.project_id=p?.id??before.project_id}}
  const {data,error}=await sup.from('transactions').update(update).eq('id',b.id).select('*').single();if(error)throw error;
  await sup.from('audit_logs').insert({transaction_id:b.id,actor_employee_id:managerId,action:update.status,before_state:before,after_state:data});
  const overhead=before.kind==='expense'&&update.status==='approved'&&update.approved_allocation==='Company overhead';
  let notification:any=null;
  if(update.status==='approved'&&!overhead){notification=await notify(before.telegram_chat_id,before.kind==='sale'?saleApprovalMessage(before,data):expenseApprovalMessage(before,data));}
  if(update.status==='rejected')notification=await notify(before.telegram_chat_id,'Transaction '+before.reference+' rejected.');
  const employeeName=(await sup.from('employees').select('name').eq('id',before.employee_id).single()).data?.name??'';
  const sync=await syncSafe({...before,...data,employee:{name:employeeName},project:data.project_id?{name:b.allocation??''}:undefined});
  await saveDelivery(b.id,notification,sync);
  return NextResponse.json({transaction:data,notification,sync});
}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to update transaction'},{status:500})}}
