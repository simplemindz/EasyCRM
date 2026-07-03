create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text not null default '',
  partner_type text not null default 'inny'
    check (partner_type in ('pilotaż', 'tester', 'dystrybutor', 'inny')),
  contact_person text not null,
  address text not null,
  email text not null,
  phone text not null default '',
  agreement_status text not null default 'nie'
    check (agreement_status in ('tak', 'nie', 'w trakcie')),
  communication_group text not null default 'inna'
    check (communication_group in ('whatsapp', 'signal', 'telegram', 'messenger', 'inna')),
  group_name text not null default '',
  application text not null default '',
  note text not null default '',
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

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  action_date date not null,
  description text not null,
  status text not null default 'nadchodzące'
    check (status in ('nadchodzące', 'wykonane')),
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

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

alter table public.partners enable row level security;
alter table public.actions enable row level security;
alter table public.partner_contacts enable row level security;
alter table public.partner_account_lists enable row level security;
alter table public.partner_account_items enable row level security;
alter table public.partner_account_fields enable row level security;
alter table public.equipment enable row level security;
alter table public.partner_equipment_assignments enable row level security;

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

create policy "Allow public read partner contacts"
  on public.partner_contacts for select
  using (true);

create policy "Allow public insert partner contacts"
  on public.partner_contacts for insert
  with check (true);

create policy "Allow public update partner contacts"
  on public.partner_contacts for update
  using (true)
  with check (true);

create policy "Allow public delete partner contacts"
  on public.partner_contacts for delete
  using (true);

create policy "Allow public read partner account lists"
  on public.partner_account_lists for select
  using (true);

create policy "Allow public insert partner account lists"
  on public.partner_account_lists for insert
  with check (true);

create policy "Allow public update partner account lists"
  on public.partner_account_lists for update
  using (true)
  with check (true);

create policy "Allow public delete partner account lists"
  on public.partner_account_lists for delete
  using (true);

create policy "Allow public read partner account items"
  on public.partner_account_items for select
  using (true);

create policy "Allow public insert partner account items"
  on public.partner_account_items for insert
  with check (true);

create policy "Allow public update partner account items"
  on public.partner_account_items for update
  using (true)
  with check (true);

create policy "Allow public delete partner account items"
  on public.partner_account_items for delete
  using (true);

create policy "Allow public read partner account fields"
  on public.partner_account_fields for select
  using (true);

create policy "Allow public insert partner account fields"
  on public.partner_account_fields for insert
  with check (true);

create policy "Allow public update partner account fields"
  on public.partner_account_fields for update
  using (true)
  with check (true);

create policy "Allow public delete partner account fields"
  on public.partner_account_fields for delete
  using (true);

create policy "Allow public read equipment"
  on public.equipment for select
  using (true);

create policy "Allow public insert equipment"
  on public.equipment for insert
  with check (true);

create policy "Allow public update equipment"
  on public.equipment for update
  using (true)
  with check (true);

create policy "Allow public delete equipment"
  on public.equipment for delete
  using (true);

create policy "Allow public read partner equipment assignments"
  on public.partner_equipment_assignments for select
  using (true);

create policy "Allow public insert partner equipment assignments"
  on public.partner_equipment_assignments for insert
  with check (true);

create policy "Allow public update partner equipment assignments"
  on public.partner_equipment_assignments for update
  using (true)
  with check (true);

create policy "Allow public delete partner equipment assignments"
  on public.partner_equipment_assignments for delete
  using (true);
