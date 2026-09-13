-- Run this in the Supabase SQL editor before adding the project URL and anon key in app.js.
create table if not exists public.todo_lists (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  deadline date,
  description text default '',
  structure jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.todo_lists enable row level security;

create policy "Owner can read their lists"
  on public.todo_lists for select
  using (auth.uid() = owner_id);

create policy "Owner can create their lists"
  on public.todo_lists for insert
  with check (auth.uid() = owner_id);

create policy "Owner can update their lists"
  on public.todo_lists for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owner can delete their lists"
  on public.todo_lists for delete
  using (auth.uid() = owner_id);
