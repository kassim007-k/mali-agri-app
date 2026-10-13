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

export async function sendNotification(userId: string, title: string, content: string): Promise<void> {
  const { error } = await supabase.from('agri_notifications').insert({
    user_id: userId,
    title: title.trim(),
    content: content.trim(),
  });
  throwIfError(error);
}

export async function broadcastMessage(title: string, content: string): Promise<void> {
  const { error } = await supabase.rpc('broadcast_agri_message', {
    msg_title: title,
    msg_content: content,
  });
  throwIfError(error);
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
  const safeTitle = (title || 'Nouveau cours').trim();
  const safeDesc = (description || '').trim();
  const safeCat = (category || 'Agriculture').trim();

  // Génération d'un slug unique et robuste
  const slug = `${safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30)}-${Math.random().toString(36).slice(2, 7)}`;

  // Liste ordonnée de payloads, du plus complet au plus basique
  const attempts = [
    { title: safeTitle, description: safeDesc, category: safeCat, language, level, created_by: creatorId?.length > 20 ? creatorId : null, slug, is_published: false },
    { title: safeTitle, description: safeDesc, category: safeCat, language, slug, is_published: false },
    { title: safeTitle, description: safeDesc, category: safeCat, slug, is_published: false },
    { title: safeTitle, slug }
  ];

  let lastError: any = null;

  for (const payload of attempts) {
    try {
      const { data, error } = await supabase
        .from('agri_courses')
        .insert(payload as any)
        .select();

      if (!error) {
        // Si l'insertion a réussi et renvoyé des données
        if (data && data.length > 0) return data[0] as AgriCourse;

        // Si l'insertion a réussi mais n'a rien renvoyé (cas RLS), on tente de récupérer le cours par son slug
        const { data: found } = await supabase.from('agri_courses').select().eq('slug', slug).maybeSingle();
        if (found) return found as AgriCourse;

        // Si on ne trouve toujours rien mais qu'il n'y a pas d'erreur, on considère que c'est un succès partiel
        return { title: safeTitle, slug } as AgriCourse;
      }

      lastError = error;
      // Code 42703 = Colonne inexistante. On continue avec le payload suivant (plus simple).
      const isColumnError = error.code === '42703' || error.message?.toLowerCase().includes('column');
      if (isColumnError) continue;

      // Pour toute autre erreur (ex: contrainte de clé unique), on arrête.
      break;
    } catch (err: any) {
      lastError = err;
      if (!err.message?.toLowerCase().includes('column')) break;
    }
  }

  throw new Error(lastError?.message || "Échec de la création du cours. Veuillez vérifier votre connexion.");
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase.from('agri_courses').delete().eq('id', courseId);
  throwIfError(error);
}

export async function updateCourse(
  courseId: string,
  values: Pick<AgriCourse, 'title' | 'description' | 'category' | 'level' | 'language'>,
): Promise<void> {
  const payload = {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category.trim(),
    level: values.level.trim() || 'Tous niveaux',
    language: values.language,
  };

  const { error } = await supabase.from('agri_courses').update(payload).eq('id', courseId);

  if (error && (error.code === '42703' || error.message?.toLowerCase().includes('column'))) {
    // Retry without level and language if they don't exist in DB
    const fallbackPayload = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category.trim(),
    };
    const { error: error2 } = await supabase.from('agri_courses').update(fallbackPayload).eq('id', courseId);
    throwIfError(error2);
    return;
  }

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
  const safeTitle = (title || 'Nouvelle leçon').trim();
  const safeContent = (content || '').trim();
  const safeMediaUrl = mediaUrl?.trim() || null;
  const safeSourceUrl = sourceUrl?.trim() || null;

  const attempts = [
    {
      course_id: courseId,
      title: safeTitle,
      content: safeContent,
      video_url: mediaType === 'video' ? safeMediaUrl : null,
      media_type: mediaType,
      media_url: mediaType === 'text' ? null : safeMediaUrl,
      source_url: safeSourceUrl,
      position,
    },
    {
      course_id: courseId,
      title: safeTitle,
      content: safeContent,
      video_url: mediaType === 'video' ? safeMediaUrl : null,
      position,
    },
    {
      course_id: courseId,
      title: safeTitle,
      position,
    }
  ];

  let lastError: any = null;
  for (const payload of attempts) {
    try {
      const { data, error } = await supabase
        .from('agri_lessons')
        .insert(payload as any)
        .select()
        .maybeSingle();

      if (!error && data) return data as AgriLesson;

      lastError = error;
      if (error?.code === '42703' || error?.message?.toLowerCase().includes('column')) continue;
      break;
    } catch (err: any) {
      lastError = err;
      if (!err.message?.toLowerCase().includes('column')) break;
    }
  }

  throw new Error(lastError?.message || "Échec de la création de la leçon.");
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabase.from('agri_lessons').delete().eq('id', lessonId);
  throwIfError(error);
}

export async function updateLesson(
  lessonId: string,
  values: Pick<AgriLesson, 'title' | 'content' | 'media_type' | 'media_url' | 'source_url'>,
): Promise<void> {
  const payload = {
    title: values.title.trim(),
    content: values.content.trim(),
    media_type: values.media_type,
    media_url: values.media_type === 'text' ? null : values.media_url?.trim() || null,
    source_url: values.source_url?.trim() || null,
    video_url: values.media_type === 'video' ? values.media_url?.trim() || null : null,
  };

  const { error } = await supabase.from('agri_lessons').update(payload).eq('id', lessonId);

  if (error && (error.code === '42703' || error.message?.toLowerCase().includes('column'))) {
    // Retry without modern media columns
    const fallbackPayload = {
      title: values.title.trim(),
      content: values.content.trim(),
      video_url: values.media_type === 'video' ? values.media_url?.trim() || null : null,
    };
    const { error: error2 } = await supabase.from('agri_lessons').update(fallbackPayload).eq('id', lessonId);
    throwIfError(error2);
    return;
  }

  throwIfError(error);
}

export async function uploadMedia(
  fileUri: string,
  fileName: string,
  bucket: 'course-media' = 'course-media'
): Promise<string> {
  const formData = new FormData();
  const fileExt = fileName.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Sur React Native, on doit construire un objet compatible Blob pour FormData
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}
