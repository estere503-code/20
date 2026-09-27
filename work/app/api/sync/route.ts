import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { syncTransaction } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sup = db();
    let query = sup.from('transactions').select('*');
    if (body.reference) query = query.eq('reference', String(body.reference).toUpperCase());
    const { data, error } = await query;
    if (error) throw error;
    const results = [];
    for (const row of data ?? []) {
      const { data: run } = await sup.from('sync_runs').insert({ reference: row.reference, status: 'running', attempts: 1 }).select().single();
      try {
        await syncTransaction(row);
        await sup.from('sync_runs').update({ status: 'complete', completed_at: new Date().toISOString(), error: null }).eq('id', run?.id);
        await sup.from('transactions').update({ sync_status: 'synced', sync_error: null }).eq('id', row.id);
        results.push({ reference: row.reference, status: 'complete' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'sync error';
        await sup.from('sync_runs').update({ status: 'failed', error: message }).eq('id', run?.id);
        await sup.from('transactions').update({ sync_status: 'failed', sync_error: message }).eq('id', row.id);
        results.push({ reference: row.reference, status: 'failed', error: message });
      }
    }
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sync failure' }, { status: 500 });
  }
}
