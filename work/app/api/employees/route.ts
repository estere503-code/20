import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await db().from('employees').select('id,name,role,telegram_user_id,telegram_chat_id').order('name');
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ employees: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (body.role !== 'Svetlana') return NextResponse.json({ error: 'Only Svetlana can manage employee links' }, { status: 403 });
  const telegramUserId = Number(body.telegram_user_id);
  if (!body.id || !Number.isSafeInteger(telegramUserId)) return NextResponse.json({ error: 'A numeric Telegram user ID is required' }, { status: 400 });
  const { data, error } = await db().from('employees').update({ telegram_user_id: telegramUserId, telegram_chat_id: telegramUserId }).eq('id', body.id).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ employee: data });
}
