-- Base de données des cours et du suivi Mali Agri.
-- Les tables préfixées agri_ cohabitent avec les éventuelles tables existantes.

create table if not exists public.agri_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Agriculteur',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agri_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  category text not null default 'Cultures',
  level text not null default 'Tous niveaux',
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  cover_url text,
  is_published boolean not null default false,
  created_by uuid references public.agri_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agri_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.agri_courses (id) on delete cascade,
  title text not null,
  content text not null default '',
  video_url text,
  position integer not null check (position > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table if not exists public.agri_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.agri_profiles (id) on delete cascade,
  course_id uuid not null references public.agri_courses (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.agri_lesson_progress (
  user_id uuid not null references public.agri_profiles (id) on delete cascade,
  lesson_id uuid not null references public.agri_lessons (id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists agri_courses_published_created_idx
  on public.agri_courses (is_published, created_at desc);
create index if not exists agri_lessons_course_position_idx
  on public.agri_lessons (course_id, position);
create index if not exists agri_enrollments_user_status_idx
  on public.agri_enrollments (user_id, status);
create index if not exists agri_enrollments_course_idx
  on public.agri_enrollments (course_id);
create index if not exists agri_lesson_progress_lesson_idx
  on public.agri_lesson_progress (lesson_id);

create or replace function public.agri_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_agri_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.agri_profiles as profile
    where profile.id = (select auth.uid())
      and profile.role = 'admin'
  );
$$;

create or replace function public.agri_create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.agri_profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Agriculteur')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists agri_profiles_set_updated_at on public.agri_profiles;
create trigger agri_profiles_set_updated_at
before update on public.agri_profiles
for each row execute function public.agri_set_updated_at();

drop trigger if exists agri_courses_set_updated_at on public.agri_courses;
create trigger agri_courses_set_updated_at
before update on public.agri_courses
for each row execute function public.agri_set_updated_at();

drop trigger if exists agri_lessons_set_updated_at on public.agri_lessons;
create trigger agri_lessons_set_updated_at
before update on public.agri_lessons
for each row execute function public.agri_set_updated_at();

drop trigger if exists agri_lesson_progress_set_updated_at on public.agri_lesson_progress;
create trigger agri_lesson_progress_set_updated_at
before update on public.agri_lesson_progress
for each row execute function public.agri_set_updated_at();

drop trigger if exists agri_create_profile_after_signup on auth.users;
create trigger agri_create_profile_after_signup
after insert on auth.users
for each row execute function public.agri_create_profile_for_auth_user();

insert into public.agri_profiles (id, full_name)
select
  users.id,
  coalesce(nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''), 'Agriculteur')
from auth.users as users
on conflict (id) do nothing;

alter table public.agri_profiles enable row level security;
alter table public.agri_courses enable row level security;
alter table public.agri_lessons enable row level security;
alter table public.agri_enrollments enable row level security;
alter table public.agri_lesson_progress enable row level security;

revoke all on public.agri_profiles, public.agri_courses, public.agri_lessons,
  public.agri_enrollments, public.agri_lesson_progress from anon, authenticated;

grant select on public.agri_profiles to authenticated;
grant update (full_name) on public.agri_profiles to authenticated;

grant select on public.agri_courses to anon, authenticated;
grant insert, update, delete on public.agri_courses to authenticated;

grant select on public.agri_lessons to anon, authenticated;
grant insert, update, delete on public.agri_lessons to authenticated;

grant select, insert on public.agri_enrollments to authenticated;
grant select, insert, update on public.agri_lesson_progress to authenticated;

revoke all on function public.agri_set_updated_at() from public, anon, authenticated;
revoke all on function public.agri_create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.is_agri_admin() from public, anon;
grant execute on function public.is_agri_admin() to authenticated;

drop policy if exists "agri profile owner or admin reads profiles" on public.agri_profiles;
create policy "agri profile owner or admin reads profiles"
on public.agri_profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_agri_admin()));

