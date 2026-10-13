-- Correction des politiques RLS pour permettre aux administrateurs de gérer les cours

-- 1. S'assurer que RLS est activé (pour la sécurité)
alter table public.agri_courses enable row level security;
alter table public.agri_lessons enable row level security;
alter table public.agri_profiles enable row level security;

-- 2. POLITIQUES POUR AGRI_COURSES
drop policy if exists "Admins have full access on agri_courses" on public.agri_courses;
create policy "Admins have full access on agri_courses"
  on public.agri_courses for all
  to authenticated
  using (public.is_agri_admin())
  with check (public.is_agri_admin());

drop policy if exists "Public can view published courses" on public.agri_courses;
create policy "Public can view published courses"
  on public.agri_courses for select
  to anon, authenticated
  using (is_published = true);

-- 3. POLITIQUES POUR AGRI_LESSONS
drop policy if exists "Admins have full access on agri_lessons" on public.agri_lessons;
create policy "Admins have full access on agri_lessons"
  on public.agri_lessons for all
  to authenticated
  using (public.is_agri_admin())
  with check (public.is_agri_admin());

drop policy if exists "Users can view lessons of enrolled courses" on public.agri_lessons;
create policy "Users can view lessons of enrolled courses"
  on public.agri_lessons for select
  to authenticated
  using (
    exists (
      select 1 from public.agri_enrollments
      where user_id = auth.uid() and course_id = agri_lessons.course_id
    ) or public.is_agri_admin()
  );

-- 4. POLITIQUES POUR AGRI_PROFILES
drop policy if exists "Users can view their own profile" on public.agri_profiles;
create policy "Users can view their own profile"
  on public.agri_profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Admins can view all profiles" on public.agri_profiles;
create policy "Admins can view all profiles"
  on public.agri_profiles for select
  to authenticated
  using (public.is_agri_admin());

drop policy if exists "Admins can update profiles" on public.agri_profiles;
create policy "Admins can update profiles"
  on public.agri_profiles for update
  to authenticated
  using (public.is_agri_admin());
