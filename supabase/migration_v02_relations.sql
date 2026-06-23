do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partners'
      and column_name = 'company_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partners'
      and column_name = 'name'
  ) then
    alter table public.partners rename column company_name to name;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partners'
      and column_name = 'cooperation_start_date'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partners'
      and column_name = 'relation_start_date'
  ) then
    alter table public.partners
      rename column cooperation_start_date to relation_start_date;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partners'
      and column_name = 'last_update_date'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partners'
      and column_name = 'last_contact_date'
  ) then
    alter table public.partners rename column last_update_date to last_contact_date;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partners'
      and column_name = 'update_status'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partners'
      and column_name = 'relation_status'
  ) then
    alter table public.partners rename column update_status to relation_status;
  end if;
end $$;

notify pgrst, 'reload schema';

notify pgrst, 'reload schema';

alter table public.partners
  drop column if exists comment;

alter table public.partners
  drop constraint if exists partners_update_status_check;

alter table public.partners
  drop constraint if exists partners_relation_status_check;

alter table public.partners
  add constraint partners_relation_status_check
  check (
    relation_status in (
      'w oczekiwaniu na odpowiedź',
      'w trakcie testowania',
      'czeka na odpowiedź',
      'nieznany'
    )
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

alter table public.actions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'actions'
      and policyname = 'Allow public read actions'
  ) then
    create policy "Allow public read actions"
      on public.actions for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'actions'
      and policyname = 'Allow public insert actions'
  ) then
    create policy "Allow public insert actions"
      on public.actions for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'actions'
      and policyname = 'Allow public update actions'
  ) then
    create policy "Allow public update actions"
      on public.actions for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'actions'
      and policyname = 'Allow public delete actions'
  ) then
    create policy "Allow public delete actions"
      on public.actions for delete
      using (true);
  end if;
end $$;
