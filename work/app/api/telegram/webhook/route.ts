import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { notify } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update.message;
    if (!message?.text || !message.chat?.id) return NextResponse.json({ ok: true });
    const chatId = Number(message.chat.id);
    const senderId = Number(message.from?.id ?? -1);
    const text = String(message.text).trim();
    const sup = db();
    const { data: employee } = await sup.from('employees').update({ telegram_chat_id: chatId }).eq('telegram_user_id', senderId).select('id,name,telegram_chat_id').single();
    if (!employee) {
      await notify(chatId, 'This Telegram account is not linked to an employee. Ask Svetlana to link your Telegram user ID in Telegram setup.');
      return NextResponse.json({ error: 'Telegram user is not linked to an employee' }, { status: 403 });
    }
    if (text === '/start') {
      await notify(chatId, 'Connected to Friends Included Finance as ' + employee.name + '. Send S01 | customer | description | Project A | 1000 | 50/30/20 or E01 | description | Materials | 120 | Project A');
      return NextResponse.json({ ok: true });
    }
    const sale = text.match(/^(S\d{2})\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(Project A|Project B)\s+\|\s+([0-9]+(?:\.[0-9]{1,2})?)\s+\|\s+([0-9]+)\/([0-9]+)\/([0-9]+)$/i);
    const expense = text.match(/^(E\d{2})\s+(.+?)\s+\|\s+(Materials|Travel|Other)\s+\|\s+([0-9]+(?:\.[0-9]{1,2})?)\s+\|\s+(Project A|Project B|Company overhead)$/i);
    if (sale) {
      const [, reference, customer, description, project, amount, r, a, j] = sale;
      return proxy(req, { role: employee.name, employee_id: employee.id, reference, kind: 'sale', customer, description, project, amount: Number(amount), split: { Richard: Number(r), Anastasia: Number(a), 'Jean-Claude': Number(j) }, source: 'telegram', telegram_chat_id: chatId });
    }
    if (expense) {
      const [, reference, description, category, amount, allocation] = expense;
      return proxy(req, { role: employee.name, employee_id: employee.id, reference, kind: 'expense', description, category, amount: Number(amount), proposedAllocation: allocation, source: 'telegram', telegram_chat_id: chatId });
    }
    const error = 'Use S01 | customer | description | Project A | 1000 | 50/30/20 or E01 | description | Materials | 120 | Project A';
    await notify(chatId, error);
    return NextResponse.json({ error }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook failure' }, { status: 500 });
  }
}

async function proxy(req: NextRequest, body: any) {
  const url = new URL('/api/transactions', req.url);
  const response = await fetch(new NextRequest(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  if (response.status === 409 && body.reference && body.employee_id) {
    const sup = db();
    const { data: existing } = await sup.from('transactions').select('*').eq('reference', String(body.reference).toUpperCase()).eq('employee_id', body.employee_id).single();
    if (existing) {
      const { data: linked } = await sup.from('transactions').update({ source: 'telegram', telegram_chat_id: body.telegram_chat_id, notification_status: 'sent', notification_error: null }).eq('id', existing.id).select('*').single();
      await notify(Number(body.telegram_chat_id), 'Telegram retry linked to existing ' + existing.reference + '. No duplicate transaction was created.');
      return NextResponse.json({ transaction: linked ?? existing, replayed: true });
    }
  }
  if (!response.ok) {
    const payload = await response.clone().json().catch(() => ({ error: 'Telegram submission failed' }));
    await notify(Number(body.telegram_chat_id), 'Submission failed: ' + (payload.error ?? 'Please check the format and try again.'));
  }
  const payload = await response.json().catch(() => ({ error: 'Telegram submission failed' }));
  return NextResponse.json(payload, { status: response.status });
}
