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

revoke all on function public.set_agri_user_role(uuid, text) from public, anon;
grant execute on function public.set_agri_user_role(uuid, text) to authenticated;

-- Ressources de formation de démarrage, disponibles en français et bambara.
-- Les médias sont hébergés et servis par Access Agriculture; l'application
-- ouvre leur page officielle afin que l'apprenant choisisse audio ou vidéo.
insert into public.agri_courses
  (slug, title, description, category, language, level, duration_minutes, is_published, created_by)
values
  (
    'biofertilisant-enrichi-fr',
    'Fabriquer un biofertilisant enrichi',
    'Découvrir la valorisation de matières organiques et l’amélioration de la fertilité du sol. Ressource audiovisuelle bilingue de formation paysanne.',
    'Agriculture', 'fr', 'Débutant', 45, true, null
  ),
  (
    'biofertilisant-enrichi-bm',
    'Nôgô hôrôn nafaman dilanni',
    'Dugukolo nafama ani nɔgɔ hɔrɔn labɛnni kunnafoniw. Kalan kuma-fɔ ni fɔlikan na bamanankan ni faransikan na.',
    'Agriculture', 'bm', 'Débutant', 45, true, null
  ),
  (
    'engraissement-petits-ruminants-fr',
    'Engraissement des moutons et des chèvres',
    'Comprendre les bases de l’alimentation et du suivi d’un atelier d’engraissement de petits ruminants. Les conseils de santé doivent être confirmés par un agent vétérinaire local.',
    'Élevage', 'fr', 'Débutant', 40, true, null
  ),
  (
    'engraissement-petits-ruminants-bm',
    'Sagaw ni baw latulôli',
    'Kalan in bɛ sagaw ni baw latulɔli kunnafoniw jira. Baganw ka dumuni ni kɛnɛya lajɛ; furakɛli kosɔn, i ka bagan dɔgɔtɔrɔ ɲininka.',
    'Élevage', 'bm', 'Débutant', 40, true, null
  )
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
  case course.slug
    when 'biofertilisant-enrichi-fr' then 'Cette introduction présente l’intérêt de recycler des matières organiques pour nourrir le sol. Les matières, la préparation et le moment d’utilisation dépendent des conditions locales: suivez la démonstration de la ressource et demandez conseil au service agricole de votre zone avant d’adapter la pratique.'
    when 'biofertilisant-enrichi-bm' then 'Kalan in bɛ dugukolo nafama ni nɔgɔ hɔrɔn labɛnni kunnafoniw jira. Fɛn minnu bɛ se ka kɛ, olu ni waati bɛɛ bɛ yɔrɔ kɛcogo la. Aw ye kalan filɛ, ka sɛnɛkɛ baarakɛlaw ɲininka sani aw ka fɛn kura kɛ.'
    when 'engraissement-petits-ruminants-fr' then 'Un atelier d’engraissement se prépare en observant les animaux, les aliments disponibles et les conditions de logement. Notez régulièrement les achats, les rations, l’état général et les dépenses. Les besoins varient selon l’animal et la saison; faites valider tout changement d’alimentation ou de traitement par un agent compétent.'
    else 'Baganw lajɛ waati bɛɛ. I ka dumuni minnu bɛ yen, baganw ka kɛnɛya ani u sigiyɔrɔ lajɛ. Banakɔnɔ ni furakɛli fɛnw kosɔn, i ka bagan dɔgɔtɔrɔ ɲininka.'
  end,
  1, 'text', null,
  case course.slug
    when 'biofertilisant-enrichi-fr' then 'https://www.accessagriculture.org/fr/fabrication-dun-biofertilisant-enrichi'
    when 'biofertilisant-enrichi-bm' then 'https://www.accessagriculture.org/bm/making-enriched-biofertilizer'
    when 'engraissement-petits-ruminants-fr' then 'https://www.accessagriculture.org/fr/engraissement-des-moutons-et-des-chevres'
    else 'https://www.accessagriculture.org/bm/sagaw-ni-baw-latuloli'
  end
