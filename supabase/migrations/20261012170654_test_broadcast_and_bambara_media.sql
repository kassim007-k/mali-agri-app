-- Insertion d'une notification broadcast pour le test
insert into public.agri_notifications (user_id, title, content)
values (null, 'Bienvenue sur Mali Agri !', 'Découvrez nos nouveaux cours en Bambara et en Français.');

-- Ajout de leçons multimédias au cours Bambara "Sagaw ni baw latulôli"
-- On récupère l'ID du cours par son slug
do $$
declare
  course_id_bm uuid;
begin
  select id into course_id_bm from public.agri_courses where slug = 'engraissement-petits-ruminants-bm';

  if course_id_bm is not null then
    -- Leçon Vidéo (Exemple Access Agriculture)
    insert into public.agri_lessons (course_id, title, content, position, media_type, media_url, source_url)
    values (
      course_id_bm,
      'Baganw latulôli dônniya (Vidéo)',
      'A bɛ kalan kɛ baganw latulɔli kɛcogo kan ni kɛnyɛrɛyeli ye.',
      2,
      'video',
      'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4', -- URL de test directe
      'https://www.accessagriculture.org/fr/engraissement-des-moutons-et-des-chevres'
    ) on conflict (course_id, position) do nothing;

    -- Leçon Audio
    insert into public.agri_lessons (course_id, title, content, position, media_type, media_url, source_url)
    values (
      course_id_bm,
      'Fɛn caman minnu bɛ mɔgɔ dɛmɛ baganw ladonni na (Audio)',
      'Audio in bɛ fɛn caman lakali baganw ladonni na.',
      3,
      'audio',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', -- URL de test directe
      'https://www.accessagriculture.org/fr/engraissement-des-moutons-et-des-chevres'
    ) on conflict (course_id, position) do nothing;
  end if;
end;
$$;
