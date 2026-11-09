create table public.workshop_snapshots (
    owner_id uuid primary key references auth.users (id) on delete cascade,
    data jsonb not null check (jsonb_typeof(data) = 'object'),
    updated_at timestamptz not null default now()
);

alter table public.workshop_snapshots enable row level security;

create policy "Users manage their own workshop snapshot"
    on public.workshop_snapshots for all
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);
