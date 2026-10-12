import { supabase } from '@/lib/supabase';
import type {
  AgriCourse,
  AgriEnrollment,
  AgriLesson,
  AgriLessonProgress,
  AgriProfile,
  CourseCatalogItem,
  CourseProgress,
} from './database.types';

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function getCourses(includeUnpublished = false): Promise<AgriCourse[]> {
  let query = supabase.from('agri_courses').select('*').order('created_at', { ascending: false });
  if (!includeUnpublished) query = query.eq('is_published', true);

  const { data, error } = await query;
  throwIfError(error);
  return data ?? [];
}

export async function getCourseCatalog(includeUnpublished = false): Promise<CourseCatalogItem[]> {
  const courses = await getCourses(includeUnpublished);
  if (courses.length === 0) return [];

  const { data, error } = await supabase
    .from('agri_lessons')
    .select('course_id')
    .in('course_id', courses.map((course) => course.id));
  throwIfError(error);

  const counts = new Map<string, number>();
  for (const lesson of data ?? []) {
    counts.set(lesson.course_id, (counts.get(lesson.course_id) ?? 0) + 1);
  }

  return courses.map((course) => ({ course, lessonCount: counts.get(course.id) ?? 0 }));
}

export async function getCourse(courseId: string): Promise<AgriCourse | null> {
  const { data, error } = await supabase
    .from('agri_courses')
    .select('*')
    .eq('id', courseId)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function getLessons(courseId: string): Promise<AgriLesson[]> {
  const { data, error } = await supabase
    .from('agri_lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('position', { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function getLesson(lessonId: string): Promise<AgriLesson | null> {
  const { data, error } = await supabase
    .from('agri_lessons')
    .select('*')
    .eq('id', lessonId)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function getMyLearning(userId: string): Promise<CourseProgress[]> {
  const { data: enrollments, error: enrollmentError } = await supabase
    .from('agri_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');
  throwIfError(enrollmentError);

  const activeEnrollments = (enrollments ?? []) as AgriEnrollment[];
  const courseIds = activeEnrollments.map((enrollment) => enrollment.course_id);
  if (courseIds.length === 0) return [];

  const [coursesResult, lessonsResult, progressResult] = await Promise.all([
    supabase.from('agri_courses').select('*').in('id', courseIds),
    supabase.from('agri_lessons').select('*').in('course_id', courseIds),
    supabase.from('agri_lesson_progress').select('*').eq('user_id', userId),
  ]);

  throwIfError(coursesResult.error);
  throwIfError(lessonsResult.error);
  throwIfError(progressResult.error);

  const courses = (coursesResult.data ?? []) as AgriCourse[];
  const lessons = (lessonsResult.data ?? []) as AgriLesson[];
  const completedLessonIds = new Set(
    ((progressResult.data ?? []) as AgriLessonProgress[])
      .filter((progress) => progress.is_completed)
      .map((progress) => progress.lesson_id),
  );

  return courses.map((course) => {
    const courseLessons = lessons.filter((lesson) => lesson.course_id === course.id);
    const completedLessons = courseLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;

    return {
      course,
      completedLessons,
      totalLessons: courseLessons.length,
      progress: courseLessons.length === 0 ? 0 : Math.round((completedLessons / courseLessons.length) * 100),
    };
  });
}

export async function getMyEnrollment(userId: string, courseId: string): Promise<AgriEnrollment | null> {
  const { data, error } = await supabase
    .from('agri_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function enrollInCourse(userId: string, courseId: string): Promise<void> {
  const { error } = await supabase.from('agri_enrollments').insert({ user_id: userId, course_id: courseId });
  if (error?.code === '23505') return;
  throwIfError(error);
}

export async function getLessonCompletion(userId: string, lessonId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('agri_lesson_progress')
    .select('is_completed')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  throwIfError(error);
  return data?.is_completed ?? false;
}

export async function completeLesson(userId: string, lessonId: string): Promise<void> {
  const { error } = await supabase.from('agri_lesson_progress').upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      is_completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' },
  );
  throwIfError(error);
}

export async function updateProfileName(userId: string, fullName: string): Promise<void> {
  const { error } = await supabase
    .from('agri_profiles')
    .update({ full_name: fullName.trim() })
    .eq('id', userId);
  throwIfError(error);
}

export async function setUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
  const { error } = await supabase.rpc('set_agri_user_role', {
    target_user_id: userId,
    new_role: role,
  });
  throwIfError(error);
}

export async function getMyProfile(userId: string): Promise<AgriProfile | null> {
  const { data, error } = await supabase
    .from('agri_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export type AdminSnapshot = {
  profiles: AgriProfile[];
  courses: AgriCourse[];
  enrollments: AgriEnrollment[];
  lessonProgress: AgriLessonProgress[];
  lessonCount: number;
};

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  const [profilesResult, coursesResult, enrollmentsResult, lessonsResult, progressResult] = await Promise.all([
    supabase.from('agri_profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('agri_courses').select('*').order('created_at', { ascending: false }),
    supabase.from('agri_enrollments').select('*'),
    supabase.from('agri_lessons').select('id'),
    supabase.from('agri_lesson_progress').select('*'),
  ]);

  throwIfError(profilesResult.error);
  throwIfError(coursesResult.error);
  throwIfError(enrollmentsResult.error);
  throwIfError(lessonsResult.error);
  throwIfError(progressResult.error);

  return {
    profiles: profilesResult.data ?? [],
    courses: coursesResult.data ?? [],
    enrollments: enrollmentsResult.data ?? [],
    lessonProgress: progressResult.data ?? [],
    lessonCount: lessonsResult.data?.length ?? 0,
  };
}

export async function createCourse(
  title: string,
  description: string,
  category: string,
  level: string,
  language: 'fr' | 'bm',
  creatorId: string,
): Promise<AgriCourse> {
  const slugBase = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const { data, error } = await supabase
    .from('agri_courses')
    .insert({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      language,
      level: level.trim() || 'Tous niveaux',
      duration_minutes: null,
      cover_url: null,
      is_published: false,
      created_by: creatorId,
      slug: `${slugBase}-${Date.now().toString(36)}`,
    })
    .select('*')
    .single();
  throwIfError(error);
  if (!data) throw new Error('La création du cours n’a pas renvoyé de résultat.');
  return data;
}

export async function updateCourse(
  courseId: string,
  values: Pick<AgriCourse, 'title' | 'description' | 'category' | 'level' | 'language'>,
): Promise<void> {
  const { error } = await supabase.from('agri_courses').update({
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category.trim(),
    level: values.level.trim() || 'Tous niveaux',
    language: values.language,
  }).eq('id', courseId);
  throwIfError(error);
}

export async function setCoursePublished(courseId: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase.from('agri_courses').update({ is_published: isPublished }).eq('id', courseId);
  throwIfError(error);
}

export async function createLesson(
  courseId: string,
  title: string,
  content: string,
  position: number,
  mediaType: AgriLesson['media_type'],
  mediaUrl: string,
  sourceUrl: string,
): Promise<AgriLesson> {
  const { data, error } = await supabase
    .from('agri_lessons')
    .insert({
      course_id: courseId,
      title: title.trim(),
      content: content.trim(),
      video_url: mediaType === 'video' ? mediaUrl.trim() || null : null,
      media_type: mediaType,
      media_url: mediaType === 'text' ? null : mediaUrl.trim() || null,
      source_url: sourceUrl.trim() || null,
      position,
      duration_minutes: null,
    })
    .select('*')
    .single();
  throwIfError(error);
  if (!data) throw new Error('La création de la leçon n’a pas renvoyé de résultat.');
  return data;
}

export async function updateLesson(
  lessonId: string,
  values: Pick<AgriLesson, 'title' | 'content' | 'media_type' | 'media_url' | 'source_url'>,
): Promise<void> {
  const { error } = await supabase.from('agri_lessons').update({
    title: values.title.trim(),
    content: values.content.trim(),
    media_type: values.media_type,
    media_url: values.media_type === 'text' ? null : values.media_url?.trim() || null,
    source_url: values.source_url?.trim() || null,
    video_url: values.media_type === 'video' ? values.media_url?.trim() || null : null,
  }).eq('id', lessonId);
  throwIfError(error);
}
