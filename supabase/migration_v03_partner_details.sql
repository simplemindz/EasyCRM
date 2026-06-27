alter table public.partners
  add column if not exists legal_name text not null default '',
  add column if not exists partner_type text not null default 'inny',
  add column if not exists phone text not null default '',
  add column if not exists agreement_status text not null default 'nie',
  add column if not exists communication_group text not null default 'inna',
  add column if not exists group_name text not null default '',
  add column if not exists application text not null default '',
  add column if not exists note text not null default '';

alter table public.partners
  drop constraint if exists partners_partner_type_check,
  add constraint partners_partner_type_check
  check (partner_type in ('pilotaż', 'tester', 'dystrybutor', 'inny'));

alter table public.partners
  drop constraint if exists partners_agreement_status_check,
  add constraint partners_agreement_status_check
  check (agreement_status in ('tak', 'nie', 'w trakcie'));

alter table public.partners
  drop constraint if exists partners_communication_group_check,
  add constraint partners_communication_group_check
  check (communication_group in ('whatsapp', 'signal', 'telegram', 'messenger', 'inna'));

create table if not exists public.partner_contacts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.partner_account_lists (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_account_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.partner_account_lists(id) on delete cascade,
  account_number text not null default '',
  login text not null default '',
  password text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_account_fields (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null default '',
  value text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.partner_contacts enable row level security;
alter table public.partner_account_lists enable row level security;
alter table public.partner_account_items enable row level security;
alter table public.partner_account_fields enable row level security;

do $$
declare
  v_table_name text;
begin
  foreach v_table_name in array array[
    'partner_contacts',
    'partner_account_lists',
    'partner_account_items',
    'partner_account_fields'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = v_table_name
        and policyname = 'Allow public read ' || v_table_name
    ) then
      execute format('create policy %I on public.%I for select using (true)', 'Allow public read ' || v_table_name, v_table_name);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = v_table_name
        and policyname = 'Allow public insert ' || v_table_name
    ) then
      execute format('create policy %I on public.%I for insert with check (true)', 'Allow public insert ' || v_table_name, v_table_name);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = v_table_name
        and policyname = 'Allow public update ' || v_table_name
    ) then
      execute format('create policy %I on public.%I for update using (true) with check (true)', 'Allow public update ' || v_table_name, v_table_name);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = v_table_name
        and policyname = 'Allow public delete ' || v_table_name
    ) then
      execute format('create policy %I on public.%I for delete using (true)', 'Allow public delete ' || v_table_name, v_table_name);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
