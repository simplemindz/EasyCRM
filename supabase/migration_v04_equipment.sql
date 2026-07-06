create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  internal_id text not null unique,
  equipment_type text not null default 'inne'
    check (
      equipment_type in (
        'komputer',
        'laptop',
        'tablet',
        'VR',
        'telefon',
        'modem',
        'akcesorium VR',
        'akcesorium komputerowe',
        'inne'
      )
    ),
  name text not null default '',
  serial_number text not null default '',
  purchase_date date,
  purchase_amount numeric(12, 2),
  purchase_currency text not null default 'PLN'
    check (purchase_currency in ('PLN', 'EUR', 'USD')),
  status text not null default 'nieoznaczony'
    check (status in ('własny', 'wypożyczony', 'wydany', 'nieoznaczony')),
  created_at timestamptz not null default now()
);

alter table public.equipment
  add column if not exists status text not null default 'nieoznaczony';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'equipment_status_check'
  ) then
    alter table public.equipment
      add constraint equipment_status_check
      check (status in ('własny', 'wypożyczony', 'wydany', 'nieoznaczony'));
  end if;
end $$;

create table if not exists public.partner_equipment_assignments (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  guardian_name text not null default '',
  relation text not null default 'wypożyczenie'
    check (relation in ('wypożyczenie', 'wydanie')),
  boundary_date date,
  assigned_at date not null default current_date,
  returned_at date,
  created_at timestamptz not null default now()
);

create unique index if not exists partner_equipment_active_assignment_idx
  on public.partner_equipment_assignments(equipment_id)
  where returned_at is null;

alter table public.equipment enable row level security;
alter table public.partner_equipment_assignments enable row level security;

do $$
declare
  v_table_name text;
begin
  foreach v_table_name in array array[
    'equipment',
    'partner_equipment_assignments'
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
