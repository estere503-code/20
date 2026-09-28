'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateCommission, salespeople } from '@/lib/calculations';
import type { Transaction } from '@/lib/dashboard';

const roles = ['Richard', 'Anastasia', 'Jean-Claude', 'Kevin', 'Svetlana'];

export default function InteractiveControls({ transactions }: { transactions: Transaction[] }) {
  const router = useRouter();
  const [role, setRole] = useState('Svetlana');
  const [kind, setKind] = useState<'sale' | 'expense'>('sale');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ reference: '', customer: '', description: '', amount: '', project: 'Project A', category: 'Materials', allocation: 'Project A', Richard: 50, Anastasia: 30, 'Jean-Claude': 20 });
  const set = (key: string, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const call = async (url: string, body: unknown, method = 'POST') => {
    const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    setMessage(response.ok ? 'Saved. Server data refreshed.' : result.error || 'Request failed');
    if (response.ok) router.refresh();
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await call('/api/transactions', { role, kind, reference: form.reference, customer: form.customer, description: form.description, amount: Number(form.amount), project: form.project, category: form.category, proposedAllocation: form.allocation, split: { Richard: Number(form.Richard), Anastasia: Number(form.Anastasia), 'Jean-Claude': Number(form['Jean-Claude']) } });
  };
  const pending = transactions.filter((tx) => tx.status === 'pending' || tx.status === 'awaiting_allocation');
  const preview = form.amount ? calculateCommission(Number(form.amount), { Richard: Number(form.Richard), Anastasia: Number(form.Anastasia), 'Jean-Claude': Number(form['Jean-Claude']) }).pool : 0;
  return <section className="card mt-8 p-6"><div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-xl font-black">Interactive controls</h2><p className="text-sm text-slate-600">Actions are processed by the permission-protected API; the dashboard above is visible to everyone.</p></div><label><span className="label">Demonstration role</span><select aria-label="Demonstration role" value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 block rounded border px-3 py-2">{roles.map((name) => <option key={name}>{name}</option>)}</select></label></div>
    {message && <p className="mt-4 rounded bg-mint p-3 text-sm" role="status">{message}</p>}
    <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={submit}><fieldset className="md:col-span-2"><legend className="label">Transaction type</legend><button type="button" className="btn mr-2 bg-sand" onClick={() => setKind('sale')}>Sale</button><button type="button" className="btn bg-sand" onClick={() => setKind('expense')}>Expense</button></fieldset><label><span className="label">Reference</span><input required value={form.reference} onChange={(event) => set('reference', event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label><label><span className="label">Amount (€)</span><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => set('amount', event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>{kind === 'sale' ? <><label><span className="label">Customer</span><input required value={form.customer} onChange={(event) => set('customer', event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label><label><span className="label">Project</span><select value={form.project} onChange={(event) => set('project', event.target.value)} className="mt-1 w-full rounded border px-3 py-2"><option>Project A</option><option>Project B</option></select></label></> : <><label><span className="label">Category</span><select value={form.category} onChange={(event) => set('category', event.target.value)} className="mt-1 w-full rounded border px-3 py-2"><option>Materials</option><option>Travel</option><option>Other</option></select></label><label><span className="label">Proposed allocation</span><select value={form.allocation} onChange={(event) => set('allocation', event.target.value)} className="mt-1 w-full rounded border px-3 py-2"><option>Project A</option><option>Project B</option><option>Company overhead</option></select></label></>}<label className="md:col-span-2"><span className="label">Description</span><input required value={form.description} onChange={(event) => set('description', event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>{kind === 'sale' && <fieldset className="md:col-span-2 rounded bg-mint p-4"><legend className="label">Proposed commission split</legend>{salespeople.map((name) => <label className="mr-3 text-sm" key={name}>{name}<input type="number" min="0" max="100" value={form[name]} onChange={(event) => set(name, event.target.value)} className="ml-1 w-16 rounded border px-2 py-1" />%</label>)}<p className="mt-2 text-sm">10% commission pool preview: €{preview.toFixed(2)}</p></fieldset>}<button className="btn md:col-span-2 bg-ink text-white">Save transaction</button></form>
    <section className="mt-8"><h3 className="font-black">Manager decisions</h3><p className="text-sm text-slate-600">Only Svetlana is accepted by the API for approvals and corrections.</p>{pending.map((tx) => <Decision key={tx.id} tx={tx} role={role} call={call} />)}</section>
    <section className="mt-8"><h3 className="font-black">Delivery retries</h3><p className="text-sm text-slate-600">Retry only a failed or pending delivery. The server keeps the existing transaction reference and refreshes this dashboard afterwards.</p>{transactions.filter((tx) => tx.sync_status !== 'synced' || tx.notification_status !== 'sent').map((tx) => <div className="mt-2 flex flex-wrap items-center gap-2 rounded bg-sand p-3" key={`retry-${tx.id}`}><b>{tx.reference}</b>{tx.sync_status !== 'synced' && <button type="button" className="btn bg-white" onClick={() => call('/api/sync', { reference: tx.reference })}>Retry Sheets sync</button>}{tx.notification_status !== 'sent' && <button type="button" className="btn bg-white" onClick={() => call('/api/notifications/retry', { reference: tx.reference })}>Retry Telegram notification</button>}</div>)}</section>
  </section>;
}

function Decision({ tx, role, call }: { tx: Transaction; role: string; call: (url: string, body: unknown, method?: string) => Promise<void> }) {
  const [richard, setRichard] = useState(Number(tx.proposed_split?.Richard || 0));
  const [anastasia, setAnastasia] = useState(Number(tx.proposed_split?.Anastasia || 0));
  const [jeanClaude, setJeanClaude] = useState(Number(tx.proposed_split?.['Jean-Claude'] || 0));
  const [allocation, setAllocation] = useState(tx.proposed_allocation || 'Project A');
  const correctedSplit = { Richard: richard, Anastasia: anastasia, 'Jean-Claude': jeanClaude };
  const total = richard + anastasia + jeanClaude;
  return <div className="mt-2 rounded bg-sand p-3"><b>{tx.reference}</b> · {tx.description}
    {tx.kind === 'sale' ? <div className="mt-2 flex flex-wrap items-end gap-2">{[['Richard', richard, setRichard], ['Anastasia', anastasia, setAnastasia], ['Jean-Claude', jeanClaude, setJeanClaude]].map(([name, value, setter]) => <label className="text-xs" key={String(name)}>{String(name)}<input type="number" min="0" max="100" value={Number(value)} onChange={(event) => (setter as (n: number) => void)(Number(event.target.value))} className="ml-1 w-14 rounded border px-1 py-1" />%</label>)}<span className="text-xs">Final total: {total}%</span></div> : <label className="mt-2 block text-xs">Final allocation<select value={allocation} onChange={(event) => setAllocation(event.target.value)} className="ml-2 rounded border px-2 py-1"><option>Project A</option><option>Project B</option><option>Company overhead</option></select></label>}
    <div className="mt-2 flex gap-2"><button disabled={role !== 'Svetlana' || (tx.kind === 'sale' && total !== 100)} className="btn bg-mint disabled:opacity-50" type="button" onClick={() => call('/api/transactions', { role, id: tx.id, status: 'approved', split: correctedSplit, allocation }, 'PATCH')}>Approve / correct</button><button disabled={role !== 'Svetlana'} className="btn bg-white disabled:opacity-50" type="button" onClick={() => call('/api/transactions', { role, id: tx.id, status: 'rejected' }, 'PATCH')}>Reject</button></div>
  </div>;
}
