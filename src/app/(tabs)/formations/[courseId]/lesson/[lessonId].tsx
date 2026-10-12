import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import MediaResource from '@/features/learning/MediaResource';
import { supabase } from '@/lib/supabase';
import { completeLesson, getCourse, getLesson, getLessonCompletion, getMyEnrollment, getMyProfile } from '@/features/data/learning';
import type { AgriCourse, AgriEnrollment, AgriLesson } from '@/features/data/database.types';
import { useLiveQuery } from '@/features/data/use-live-query';

const lessonTables = ['agri_lessons', 'agri_lesson_progress'] as const;
type LessonPageData = { lesson: AgriLesson | null; course: AgriCourse | null; enrollment: AgriEnrollment | null; completed: boolean; isAdmin: boolean; userId: string | null };

export default function LessonScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const [saving, setSaving] = useState(false);
  const loadLesson = useCallback(async (): Promise<LessonPageData> => {
    const [{ data: { session } }, lesson] = await Promise.all([supabase.auth.getSession(), getLesson(lessonId)]);
    const course = lesson ? await getCourse(lesson.course_id) : await getCourse(courseId);
    const userId = session?.user.id ?? null;
    if (!userId || !lesson) return { lesson, course, enrollment: null, completed: false, isAdmin: false, userId };

    const [enrollment, profile, completed] = await Promise.all([
      getMyEnrollment(userId, lesson.course_id),
      getMyProfile(userId),
      getLessonCompletion(userId, lesson.id),
    ]);
    return { lesson, course, enrollment, completed, isAdmin: profile?.role === 'admin', userId };
  }, [courseId, lessonId]);

  const { data, loading, refreshing, error, refresh } = useLiveQuery(`lesson-${lessonId}`, lessonTables, loadLesson);

  const handleComplete = async () => {
    if (!data?.userId || !data.lesson) return;
    setSaving(true);
    try {
      await completeLesson(data.userId, data.lesson.id);
      await refresh();
    } catch (caught) {
      Alert.alert('Progression non enregistrée', caught instanceof Error ? caught.message : 'Réessayez dans un instant.');
    } finally {
      setSaving(false);
    }
  };

  const openResource = async (url: string | null) => {
    if (!url || !/^https:\/\//i.test(url)) {
      Alert.alert('Ressource indisponible', 'Le lien de cette ressource n’est pas valide. Contactez l’administrateur du cours.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Ouverture impossible', 'Vérifiez votre connexion puis réessayez.');
    }
  };

  if (loading) return <CenteredState><ActivityIndicator color={Colors.light.primary} /><Text style={styles.muted}>Ouverture de la leçon…</Text></CenteredState>;
  if (error || !data?.lesson) {
    return (
      <CenteredState>
        <Text style={styles.heading}>{error ? 'Leçon indisponible' : 'Cette leçon est introuvable'}</Text>
        {error ? <Text style={styles.muted}>{error}</Text> : null}
        <Pressable onPress={() => void refresh()} style={styles.button}><Text style={styles.buttonText}>Réessayer</Text></Pressable>
        <Pressable onPress={() => router.back()}><Text style={styles.link}>Retour au cours</Text></Pressable>
      </CenteredState>
    );
  }

  const { lesson, course, enrollment, completed, isAdmin, userId } = data;
  const isAllowed = isAdmin || enrollment?.status === 'active';
  if (!isAllowed) {
    return (
      <CenteredState>
        <SymbolView name={{ ios: 'lock.fill', android: 'lock', web: 'lock' } as any} size={32} tintColor={Colors.light.primary} />
        <Text style={styles.heading}>Inscription requise</Text>
        <Text style={styles.muted}>Inscrivez-vous à ce cours pour ouvrir cette leçon et enregistrer votre suivi.</Text>
        <Pressable onPress={() => router.replace({ pathname: '/(tabs)/formations/[courseId]', params: { courseId: course?.id ?? courseId } })} style={styles.button}>
          <Text style={styles.buttonText}>{userId ? 'Voir le cours' : 'Se connecter'}</Text>
        </Pressable>
      </CenteredState>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={Colors.light.primary} />}
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any} size={17} tintColor={Colors.light.primary} />
          <Text style={styles.link}>{course?.title ?? 'Retour au cours'}</Text>
        </Pressable>
        <View style={styles.numberBadge}><Text style={styles.numberText}>LEÇON {lesson.position}</Text></View>
        <Text style={styles.heading}>{lesson.title}</Text>
        {lesson.duration_minutes ? <Text style={styles.muted}>{lesson.duration_minutes} minutes</Text> : null}

        {lesson.media_type !== 'text' ? (
          <MediaResource kind={lesson.media_type} url={lesson.media_url ?? lesson.video_url} />
        ) : null}

        <View style={styles.lessonBody}>
          <Text style={styles.bodyText}>{lesson.content || 'Le contenu de cette leçon sera ajouté prochainement.'}</Text>
        </View>

        {lesson.source_url && lesson.source_url !== lesson.media_url ? (
          <Pressable onPress={() => void openResource(lesson.source_url)} style={styles.sourceLink}>
            <Text style={styles.sourceLinkText}>Ouvrir la source pédagogique</Text>
          </Pressable>
        ) : null}

        {!isAdmin && userId ? (
          <Pressable
            onPress={() => void handleComplete()}
            style={[styles.button, completed && styles.completedButton, saving && styles.disabled]}
            disabled={saving || completed}
            accessibilityRole="button"
          >
            <SymbolView name={{ ios: completed ? 'checkmark.circle.fill' : 'checkmark', android: completed ? 'task_alt' : 'check', web: completed ? 'task_alt' : 'check' } as any} size={18} tintColor="#FFFFFF" />
            <Text style={styles.buttonText}>{completed ? 'Leçon terminée' : saving ? 'Enregistrement…' : 'Marquer comme terminée'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.centered}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F8F6' },
  content: { padding: Spacing.four, paddingBottom: 130 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two, backgroundColor: '#F6F8F6' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: Spacing.four },
  link: { color: Colors.light.primary, fontSize: 13, fontWeight: '700' },
  numberBadge: { alignSelf: 'flex-start', borderRadius: 8, backgroundColor: '#E4EFE7', paddingHorizontal: 10, paddingVertical: 6 },
  numberText: { color: Colors.light.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  heading: { color: '#26332C', fontSize: 25, lineHeight: 31, fontWeight: '800', marginTop: Spacing.two },
  muted: { color: '#69766E', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  lessonBody: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: Spacing.three, marginTop: Spacing.four, borderWidth: 1, borderColor: '#E6ECE8' },
  bodyText: { color: '#344239', fontSize: 15, lineHeight: 25 },
  sourceLink: { alignSelf: 'flex-start', marginTop: Spacing.two, paddingVertical: 6 },
  sourceLinkText: { color: Colors.light.primary, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 12, backgroundColor: Colors.light.accent, paddingHorizontal: Spacing.three, marginTop: Spacing.four },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  completedButton: { backgroundColor: '#477253' },
  disabled: { opacity: 0.6 },
});
