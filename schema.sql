create extension if not exists pgcrypto;
create type public.app_role as enum ('employee','manager');
create type public.transaction_kind as enum ('sale','expense');
create type public.transaction_status as enum ('pending','approved','rejected');

create table public.employees (
  id uuid primary key default gen_random_uuid(), name text not null unique, role app_role not null default 'employee', telegram_user_id bigint unique, telegram_chat_id bigint, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.projects (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create table public.transactions (
  id uuid primary key default gen_random_uuid(), reference text not null unique, kind transaction_kind not null, employee_id uuid not null references employees(id), project_id uuid references projects(id), amount numeric(12,2) not null check (amount > 0), description text not null default '', status transaction_status not null default 'pending', commission numeric(12,2) not null default 0, allocation jsonb not null default '{}'::jsonb, source text not null default 'web', telegram_chat_id bigint, approved_by uuid references employees(id), approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_logs (id bigint generated always as identity primary key, transaction_id uuid references transactions(id) on delete set null, actor_employee_id uuid references employees(id), action text not null, before_state jsonb, after_state jsonb, created_at timestamptz not null default now());
create table public.sync_runs (id uuid primary key default gen_random_uuid(), reference text not null, status text not null, attempts int not null default 0, error text, created_at timestamptz not null default now(), completed_at timestamptz);
create index transactions_status_idx on transactions(status); create index transactions_created_idx on transactions(created_at desc);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger transactions_updated_at before update on transactions for each row execute function public.set_updated_at();
insert into public.projects(name) values ('Project A'), ('Project B'), ('Company') on conflict do nothing;
insert into public.employees(name, role) values ('Richard','employee'),('Anastasia','employee'),('Jean-Claude','employee'),('Kevin','employee'),('Svetlana','manager') on conflict do nothing;

alter table employees enable row level security; alter table projects enable row level security; alter table transactions enable row level security; alter table audit_logs enable row level security; alter table sync_runs enable row level security;
-- The service role used by server routes bypasses RLS. Browser access is intentionally server-mediated.
