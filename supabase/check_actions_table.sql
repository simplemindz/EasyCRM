select to_regclass('public.actions') as actions_table;

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('partners', 'actions')
order by table_name;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'actions'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

notify pgrst, 'reload schema';
