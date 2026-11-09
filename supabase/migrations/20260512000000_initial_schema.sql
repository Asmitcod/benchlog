create extension if not exists pgcrypto;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table public.tools (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    name text not null,
    category text not null default '',
    make_model text not null default '',
    serial_number text not null default '',
    purchase_date date,
    location text not null default '',
    notes text not null default '',
    qr_code_id uuid not null default gen_random_uuid() unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, owner_id)
);

create table public.tool_documents (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    tool_id uuid not null,
    name text not null,
    document_type text not null check (document_type in ('pdf', 'image', 'link')),
    storage_path text,
    external_url text,
    created_at timestamptz not null default now(),
    constraint tool_documents_tool_owner_fk
        foreign key (tool_id, owner_id)
        references public.tools (id, owner_id)
        on delete cascade,
    check (
        (document_type = 'link' and external_url is not null)
        or (document_type in ('pdf', 'image') and storage_path is not null)
    )
);

create table public.parts (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    tool_id uuid not null,
    name text not null,
    part_number text not null default '',
    supplier_url text not null default '',
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint parts_tool_owner_fk
        foreign key (tool_id, owner_id)
        references public.tools (id, owner_id)
        on delete cascade
);

create table public.setting_presets (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    tool_id uuid not null,
    name text not null,
    settings jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint setting_presets_tool_owner_fk
        foreign key (tool_id, owner_id)
        references public.tools (id, owner_id)
        on delete cascade
);

create table public.maintenance_tasks (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    tool_id uuid not null,
    name text not null,
    instructions text not null default '',
    interval_unit text not null check (interval_unit in ('days', 'months', 'hours')),
    interval_value numeric not null check (interval_value > 0),
    next_due_at timestamptz,
    next_due_hours numeric,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint maintenance_tasks_tool_owner_fk
        foreign key (tool_id, owner_id)
        references public.tools (id, owner_id)
        on delete cascade,
    unique (id, owner_id, tool_id),
    check (
        (interval_unit = 'hours' and next_due_hours is not null)
        or (interval_unit <> 'hours' and next_due_at is not null)
    )
);

create table public.service_logs (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    tool_id uuid not null,
    task_id uuid,
    completed_at timestamptz not null default now(),
    notes text not null default '',
    hours_reading numeric check (hours_reading is null or hours_reading >= 0),
    created_at timestamptz not null default now(),
    constraint service_logs_tool_owner_fk
        foreign key (tool_id, owner_id)
        references public.tools (id, owner_id)
        on delete cascade,
    constraint service_logs_task_tool_owner_fk
        foreign key (task_id, owner_id, tool_id)
        references public.maintenance_tasks (id, owner_id, tool_id)
        on delete set null (task_id)
);

create table public.consumables (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    name text not null,
    kind text not null default '',
    quantity_on_hand numeric not null default 0 check (quantity_on_hand >= 0),
    reorder_threshold numeric not null default 0 check (reorder_threshold >= 0),
    unit text not null default '',
    supplier_url text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, owner_id)
);

create table public.consumable_tools (
    owner_id uuid not null references auth.users (id) on delete cascade,
    consumable_id uuid not null,
    tool_id uuid not null,
    primary key (consumable_id, tool_id),
    constraint consumable_tools_consumable_owner_fk
        foreign key (consumable_id, owner_id)
        references public.consumables (id, owner_id)
        on delete cascade,
    constraint consumable_tools_tool_owner_fk
        foreign key (tool_id, owner_id)
        references public.tools (id, owner_id)
        on delete cascade
);

create table public.consumable_usage (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    consumable_id uuid not null,
    tool_id uuid,
    quantity_used numeric not null check (quantity_used > 0),
    used_at timestamptz not null default now(),
    notes text not null default '',
    constraint consumable_usage_consumable_owner_fk
        foreign key (consumable_id, owner_id)
        references public.consumables (id, owner_id)
        on delete cascade,
    constraint consumable_usage_tool_owner_fk
        foreign key (tool_id, owner_id)
        references public.tools (id, owner_id)
        on delete set null (tool_id)
);

create index tools_owner_id_idx on public.tools (owner_id);
create index tool_documents_tool_id_idx on public.tool_documents (tool_id);
create index parts_tool_id_idx on public.parts (tool_id);
create index setting_presets_tool_id_idx on public.setting_presets (tool_id);
create index maintenance_tasks_due_idx
    on public.maintenance_tasks (owner_id, next_due_at)
    where active and interval_unit <> 'hours';
create index service_logs_tool_completed_idx
    on public.service_logs (tool_id, completed_at desc);
create index consumables_owner_id_idx on public.consumables (owner_id);
create index consumable_usage_consumable_used_idx
    on public.consumable_usage (consumable_id, used_at desc);

create trigger tools_set_updated_at
before update on public.tools
for each row execute function public.set_updated_at();

create trigger parts_set_updated_at
before update on public.parts
for each row execute function public.set_updated_at();

create trigger setting_presets_set_updated_at
before update on public.setting_presets
for each row execute function public.set_updated_at();

create trigger maintenance_tasks_set_updated_at
before update on public.maintenance_tasks
for each row execute function public.set_updated_at();

create trigger consumables_set_updated_at
before update on public.consumables
for each row execute function public.set_updated_at();

alter table public.tools enable row level security;
alter table public.tool_documents enable row level security;
alter table public.parts enable row level security;
alter table public.setting_presets enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.service_logs enable row level security;
alter table public.consumables enable row level security;
alter table public.consumable_tools enable row level security;
alter table public.consumable_usage enable row level security;

create policy "Users manage their own tools"
    on public.tools for all
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

create policy "Users manage their own tool documents"
    on public.tool_documents for all
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

create policy "Users manage their own parts"
    on public.parts for all
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

create policy "Users manage their own setting presets"
    on public.setting_presets for all
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

create policy "Users manage their own maintenance tasks"
    on public.maintenance_tasks for all
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

create policy "Users manage their own service logs"
    on public.service_logs for all
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

create policy "Users manage their own consumables"
    on public.consumables for all
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

create policy "Users manage their own consumable tool links"
    on public.consumable_tools for all
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

create policy "Users manage their own consumable usage"
    on public.consumable_usage for all
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);