from public.agri_courses as course
where course.slug in (
  'biofertilisant-enrichi-fr', 'biofertilisant-enrichi-bm',
  'engraissement-petits-ruminants-fr', 'engraissement-petits-ruminants-bm'
)
on conflict (course_id, position) do nothing;

insert into public.agri_lessons
  (course_id, title, content, position, media_type, media_url, source_url)
select course.id,
  case when course.language = 'fr' then 'Voir la démonstration vidéo' else 'Filɛ: videyo kalan' end,
  case when course.category = 'Agriculture'
    then 'Ressource vidéo d’Access Agriculture sur la préparation d’un biofertilisant enrichi. La page propose les versions française et bambara.'
    else 'Ressource vidéo d’Access Agriculture sur l’engraissement des moutons et des chèvres. Pour les soins ou traitements, demandez toujours conseil à un agent vétérinaire.'
  end,
  2, 'video',
  case course.slug
    when 'biofertilisant-enrichi-fr' then 'https://www.accessagriculture.org/fr/fabrication-dun-biofertilisant-enrichi'
    when 'biofertilisant-enrichi-bm' then 'https://www.accessagriculture.org/bm/making-enriched-biofertilizer'
    when 'engraissement-petits-ruminants-fr' then 'https://www.accessagriculture.org/fr/engraissement-des-moutons-et-des-chevres'
    else 'https://www.accessagriculture.org/bm/sagaw-ni-baw-latuloli'
  end,
  case course.slug
    when 'biofertilisant-enrichi-fr' then 'https://www.accessagriculture.org/fr/fabrication-dun-biofertilisant-enrichi'
    when 'biofertilisant-enrichi-bm' then 'https://www.accessagriculture.org/bm/making-enriched-biofertilizer'
    when 'engraissement-petits-ruminants-fr' then 'https://www.accessagriculture.org/fr/engraissement-des-moutons-et-des-chevres'
    else 'https://www.accessagriculture.org/bm/sagaw-ni-baw-latuloli'
  end
from public.agri_courses as course
where course.slug in (
  'biofertilisant-enrichi-fr', 'biofertilisant-enrichi-bm',
  'engraissement-petits-ruminants-fr', 'engraissement-petits-ruminants-bm'
)
on conflict (course_id, position) do nothing;

insert into public.agri_lessons
  (course_id, title, content, position, media_type, media_url, source_url)
select course.id,
  case when course.language = 'fr' then 'Écouter la ressource audio' else 'Kuma kan: audio kalan' end,
  'La page de la ressource officielle donne accès à la piste audio dans la langue sélectionnée.',
  3, 'audio',
  case course.slug
    when 'biofertilisant-enrichi-fr' then 'https://www.accessagriculture.org/fr/fabrication-dun-biofertilisant-enrichi'
    when 'biofertilisant-enrichi-bm' then 'https://www.accessagriculture.org/bm/making-enriched-biofertilizer'
    when 'engraissement-petits-ruminants-fr' then 'https://www.accessagriculture.org/fr/engraissement-des-moutons-et-des-chevres'
    else 'https://www.accessagriculture.org/bm/sagaw-ni-baw-latuloli'
  end,
  case course.slug
    when 'biofertilisant-enrichi-fr' then 'https://www.accessagriculture.org/fr/fabrication-dun-biofertilisant-enrichi'
    when 'biofertilisant-enrichi-bm' then 'https://www.accessagriculture.org/bm/making-enriched-biofertilizer'
    when 'engraissement-petits-ruminants-fr' then 'https://www.accessagriculture.org/fr/engraissement-des-moutons-et-des-chevres'
    else 'https://www.accessagriculture.org/bm/sagaw-ni-baw-latuloli'
  end
from public.agri_courses as course
where course.slug in (
  'biofertilisant-enrichi-fr', 'biofertilisant-enrichi-bm',
  'engraissement-petits-ruminants-fr', 'engraissement-petits-ruminants-bm'
)
on conflict (course_id, position) do nothing;
