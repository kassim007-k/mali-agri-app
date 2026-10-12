-- Langues, formats multimédias et premiers cours bilingues.
-- Migration additive: compatible avec la migration agri_learning déjà appliquée.

alter table public.agri_courses
  add column if not exists language text not null default 'fr';

alter table public.agri_lessons
  add column if not exists media_type text not null default 'text',
  add column if not exists media_url text,
  add column if not exists source_url text;

-- Conserve les anciennes leçons vidéo créées avec video_url.
update public.agri_lessons
set media_type = 'video', media_url = video_url
where video_url is not null and media_url is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agri_courses'::regclass
      and conname = 'agri_courses_language_check'
  ) then
    alter table public.agri_courses
      add constraint agri_courses_language_check check (language in ('fr', 'bm'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agri_lessons'::regclass
      and conname = 'agri_lessons_media_type_check'
  ) then
    alter table public.agri_lessons
      add constraint agri_lessons_media_type_check check (media_type in ('text', 'video', 'audio'));
  end if;
end;
$$;

create index if not exists agri_courses_language_category_idx
  on public.agri_courses (language, category, is_published);

-- Fonction de vérification du rôle admin
create or replace function public.is_agri_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.agri_profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Table pour le système de messagerie et notifications
create table if not exists public.agri_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.agri_profiles(id) on delete cascade, -- NULL pour les messages broadcast (tous)
  title text not null,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.agri_notifications enable row level security;

create policy "Les utilisateurs voient leurs notifications"
  on public.agri_notifications for select
  using (auth.uid() = user_id or user_id is null);

create policy "Les utilisateurs marquent leurs notifications comme lues"
  on public.agri_notifications for update
  using (auth.uid() = user_id);

create policy "Les admins peuvent envoyer des notifications"
  on public.agri_notifications for insert
  with check (public.is_agri_admin());

-- Permet aux administrateurs déjà authentifiés de gérer les rôles depuis
-- l'espace d'administration, sans exposer de droit UPDATE direct sur role.
create or replace function public.set_agri_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role text;
  admin_count integer;
begin
  if not public.is_agri_admin() then
    raise exception using errcode = '42501', message = 'Action réservée aux administrateurs.';
  end if;
  if new_role is null or new_role not in ('user', 'admin') then
    raise exception using errcode = '22023', message = 'Rôle non valide.';
  end if;

  -- Sérialise les changements de rôle pour empêcher de retirer le dernier admin.
  perform pg_advisory_xact_lock(73194201);
  select profile.role into current_role
  from public.agri_profiles as profile
  where profile.id = target_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Compte introuvable.';
  end if;

  if current_role = 'admin' and new_role = 'user' then
    select count(*) into admin_count
    from public.agri_profiles as profile
    where profile.role = 'admin';
    if admin_count <= 1 then
      raise exception using errcode = '23514', message = 'Le dernier administrateur ne peut pas être rétrogradé.';
    end if;
  end if;

update public.agri_profiles
  set role = new_role
  where id = target_user_id;
end;
$$;

-- Fonction pour envoyer un message à tout le monde (Broadcast)
create or replace function public.broadcast_agri_message(msg_title text, msg_content text)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_agri_admin() then
    raise exception 'Accès refusé.';
  end if;

  insert into public.agri_notifications (user_id, title, content)
  values (null, msg_title, msg_content);
end;
$$;

revoke all on function public.broadcast_agri_message(text, text) from public, anon;
grant execute on function public.broadcast_agri_message(text, text) to authenticated;

revoke all on function public.set_agri_user_role(uuid, text) from public, anon;
grant execute on function public.set_agri_user_role(uuid, text) to authenticated;

-- Ressources de formation de démarrage, disponibles en français et bambara.
insert into public.agri_courses
  (slug, title, description, category, language, level, duration_minutes, is_published, created_by)
values
  ('biofertilisant-enrichi-fr', 'Fabriquer un biofertilisant enrichi', 'Découvrir la valorisation de matières organiques et l’amélioration de la fertilité du sol.', 'Agriculture', 'fr', 'Débutant', 45, true, null),
  ('biofertilisant-enrichi-bm', 'Nôgô hôrôn nafaman dilanni', 'Dugukolo nafama ani nɔgɔ hɔrɔn labɛnni kunnafoniw.', 'Agriculture', 'bm', 'Débutant', 45, true, null),
  ('engraissement-petits-ruminants-fr', 'Engraissement des moutons et des chèvres', 'Comprendre les bases de l’alimentation et du suivi d’un atelier d’engraissement.', 'Élevage', 'fr', 'Débutant', 40, true, null),
  ('engraissement-petits-ruminants-bm', 'Sagaw ni baw latulôli', 'Kalan in bɛ sagaw ni baw latulɔli kunnafoniw jira.', 'Élevage', 'bm', 'Débutant', 40, true, null)
on conflict (slug) do nothing;

insert into public.agri_lessons
  (course_id, title, content, position, media_type, media_url, source_url)
select course.id,
  case course.slug
    when 'biofertilisant-enrichi-fr' then 'Pourquoi enrichir le sol ?'
    when 'biofertilisant-enrichi-bm' then 'Dugukolo nafama'
    when 'engraissement-petits-ruminants-fr' then 'Préparer un suivi régulier'
    else 'Baganw lajɛ ka waati bɛɛ'
  end,
  'Contenu de la leçon...',
  1, 'text', null,
  'https://www.accessagriculture.org'
from public.agri_courses as course
where course.slug in ('biofertilisant-enrichi-fr', 'biofertilisant-enrichi-bm', 'engraissement-petits-ruminants-fr', 'engraissement-petits-ruminants-bm')
on conflict (course_id, position) do nothing;