drop policy if exists "agri profile owner or admin updates name" on public.agri_profiles;
create policy "agri profile owner or admin updates name"
on public.agri_profiles for update to authenticated
using (id = (select auth.uid()) or (select public.is_agri_admin()))
with check (id = (select auth.uid()) or (select public.is_agri_admin()));

drop policy if exists "agri visitors read published courses" on public.agri_courses;
create policy "agri visitors read published courses"
on public.agri_courses for select to anon
using (is_published);

drop policy if exists "agri members read published enrolled or admin courses" on public.agri_courses;
create policy "agri members read published enrolled or admin courses"
on public.agri_courses for select to authenticated
using (
  is_published
  or (select public.is_agri_admin())
  or exists (
    select 1 from public.agri_enrollments as enrollment
    where enrollment.course_id = id
      and enrollment.user_id = (select auth.uid())
      and enrollment.status = 'active'
  )
);

drop policy if exists "agri admins manage courses" on public.agri_courses;
create policy "agri admins manage courses"
on public.agri_courses for all to authenticated
using ((select public.is_agri_admin()))
with check ((select public.is_agri_admin()));

drop policy if exists "agri visitors read lessons in published courses" on public.agri_lessons;
create policy "agri visitors read lessons in published courses"
on public.agri_lessons for select to anon
using (
  exists (
    select 1 from public.agri_courses as course
    where course.id = course_id and course.is_published
  )
);

drop policy if exists "agri members read available lessons" on public.agri_lessons;
create policy "agri members read available lessons"
on public.agri_lessons for select to authenticated
using (
  (select public.is_agri_admin())
  or exists (
    select 1 from public.agri_courses as course
    where course.id = course_id and course.is_published
  )
  or exists (
    select 1 from public.agri_enrollments as enrollment
    where enrollment.course_id = course_id
      and enrollment.user_id = (select auth.uid())
      and enrollment.status = 'active'
  )
);

drop policy if exists "agri admins manage lessons" on public.agri_lessons;
create policy "agri admins manage lessons"
on public.agri_lessons for all to authenticated
using ((select public.is_agri_admin()))
with check ((select public.is_agri_admin()));

drop policy if exists "agri users or admins read enrollments" on public.agri_enrollments;
create policy "agri users or admins read enrollments"
on public.agri_enrollments for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_agri_admin()));

drop policy if exists "agri users enroll themselves in published courses" on public.agri_enrollments;
create policy "agri users enroll themselves in published courses"
on public.agri_enrollments for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'active'
  and exists (
    select 1 from public.agri_courses as course
    where course.id = course_id and course.is_published
  )
);

drop policy if exists "agri users or admins read lesson progress" on public.agri_lesson_progress;
create policy "agri users or admins read lesson progress"
on public.agri_lesson_progress for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_agri_admin()));

drop policy if exists "agri users track their enrolled lessons" on public.agri_lesson_progress;
create policy "agri users track their enrolled lessons"
on public.agri_lesson_progress for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.agri_lessons as lesson
    join public.agri_enrollments as enrollment on enrollment.course_id = lesson.course_id
    where lesson.id = lesson_id
      and enrollment.user_id = (select auth.uid())
      and enrollment.status = 'active'
  )
);

drop policy if exists "agri users update their enrolled lesson progress" on public.agri_lesson_progress;
create policy "agri users update their enrolled lesson progress"
on public.agri_lesson_progress for update to authenticated
using (user_id = (select auth.uid()) or (select public.is_agri_admin()))
with check (user_id = (select auth.uid()) or (select public.is_agri_admin()));

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agri_profiles'
  ) then
    alter publication supabase_realtime add table public.agri_profiles;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agri_courses'
  ) then
    alter publication supabase_realtime add table public.agri_courses;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agri_lessons'
  ) then
    alter publication supabase_realtime add table public.agri_lessons;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agri_enrollments'
  ) then
    alter publication supabase_realtime add table public.agri_enrollments;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agri_lesson_progress'
  ) then
    alter publication supabase_realtime add table public.agri_lesson_progress;
  end if;
end;
$$;
