create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text not null,
  address text not null,
  email text not null,
  cooperation_start_date date not null,
  last_update_date date not null,
  update_status text not null default 'nieznany'
    check (
      update_status in (
        'w oczekiwaniu na odpowiedź',
        'czeka na odpowiedź',
        'nieznany'
      )
    ),
  comment text not null default '',
  created_at timestamptz not null default now()
);

alter table public.partners enable row level security;

create policy "Allow public read"
  on public.partners for select
  using (true);

create policy "Allow public insert"
  on public.partners for insert
  with check (true);

create policy "Allow public update"
  on public.partners for update
  using (true)
  with check (true);

create policy "Allow public delete"
  on public.partners for delete
  using (true);
