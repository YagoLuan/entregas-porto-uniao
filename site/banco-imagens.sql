-- Rode uma vez no Supabase: SQL Editor -> New query -> Run
alter table public.stores     add column if not exists image_file text;
alter table public.menu_items add column if not exists image_file text;
