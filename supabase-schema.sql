-- Kör detta i Supabase SQL Editor

-- Profiler
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  background_url text,
  background_is_dark boolean default false,
  created_at timestamptz default now()
);

-- Album
create table albums (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  year int,
  cover_url text,
  created_at timestamptz default now()
);

-- Låtar
create table tracks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  album_id uuid references albums(id) on delete set null,
  title text not null,
  duration numeric,
  file_url text not null,
  file_format text,
  file_size bigint,
  bitrate int,
  track_number int,
  created_at timestamptz default now()
);

-- Spellistor
create table playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  created_at timestamptz default now()
);

-- Spellista-låtar
create table playlist_items (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references playlists(id) on delete cascade not null,
  track_id uuid references tracks(id) on delete cascade not null,
  position int not null,
  unique(playlist_id, position)
);

-- RLS
alter table profiles enable row level security;
alter table albums enable row level security;
alter table tracks enable row level security;
alter table playlists enable row level security;
alter table playlist_items enable row level security;

create policy "Egna profiler" on profiles for all using (auth.uid() = id);
create policy "Egna album" on albums for all using (auth.uid() = user_id);
create policy "Egna låtar" on tracks for all using (auth.uid() = user_id);
create policy "Egna spellistor" on playlists for all using (auth.uid() = user_id);
create policy "Egna spellista-låtar" on playlist_items
  for all using (
    exists (select 1 from playlists where id = playlist_id and user_id = auth.uid())
  );

-- Auto-skapa profil vid registrering
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Storage buckets
insert into storage.buckets (id, name, public) values ('audio', 'audio', false);
insert into storage.buckets (id, name, public) values ('images', 'images', true);

-- Storage policies
create policy "Egna ljudfiler" on storage.objects for all
  using (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Egna bilder" on storage.objects for all
  using (bucket_id = 'images' and auth.uid()::text = (storage.foldername(name))[1]);
