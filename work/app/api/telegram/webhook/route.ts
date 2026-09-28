import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { notify } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || req.headers.get('x-telegram-bot-api-secret-token') !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const update = await req.json(); const message = update.message;
    if (!message?.text || !message.chat?.id) return NextResponse.json({ ok: true });
    const chatId = Number(message.chat.id); const senderId = Number(message.from?.id ?? -1); const text = String(message.text).trim(); const sup = db();
    if (Number.isInteger(update.update_id)) {
      const { error } = await sup.from('telegram_updates').insert({ update_id: update.update_id });
      if (error?.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
      if (error) return NextResponse.json({ error: 'Unable to record Telegram update' }, { status: 500 });
    }
    const { data: employee } = await sup.from('employees').update({ telegram_chat_id: chatId }).eq('telegram_user_id', senderId).select('id,name,telegram_chat_id').single();
    if (!employee) { await notify(chatId, 'This Telegram account is not linked to an employee. Ask Svetlana to link your Telegram user ID in Telegram setup.'); return NextResponse.json({ error: 'Telegram user is not linked to an employee' }, { status: 403 }); }
    if (employee.name === 'Svetlana') return NextResponse.json({ error: 'Manager accounts cannot submit transactions' }, { status: 403 });
    if (/^\/(start|help)(?:@\w+)?$/i.test(text)) { await notify(chatId, 'Friends Included Finance commands:\n/start — show connection status\n/help — show this help\nSale: S92764 | customer | description | Project A | 500 | 50/30/20\nExpense: E92764 | description | Materials | 80 | Project A\nAlso accepted: S92764 500 Project A description'); return NextResponse.json({ ok: true }); }
    const simpleSale = text.match(/^(S\d+)\s+([0-9]+(?:\.[0-9]{1,2})?)\s+(Project A|Project B)\s+(.+)$/i);
    const simpleExpense = text.match(/^(E\d+)\s+([0-9]+(?:\.[0-9]{1,2})?)\s+(Materials|Travel|Other)\s+(A|B|Project A|Project B|Company overhead)\s+(.+)$/i);
    const sale = text.match(/^(S\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(Project A|Project B)\s*\|\s*([0-9]+(?:\.[0-9]{1,2})?)\s*\|\s*([0-9]+)\/([0-9]+)\/([0-9]+)$/i);
    const expense = text.match(/^(E\d+)\s*\|\s*(.+?)\s*\|\s*(Materials|Travel|Other)\s*\|\s*([0-9]+(?:\.[0-9]{1,2})?)\s*\|\s*(Project A|Project B|Company overhead)$/i);
    if (simpleSale) { const [,reference,amount,project,description] = simpleSale; return proxy(req,{role:employee.name,reference,kind:'sale',customer:'Telegram customer',description,project,amount:Number(amount),split:{Richard:50,Anastasia:30,'Jean-Claude':20},source:'telegram',telegram_chat_id:chatId}); }
    if (simpleExpense) { const [,reference,amount,category,allocation,description] = simpleExpense; const finalAllocation = allocation.toUpperCase()==='A'?'Project A':allocation.toUpperCase()==='B'?'Project B':allocation; return proxy(req,{role:employee.name,reference,kind:'expense',description,category,amount:Number(amount),proposedAllocation:finalAllocation,source:'telegram',telegram_chat_id:chatId}); }
    if (sale) { const [,reference,customer,description,project,amount,r,a,j] = sale; return proxy(req,{role:employee.name,reference,kind:'sale',customer,description,project,amount:Number(amount),split:{Richard:Number(r),Anastasia:Number(a),'Jean-Claude':Number(j)},source:'telegram',telegram_chat_id:chatId}); }
    if (expense) { const [,reference,description,category,amount,allocation] = expense; return proxy(req,{role:employee.name,reference,kind:'expense',description,category,amount:Number(amount),proposedAllocation:allocation,source:'telegram',telegram_chat_id:chatId}); }
    const error='Use S92764 | customer | description | Project A | 500 | 50/30/20 or E92764 | description | Materials | 80 | Project A'; await notify(chatId,error); return NextResponse.json({error},{status:400});
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook failure' }, { status: 500 }); }
}
async function proxy(req: NextRequest, body: any) { const url = new URL('/api/transactions', req.url); return fetch(new NextRequest(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })); }
