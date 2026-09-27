import { NextRequest, NextResponse } from 'next/server';

async function register(req: NextRequest, suppliedSecret?: string) {
  const setupSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!setupSecret || suppliedSecret !== setupSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: 'Telegram token not configured' }, { status: 500 });
  const webhookUrl = new URL('/api/telegram/webhook', req.url).toString();
  const telegram = await fetch('https://api.telegram.org/bot' + token + '/setWebhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, secret_token: setupSecret, allowed_updates: ['message'] }),
  });
  const result = await telegram.json();
  return NextResponse.json({ webhookUrl, telegram: result }, { status: telegram.ok ? 200 : 502 });
}

export async function POST(req: NextRequest) {
  return register(req, req.headers.get('x-telegram-setup-secret') ?? undefined);
}

export async function GET(req: NextRequest) {
  return register(req, new URL(req.url).searchParams.get('secret') ?? undefined);
}
