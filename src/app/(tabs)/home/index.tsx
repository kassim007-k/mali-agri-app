import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { getMyLearning } from '@/features/data/learning';
import type { CourseProgress } from '@/features/data/database.types';
import { useLiveQuery, type AgriTableName } from '@/features/data/use-live-query';
import { supabase } from '@/lib/supabase';

const homeTables: AgriTableName[] = ['agri_courses', 'agri_lessons', 'agri_enrollments', 'agri_lesson_progress'];
const noTables: AgriTableName[] = [];

export default function HomeScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    const applySession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!active) return;
      const user = session?.user;
      const fullName = user?.user_metadata?.full_name;
      setUserId(user?.id ?? null);
      setUserName(typeof fullName === 'string' ? fullName.trim() : '');
      setAuthReady(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));
    void supabase.auth.getSession().then(({ data: { session } }) => applySession(session)).catch(() => applySession(null));
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadLearning = useCallback(
    () => userId ? getMyLearning(userId) : Promise.resolve([] as CourseProgress[]),
    [userId],
  );
  const tables = userId ? homeTables : noTables;
  const { data, loading, refreshing, error, refresh } = useLiveQuery(`home-${userId}`, tables, loadLearning);
  const learning = data ?? [];
  const averageProgress = learning.length
    ? Math.round(learning.reduce((total, item) => total + item.progress, 0) / learning.length)
    : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#FFFFFF" />}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{userId ? 'MALI AGRI · VOTRE ESPACE' : 'MALI AGRI · APPRENDRE'}</Text>
          <Text style={styles.title}>{userId ? (userName ? `Bonjour, ${userName}` : 'Votre progression') : 'Bienvenue sur Mali Agri'}</Text>
          <Text style={styles.subtitle}>
            {userId ? 'Reprenez vos cours là où vous en étiez.' : 'Parcourez librement les formations. Un compte sera demandé pour ouvrir un cours.'}
          </Text>
          {userId ? (
            <View style={styles.statsRow}>
              <Stat value={`${learning.length}`} label="formations suivies" />
              <View style={styles.divider} />
              <Stat value={`${averageProgress}%`} label="progression moyenne" />
            </View>
          ) : null}
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionKicker}>{userId ? 'VOTRE APPRENTISSAGE' : 'À DÉCOUVRIR'}</Text>
            <Text style={styles.sectionTitle}>{userId ? 'Mes formations' : 'Catalogue des cours'}</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/formations')} style={styles.browseButton}>
            <Text style={styles.browseText}>Explorer</Text>
            <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as any} size={14} tintColor={Colors.light.primary} />
          </Pressable>
        </View>

        {!authReady ? (
          <View style={styles.emptyCard}><ActivityIndicator color={Colors.light.primary} /><Text style={styles.muted}>Vérification de votre compte…</Text></View>
        ) : !userId ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <SymbolView name={{ ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' } as any} size={27} tintColor={Colors.light.primary} />
            </View>
            <Text style={styles.emptyTitle}>Explorez les formations</Text>
            <Text style={styles.emptyDescription}>Consultez les cours d’agriculture et d’élevage. Connectez-vous pour suivre une formation.</Text>
            <Pressable onPress={() => router.push('/(tabs)/formations')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Voir les formations</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/login')} style={styles.guestAuthButton}>
              <Text style={styles.guestAuthText}>Se connecter ou créer un compte</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.emptyCard}><ActivityIndicator color={Colors.light.primary} /><Text style={styles.muted}>Chargement de votre progression…</Text></View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Progression momentanément indisponible</Text>
            <Text style={styles.muted}>{error}</Text>
            <Pressable onPress={() => void refresh()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Actualiser</Text></Pressable>
          </View>
        ) : learning.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <SymbolView name={{ ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' } as any} size={27} tintColor={Colors.light.primary} />
            </View>
            <Text style={styles.emptyTitle}>Votre premier cours vous attend</Text>
            <Text style={styles.emptyDescription}>Parcourez les formations et inscrivez-vous à un sujet qui vous intéresse.</Text>
            <Pressable onPress={() => router.push('/(tabs)/formations')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Voir les formations</Text>
            </Pressable>
          </View>
        ) : (
          learning.map((item) => <LearningCard key={item.course.id} item={item} />)
        )}

        {userId ? (
          <View style={styles.liveNote}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Le suivi se met à jour automatiquement.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function LearningCard({ item }: { item: CourseProgress }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(tabs)/formations/[courseId]', params: { courseId: item.course.id } })}
      style={({ pressed }) => [styles.courseCard, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.courseTop}>
        <View style={styles.courseIcon}><SymbolView name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' } as any} size={22} tintColor={Colors.light.primary} /></View>
        <View style={styles.courseHeading}>
          <Text style={styles.courseCategory}>{item.course.category}</Text>
          <Text style={styles.courseTitle}>{item.course.title}</Text>
        </View>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any} size={16} tintColor="#87938A" />
      </View>
      <View style={styles.progressInfo}>
        <Text style={styles.muted}>{item.completedLessons} / {item.totalLessons} leçons terminées</Text>
        <Text style={styles.progressValue}>{item.progress}%</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${item.progress}%` }]} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F8F6' },
  content: { paddingBottom: 130 },
  hero: { backgroundColor: Colors.light.primary, paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  eyebrow: { color: '#B9CDBF', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontSize: 26, lineHeight: 33, fontWeight: '800', marginTop: 7 },
  subtitle: { color: '#DDE9E0', fontSize: 14, lineHeight: 20, marginTop: 5 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.four },
  stat: { flex: 1 },
  statValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#C4D5CA', fontSize: 11, marginTop: 2 },
  divider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.24)', marginHorizontal: Spacing.three },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginHorizontal: Spacing.four, marginTop: Spacing.four, marginBottom: Spacing.three },
  sectionKicker: { color: Colors.light.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  sectionTitle: { color: '#26332C', fontSize: 20, fontWeight: '800', marginTop: 3 },
  browseButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 7 },
  browseText: { color: Colors.light.primary, fontSize: 12, fontWeight: '800' },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, marginHorizontal: Spacing.four, padding: Spacing.four, borderWidth: 1, borderColor: '#E8EEE9', gap: 9 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F1EA' },
  emptyTitle: { color: '#26332C', fontSize: 16, lineHeight: 21, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { color: '#69766E', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  muted: { color: '#69766E', fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.accent, paddingHorizontal: Spacing.four, borderRadius: 11, marginTop: Spacing.one },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  guestAuthButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two, marginTop: 2 },
  guestAuthText: { color: Colors.light.primary, fontSize: 12, fontWeight: '800' },
  courseCard: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: Spacing.three, marginHorizontal: Spacing.four, marginBottom: Spacing.three, borderWidth: 1, borderColor: '#E8EEE9', shadowColor: '#143322', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  pressed: { opacity: 0.84 },
  courseTop: { flexDirection: 'row', alignItems: 'center' },
  courseIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E5F0E8', alignItems: 'center', justifyContent: 'center' },
  courseHeading: { flex: 1, marginHorizontal: Spacing.two },
  courseCategory: { color: Colors.light.accent, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  courseTitle: { color: '#26332C', fontSize: 15, lineHeight: 20, fontWeight: '800' },
  progressInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.three, marginBottom: 6 },
  progressValue: { color: Colors.light.primary, fontSize: 12, fontWeight: '800' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: '#E7ECE8' },
  fill: { height: '100%', backgroundColor: Colors.light.accent, borderRadius: 3 },
  liveNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: Spacing.one },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4E9461' },
  liveText: { color: '#7A877F', fontSize: 11 },
});
