alter table public.tools
    add column photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'tool-files',
    'tool-files',
    false,
    52428800,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Users manage their own tool files"
    on storage.objects
    for all
    to authenticated
    using (
        bucket_id = 'tool-files'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    )
    with check (
        bucket_id = 'tool-files'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    );
