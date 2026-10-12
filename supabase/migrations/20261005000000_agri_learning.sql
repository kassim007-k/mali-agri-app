-- Base de données Mali Agri - MODE DÉVELOPPEMENT COMPLET

-- 1. Tables de base
create table if not exists public.agri_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default 'Agriculteur',
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.agri_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  category text not null default 'Cultures',
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.agri_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.agri_courses(id) on delete cascade,
  title text not null,
  content text default '',
  position integer not null,
  video_url text,
  created_at timestamptz not null default now(),
  unique(course_id, position)
);

create table if not exists public.agri_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid references public.agri_courses(id) on delete cascade,
  status text not null default 'active',
  enrolled_at timestamptz not null default now(),
  unique(user_id, course_id)
);

create table if not exists public.agri_lesson_progress (
  user_id uuid not null,
  lesson_id uuid references public.agri_lessons(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- 2. DÉSACTIVER LA SÉCURITÉ (RLS) pour toutes les tables
alter table public.agri_profiles disable row level security;
alter table public.agri_courses disable row level security;
alter table public.agri_lessons disable row level security;
alter table public.agri_enrollments disable row level security;
alter table public.agri_lesson_progress disable row level security;

-- 3. Droits d'accès complets pour le développement
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;

-- 4. Automatisation de la création de profil lors de l'inscription
create or replace function public.handle_new_agri_user()
returns trigger as $$
declare
  assigned_role text := 'user';
begin
  -- VÉRIFICATION DES EMAILS ADMIN
  if (new.email = 'ibrahimakeita24@icloud.com' or new.email = 'kk.boulkassimkeita.keita@gmail.com') then
    assigned_role := 'admin';
  end if;

  -- Créer le profil public
  insert into public.agri_profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Nouvel Agriculteur'), assigned_role);

  -- AUTO-CONFIRMATION
  update auth.users set email_confirmed_at = now(), confirmed_at = now() where id = new.id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_agri_user();

-- 5. Données de test
-- Insertion du profil de test pour le mode Développeur
insert into public.agri_profiles (id, full_name, role)
values ('00000000-0000-0000-0000-000000000000', 'Développeur Test', 'admin')
on conflict (id) do update set full_name = 'Développeur Test';

insert into public.agri_courses (slug, title, description, category)
values
  ('elevage-bovin', 'Élevage Bovin', 'Apprenez les bases de l''élevage.', 'Élevage'),
  ('maraichage', 'Cultures Maraîchères', 'Techniques de culture de saison.', 'Agriculture')
on conflict (slug) do nothing;
