export type AgriRole = 'user' | 'admin';

export type AgriProfile = {
  id: string;
  full_name: string;
  role: AgriRole;
  created_at: string;
  updated_at: string;
};

export type AgriCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  language: 'fr' | 'bm';
  level: string;
  duration_minutes: number | null;
  cover_url: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AgriLesson = {
  id: string;
  course_id: string;
  title: string;
  content: string;
  video_url: string | null;
  media_type: 'text' | 'video' | 'audio';
  media_url: string | null;
  source_url: string | null;
  position: number;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type AgriEnrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: 'active' | 'completed' | 'cancelled';
  enrolled_at: string;
};

export type AgriLessonProgress = {
  user_id: string;
  lesson_id: string;
  is_completed: boolean;
  completed_at: string | null;
  updated_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      agri_profiles: Table<
        AgriProfile,
        Pick<AgriProfile, 'id' | 'full_name'>,
        Pick<AgriProfile, 'full_name'>
      >;
      agri_courses: Table<
        AgriCourse,
        Omit<AgriCourse, 'id' | 'created_at' | 'updated_at'>,
        Partial<Omit<AgriCourse, 'id' | 'created_at' | 'updated_at'>>
      >;
      agri_lessons: Table<
        AgriLesson,
        Omit<AgriLesson, 'id' | 'created_at' | 'updated_at'>,
        Partial<Omit<AgriLesson, 'id' | 'created_at' | 'updated_at'>>
      >;
      agri_enrollments: Table<
        AgriEnrollment,
        Pick<AgriEnrollment, 'user_id' | 'course_id'>,
        Partial<Pick<AgriEnrollment, 'status'>>
      >;
      agri_lesson_progress: Table<
        AgriLessonProgress,
        Pick<AgriLessonProgress, 'user_id' | 'lesson_id'> &
          Partial<Pick<AgriLessonProgress, 'is_completed' | 'completed_at'>>,
        Pick<AgriLessonProgress, 'is_completed' | 'completed_at'>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_agri_admin: { Args: Record<string, never>; Returns: boolean };
      set_agri_user_role: { Args: { target_user_id: string; new_role: AgriRole }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type CourseProgress = {
  course: AgriCourse;
  completedLessons: number;
  totalLessons: number;
  progress: number;
};

export type CourseCatalogItem = {
  course: AgriCourse;
  lessonCount: number;
};
