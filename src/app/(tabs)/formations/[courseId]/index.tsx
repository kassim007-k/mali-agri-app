import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { createLesson, enrollInCourse, getCourse, getLessons, getMyEnrollment, getMyProfile, setCoursePublished, updateCourse, updateLesson } from '@/features/data/learning';
import type { AgriCourse, AgriEnrollment, AgriLesson } from '@/features/data/database.types';
import { useLiveQuery } from '@/features/data/use-live-query';

const courseTables = ['agri_courses', 'agri_lessons', 'agri_enrollments'] as const;
type CoursePageData = { course: AgriCourse | null; lessons: AgriLesson[]; enrollment: AgriEnrollment | null; isAdmin: boolean; userId: string | null };

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [actionLoading, setActionLoading] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonMediaType, setLessonMediaType] = useState<AgriLesson['media_type']>('text');
  const [lessonMediaUrl, setLessonMediaUrl] = useState('');
  const [lessonSourceUrl, setLessonSourceUrl] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseCategory, setCourseCategory] = useState('');
  const [courseLevel, setCourseLevel] = useState('');
  const [courseLanguage, setCourseLanguage] = useState<'fr' | 'bm'>('fr');
  const [editingCourse, setEditingCourse] = useState(false);
  const loadPage = useCallback(async (): Promise<CoursePageData> => {
    const [{ data: { session } }, course, lessons] = await Promise.all([
      supabase.auth.getSession(),
      getCourse(courseId),
      getLessons(courseId),
    ]);
    const userId = session?.user.id ?? null;
    if (!userId) return { course, lessons, enrollment: null, isAdmin: false, userId: null };

    const [enrollment, profile] = await Promise.all([
      getMyEnrollment(userId, courseId),
      getMyProfile(userId),
    ]);
    return { course, lessons, enrollment, isAdmin: profile?.role === 'admin', userId };
  }, [courseId]);

  const { data, loading, refreshing, error, refresh } = useLiveQuery(`course-${courseId}`, courseTables, loadPage);

  const handleEnroll = async () => {
    if (!data?.userId) {
      router.push('/login');
      return;
    }
    setActionLoading(true);
    try {
      await enrollInCourse(data.userId, courseId);
      await refresh();
    } catch (caught) {
      Alert.alert('Inscription impossible', caught instanceof Error ? caught.message : 'Réessayez dans un instant.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!data?.course) return;
    setActionLoading(true);
    try {
      await setCoursePublished(data.course.id, !data.course.is_published);
      await refresh();
    } catch (caught) {
      Alert.alert('Modification impossible', caught instanceof Error ? caught.message : 'Réessayez dans un instant.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!data?.course || !courseTitle.trim() || !courseCategory.trim()) {
      Alert.alert('Informations manquantes', 'Le titre et la catégorie sont nécessaires.');
      return;
    }
    setActionLoading(true);
    try {
      await updateCourse(data.course.id, {
        title: courseTitle,
        description: courseDescription,
        category: courseCategory,
        level: courseLevel,
        language: courseLanguage,
      });
      setEditingCourse(false);
      await refresh();
    } catch (caught) {
      Alert.alert('Modification impossible', caught instanceof Error ? caught.message : 'Réessayez dans un instant.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddLesson = async () => {
    if (!data?.course || !lessonTitle.trim() || (lessonMediaType !== 'text' && !/^https:\/\//i.test(lessonMediaUrl.trim())) || (lessonSourceUrl.trim() && !/^https:\/\//i.test(lessonSourceUrl.trim()))) {
      Alert.alert('Informations manquantes', lessonMediaType === 'text' ? 'Saisissez le titre de la leçon.' : 'Ajoutez un lien HTTPS pour le média.');
      return;
    }
    setActionLoading(true);
    try {
      await createLesson(data.course.id, lessonTitle, lessonContent, data.lessons.length + 1, lessonMediaType, lessonMediaUrl, lessonSourceUrl);
      setLessonTitle('');
      setLessonContent('');
      setLessonMediaType('text');
      setLessonMediaUrl('');
      setLessonSourceUrl('');
      await refresh();
    } catch (caught) {
      Alert.alert('Ajout impossible', caught instanceof Error ? caught.message : 'Réessayez dans un instant.');
    } finally {
      setActionLoading(false);
    }
  };

  const beginLessonEdit = (lesson: AgriLesson) => {
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content);
    setLessonMediaType(lesson.media_type ?? (lesson.video_url ? 'video' : 'text'));
    setLessonMediaUrl(lesson.media_url ?? lesson.video_url ?? '');
    setLessonSourceUrl(lesson.source_url ?? '');
  };

  const handleSaveLesson = async () => {
    if (!editingLessonId || !lessonTitle.trim() || (lessonMediaType !== 'text' && !/^https:\/\//i.test(lessonMediaUrl.trim())) || (lessonSourceUrl.trim() && !/^https:\/\//i.test(lessonSourceUrl.trim()))) {
      Alert.alert('Informations manquantes', 'Vérifiez le titre et le lien HTTPS du média.');
      return;
    }
    setActionLoading(true);
    try {
      await updateLesson(editingLessonId, {
        title: lessonTitle,
        content: lessonContent,
        media_type: lessonMediaType,
        media_url: lessonMediaUrl || null,
        source_url: lessonSourceUrl || null,
      });
      setEditingLessonId(null);
      setLessonTitle('');
      setLessonContent('');
      setLessonMediaUrl('');
      setLessonSourceUrl('');
      await refresh();
    } catch (caught) {
      Alert.alert('Modification impossible', caught instanceof Error ? caught.message : 'Réessayez dans un instant.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <CenteredState><ActivityIndicator color={Colors.light.primary} /><Text style={styles.muted}>Chargement du cours…</Text></CenteredState>;
  }

  if (error || !data?.course) {
    return (
      <CenteredState>
        <Text style={styles.title}>{error ? 'Chargement impossible' : 'Cours introuvable'}</Text>
        {error ? <Text style={styles.muted}>{error}</Text> : null}
        <Pressable onPress={() => void refresh()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Réessayer</Text></Pressable>
        <Pressable onPress={() => router.back()}><Text style={styles.linkText}>Retour au catalogue</Text></Pressable>
      </CenteredState>
    );
  }

  const { course, lessons, enrollment, isAdmin, userId } = data;
  const isEnrolled = enrollment?.status === 'active';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={Colors.light.primary} />}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any} size={17} tintColor={Colors.light.primary} />
          <Text style={styles.backText}>Catalogue</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.category}>{course.category} · {course.level} · {course.language === 'bm' ? 'Bambara' : 'Français'}</Text>
          <Text style={styles.title}>{course.title}</Text>
          <Text style={styles.description}>{course.description || 'Découvrez le programme détaillé de cette formation.'}</Text>
          <View style={styles.metrics}>
            <Text style={styles.metric}>{lessons.length} leçon{lessons.length === 1 ? '' : 's'}</Text>
            {course.duration_minutes ? <Text style={styles.metric}>{Math.ceil(course.duration_minutes / 60)} h au total</Text> : null}
            {isAdmin ? <Text style={[styles.metric, course.is_published ? styles.published : styles.draft]}>{course.is_published ? 'Publié' : 'Brouillon'}</Text> : null}
          </View>
        </View>

        {isAdmin ? (
          <View style={styles.adminPanel}>
            <Text style={styles.adminHeading}>Gestion du cours</Text>
            {!editingCourse ? (
              <Pressable onPress={() => {
                setCourseTitle(course.title);
                setCourseDescription(course.description);
                setCourseCategory(course.category);
                setCourseLevel(course.level);
                setCourseLanguage(course.language);
                setEditingCourse(true);
              }} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Modifier la fiche du cours</Text>
              </Pressable>
            ) : (
              <View style={styles.editCard}>
                <TextInput value={courseTitle} onChangeText={setCourseTitle} placeholder="Titre du cours" style={styles.input} editable={!actionLoading} maxLength={140} />
                <TextInput value={courseCategory} onChangeText={setCourseCategory} placeholder="Catégorie" style={styles.input} editable={!actionLoading} maxLength={50} />
                <TextInput value={courseLevel} onChangeText={setCourseLevel} placeholder="Niveau" style={styles.input} editable={!actionLoading} maxLength={50} />
                <TextInput value={courseDescription} onChangeText={setCourseDescription} placeholder="Présentation et objectifs" style={[styles.input, styles.multiline]} multiline textAlignVertical="top" editable={!actionLoading} maxLength={1200} />
                <Text style={styles.formLabel}>Langue</Text>
                <LanguagePicker value={courseLanguage} onChange={setCourseLanguage} />
                <Pressable onPress={() => void handleSaveCourse()} style={[styles.primaryButton, actionLoading && styles.disabled]} disabled={actionLoading}>
                  <Text style={styles.primaryButtonText}>{actionLoading ? 'Enregistrement…' : 'Enregistrer les modifications'}</Text>
                </Pressable>
                <Pressable onPress={() => setEditingCourse(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Annuler</Text></Pressable>
              </View>
            )}
            <Pressable onPress={() => void handlePublish()} style={[styles.primaryButton, actionLoading && styles.disabled]} disabled={actionLoading}>
              <Text style={styles.primaryButtonText}>{course.is_published ? 'Retirer de la publication' : 'Publier ce cours'}</Text>
            </Pressable>
            <Text style={styles.formLabel}>Ajouter une leçon</Text>
            <TextInput value={lessonTitle} onChangeText={setLessonTitle} placeholder="Titre de la leçon" style={styles.input} editable={!actionLoading} />
            <TextInput value={lessonContent} onChangeText={setLessonContent} placeholder="Contenu pédagogique (facultatif pour un média)" style={[styles.input, styles.multiline]} multiline textAlignVertical="top" editable={!actionLoading} />
            <MediaTypePicker value={lessonMediaType} onChange={setLessonMediaType} />
            {lessonMediaType !== 'text' ? <TextInput value={lessonMediaUrl} onChangeText={setLessonMediaUrl} placeholder="Lien HTTPS du fichier ou de la page média" style={styles.input} keyboardType="url" autoCapitalize="none" editable={!actionLoading} /> : null}
            <TextInput value={lessonSourceUrl} onChangeText={setLessonSourceUrl} placeholder="Lien de la source (facultatif)" style={styles.input} keyboardType="url" autoCapitalize="none" editable={!actionLoading} />
            <Pressable onPress={() => void handleAddLesson()} style={[styles.secondaryButton, actionLoading && styles.disabled]} disabled={actionLoading}>
              <Text style={styles.secondaryButtonText}>{actionLoading ? 'Enregistrement…' : 'Ajouter la leçon'}</Text>
            </Pressable>
          </View>
        ) : !isEnrolled ? (
          <View style={styles.enrollPanel}>
            <Text style={styles.enrollTitle}>Prêt à commencer ?</Text>
            <Text style={styles.muted}>Inscrivez-vous gratuitement pour suivre votre progression.</Text>
            <Pressable onPress={() => void handleEnroll()} style={[styles.primaryButton, actionLoading && styles.disabled]} disabled={actionLoading}>
              <Text style={styles.primaryButtonText}>{actionLoading ? 'Inscription…' : userId ? 'Commencer la formation' : 'Se connecter pour commencer'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Programme</Text>
          <Text style={styles.muted}>{lessons.length} leçon{lessons.length === 1 ? '' : 's'}</Text>
        </View>

        {lessons.length > 0 ? lessons.map((lesson, index) => (
          <View key={lesson.id} style={styles.lessonCard}>
            <Pressable
              onPress={() => {
                if (!isEnrolled && !isAdmin) {
                  Alert.alert('Inscription requise', 'Inscrivez-vous à cette formation pour ouvrir les leçons.');
                  return;
                }
                router.push({ pathname: '/(tabs)/formations/[courseId]/lesson/[lessonId]', params: { courseId: course.id, lessonId: lesson.id } });
              }}
              style={styles.lessonRow}
              accessibilityRole="button"
            >
              <View style={styles.lessonNumber}><Text style={styles.lessonNumberText}>{index + 1}</Text></View>
              <View style={styles.lessonDetails}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.muted}>{lesson.media_type === 'video' ? 'Vidéo' : lesson.media_type === 'audio' ? 'Audio' : 'Écrit'}{lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ''}</Text>
              </View>
              <SymbolView name={{ ios: isEnrolled || isAdmin ? 'play.circle.fill' : 'lock.fill', android: isEnrolled || isAdmin ? 'play_circle' : 'lock', web: isEnrolled || isAdmin ? 'play_circle' : 'lock' } as any} size={22} tintColor={Colors.light.accent} />
            </Pressable>
            {isAdmin ? <Pressable onPress={() => beginLessonEdit(lesson)} style={styles.editLessonButton}><Text style={styles.editLessonText}>Modifier cette leçon</Text></Pressable> : null}
            {editingLessonId === lesson.id ? (
              <View style={styles.editCard}>
                <TextInput value={lessonTitle} onChangeText={setLessonTitle} placeholder="Titre" style={styles.input} editable={!actionLoading} />
                <TextInput value={lessonContent} onChangeText={setLessonContent} placeholder="Contenu pédagogique" style={[styles.input, styles.multiline]} multiline textAlignVertical="top" editable={!actionLoading} />
                <MediaTypePicker value={lessonMediaType} onChange={setLessonMediaType} />
                {lessonMediaType !== 'text' ? <TextInput value={lessonMediaUrl} onChangeText={setLessonMediaUrl} placeholder="Lien HTTPS du média" style={styles.input} keyboardType="url" autoCapitalize="none" editable={!actionLoading} /> : null}
                <TextInput value={lessonSourceUrl} onChangeText={setLessonSourceUrl} placeholder="Lien de la source (facultatif)" style={styles.input} keyboardType="url" autoCapitalize="none" editable={!actionLoading} />
                <Pressable onPress={() => void handleSaveLesson()} style={[styles.primaryButton, actionLoading && styles.disabled]} disabled={actionLoading}>
                  <Text style={styles.primaryButtonText}>{actionLoading ? 'Enregistrement…' : 'Enregistrer les modifications'}</Text>
                </Pressable>
                <Pressable onPress={() => setEditingLessonId(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Annuler</Text></Pressable>
              </View>
            ) : null}
          </View>
        )) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{isAdmin ? 'Ajoutez la première leçon' : 'Le programme sera bientôt disponible'}</Text>
            <Text style={styles.muted}>{isAdmin ? 'Les leçons apparaîtront ici après leur création.' : 'Revenez plus tard pour découvrir le contenu du cours.'}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.centered}>{children}</SafeAreaView>;
}

function LanguagePicker({ value, onChange }: { value: 'fr' | 'bm'; onChange: (value: 'fr' | 'bm') => void }) {
  return (
    <View style={styles.choiceRow}>
      {([{ value: 'fr', label: 'Français' }, { value: 'bm', label: 'Bambara' }] as const).map((item) => (
        <Pressable key={item.value} onPress={() => onChange(item.value)} style={[styles.choice, value === item.value && styles.choiceActive]} accessibilityRole="button" accessibilityState={{ selected: value === item.value }}>
          <Text style={[styles.choiceText, value === item.value && styles.choiceTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MediaTypePicker({ value, onChange }: { value: AgriLesson['media_type']; onChange: (value: AgriLesson['media_type']) => void }) {
  const options = [
    { value: 'text', label: 'Écrit' },
    { value: 'video', label: 'Vidéo' },
    { value: 'audio', label: 'Audio' },
  ] as const;
  return (
    <View style={styles.choiceRow}>
      {options.map((item) => (
        <Pressable key={item.value} onPress={() => onChange(item.value)} style={[styles.choice, value === item.value && styles.choiceActive]} accessibilityRole="button" accessibilityState={{ selected: value === item.value }}>
          <Text style={[styles.choiceText, value === item.value && styles.choiceTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F8F6' },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: 130 },
  centered: { flex: 1, backgroundColor: '#F6F8F6', alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingVertical: Spacing.two, paddingRight: Spacing.three },
  backText: { color: Colors.light.primary, fontSize: 13, fontWeight: '700' },
  hero: { backgroundColor: Colors.light.primary, borderRadius: 22, padding: Spacing.four, marginTop: Spacing.two },
  category: { color: '#E9B37E', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 26, lineHeight: 32, fontWeight: '800', marginTop: Spacing.two },
  description: { color: '#DDE9E0', fontSize: 14, lineHeight: 21, marginTop: Spacing.two },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.three },
  metric: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  published: { color: '#DDF1E2' },
  draft: { color: '#FFE2C7' },
  enrollPanel: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: Spacing.three, marginTop: Spacing.three, gap: 8, borderWidth: 1, borderColor: '#E6ECE8' },
  enrollTitle: { color: '#26332C', fontSize: 16, fontWeight: '800' },
  muted: { color: '#69766E', fontSize: 12, lineHeight: 18 },
  primaryButton: { backgroundColor: Colors.light.accent, alignItems: 'center', justifyContent: 'center', minHeight: 46, paddingHorizontal: Spacing.three, borderRadius: 12, marginTop: Spacing.two },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.four, marginBottom: Spacing.two },
  sectionTitle: { color: '#26332C', fontSize: 19, fontWeight: '800' },
  lessonCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: Spacing.two, borderWidth: 1, borderColor: '#E8EEE9', overflow: 'hidden' },
  lessonRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three },
  lessonNumber: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2EC' },
  lessonNumberText: { color: Colors.light.primary, fontWeight: '800', fontSize: 13 },
  lessonDetails: { flex: 1, marginHorizontal: Spacing.two },
  lessonTitle: { color: '#26332C', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  editLessonButton: { alignSelf: 'flex-start', marginHorizontal: Spacing.three, marginBottom: Spacing.two, paddingVertical: 7 },
  editLessonText: { color: Colors.light.primary, fontSize: 12, fontWeight: '800' },
  emptyBox: { alignItems: 'center', padding: Spacing.four, borderRadius: 16, backgroundColor: '#FFFFFF', gap: 7 },
  emptyTitle: { color: '#26332C', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  adminPanel: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: Spacing.three, marginTop: Spacing.three, borderWidth: 1, borderColor: '#E6ECE8' },
  adminHeading: { color: Colors.light.primary, fontSize: 16, fontWeight: '800', marginBottom: Spacing.one },
  formLabel: { color: '#26332C', fontSize: 13, fontWeight: '700', marginTop: Spacing.three, marginBottom: Spacing.one },
  editCard: { backgroundColor: '#F7FAF7', padding: Spacing.two, borderRadius: 12, marginTop: Spacing.two },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.two },
  choice: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#DEE7E1', paddingHorizontal: 14, backgroundColor: '#FFFFFF' },
  choiceActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  choiceText: { color: '#516158', fontSize: 12, fontWeight: '700' },
  choiceTextActive: { color: '#FFFFFF' },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#E1E8E3', borderRadius: 10, paddingHorizontal: 12, color: '#26332C', backgroundColor: '#FAFCFA', marginTop: Spacing.two },
  multiline: { minHeight: 104, paddingTop: 12 },
  secondaryButton: { alignItems: 'center', borderRadius: 11, backgroundColor: '#E8F0EA', paddingVertical: 12, marginTop: Spacing.two },
  secondaryButtonText: { color: Colors.light.primary, fontSize: 13, fontWeight: '800' },
  cancelButton: { alignItems: 'center', paddingVertical: 10, marginTop: 3 },
  cancelText: { color: '#718077', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.58 },
  linkText: { color: Colors.light.primary, fontSize: 13, fontWeight: '700', marginTop: 4 },
});
