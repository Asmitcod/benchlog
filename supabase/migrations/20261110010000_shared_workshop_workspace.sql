create table public.shared_workshop (
    workspace_id smallint primary key default 1 check (workspace_id = 1),
    data jsonb not null check (jsonb_typeof(data) = 'object'),
    migrated_owner_ids uuid[] not null default '{}',
    updated_at timestamptz not null default now()
);

alter table public.shared_workshop enable row level security;

create policy "Signed-in members manage the shared workshop"
    on public.shared_workshop for all to authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on table public.shared_workshop to authenticated;

alter publication supabase_realtime add table public.shared_workshop;
