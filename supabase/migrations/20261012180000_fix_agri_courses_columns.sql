-- Ajout des colonnes manquantes à agri_courses pour correspondre aux types et aux besoins de l'app
alter table public.agri_courses
  add column if not exists level text not null default 'Tous niveaux',
  add column if not exists duration_minutes integer,
  add column if not exists cover_url text,
  add column if not exists created_by uuid references public.agri_profiles(id),
  add column if not exists updated_at timestamptz not null default now();

-- Ajout de updated_at aux autres tables si absent
alter table public.agri_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.agri_lessons add column if not exists updated_at timestamptz not null default now();

-- Trigger pour mettre à jour updated_at automatiquement
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_agri_courses_updated
  before update on public.agri_courses
  for each row execute procedure public.handle_updated_at();

create trigger on_agri_profiles_updated
  before update on public.agri_profiles
  for each row execute procedure public.handle_updated_at();

create trigger on_agri_lessons_updated
  before update on public.agri_lessons
  for each row execute procedure public.handle_updated_at();
