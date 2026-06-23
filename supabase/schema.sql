create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text not null,
  address text not null,
  email text not null,
  relation_start_date date not null,
  last_contact_date date not null,
  relation_status text not null default 'nieznany'
    check (
      relation_status in (
        'w oczekiwaniu na odpowiedź',
        'w trakcie testowania',
        'czeka na odpowiedź',
        'nieznany'
      )
    ),
  created_at timestamptz not null default now()
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  action_date date not null,
  description text not null,
  status text not null default 'nadchodzące'
    check (status in ('nadchodzące', 'wykonane')),
  created_at timestamptz not null default now()
);

alter table public.partners enable row level security;
alter table public.actions enable row level security;

create policy "Allow public read partners"
  on public.partners for select
  using (true);

create policy "Allow public insert partners"
  on public.partners for insert
  with check (true);

create policy "Allow public update partners"
  on public.partners for update
  using (true)
  with check (true);

create policy "Allow public delete partners"
  on public.partners for delete
  using (true);

create policy "Allow public read actions"
  on public.actions for select
  using (true);

create policy "Allow public insert actions"
  on public.actions for insert
  with check (true);

create policy "Allow public update actions"
  on public.actions for update
  using (true)
  with check (true);

create policy "Allow public delete actions"
  on public.actions for delete
  using (true);
