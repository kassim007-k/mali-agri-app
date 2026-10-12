import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { getCourseCatalog } from '@/features/data/learning';
import type { CourseCatalogItem } from '@/features/data/database.types';
import { useLiveQuery } from '@/features/data/use-live-query';
import { supabase } from '@/lib/supabase';

const courseTables = ['agri_courses', 'agri_lessons'] as const;
const emptyCatalog: CourseCatalogItem[] = [];
const iconForCategory = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes('élev') || normalized.includes('elev')) {
    return { ios: 'pawprint.fill', android: 'pets', web: 'pets' };
  }
  if (normalized.includes('eau') || normalized.includes('gestion')) {
    return { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' };
  }
  return { ios: 'leaf.fill', android: 'eco', web: 'eco' };
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function FormationsScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tous');
  const [language, setLanguage] = useState<'all' | 'fr' | 'bm'>('all');
  const loadCourses = useCallback(() => getCourseCatalog(), []);
  const { data, loading, refreshing, error, refresh } = useLiveQuery('catalogue', courseTables, loadCourses);
  const courses = data ?? emptyCatalog;

  const categories = useMemo(
    () => ['Tous', ...Array.from(new Set(courses.map(({ course }) => course.category))).sort()],
    [courses],
  );
  const filteredCourses = useMemo(() => {
    const query = normalize(search.trim());
    return courses.filter(({ course }) => {
      const categoryMatches = category === 'Tous' || course.category === category;
      const languageMatches = language === 'all' || course.language === language;
      const searchMatches = !query || normalize(`${course.title} ${course.description} ${course.category}`).includes(query);
      return categoryMatches && languageMatches && searchMatches;
    });
  }, [category, courses, language, search]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={Colors.light.primary} />}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>MALI AGRI · APPRENDRE</Text>
          <Text style={styles.title}>Nos formations</Text>
          <Text style={styles.subtitle}>Des cours pratiques pour faire grandir votre exploitation.</Text>
          <View style={styles.heroStat}>
            <SymbolView name={{ ios: 'books.vertical.fill', android: 'menu_book', web: 'menu_book' } as any} size={19} tintColor="#F5B36E" />
            <Text style={styles.heroStatText}>{courses.length} parcours disponibles</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' } as any} size={19} tintColor="#64736A" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un cours..."
            placeholderTextColor="#77837B"
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Rechercher un cours"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Effacer la recherche">
              <SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any} size={19} tintColor="#89948D" />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageFilters}>
          {([
            { id: 'all', label: 'Toutes les langues' },
            { id: 'fr', label: 'Français' },
            { id: 'bm', label: 'Bambara' },
          ] as const).map((item) => (
            <Pressable key={item.id} onPress={() => setLanguage(item.id)} style={[styles.filter, language === item.id && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: language === item.id }}>
              <Text style={[styles.filterText, language === item.id && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {categories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.filter, category === item && styles.filterActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: category === item }}
              >
                <Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionKicker}>À VOTRE RYTHME</Text>
            <Text style={styles.sectionTitle}>Catalogue des cours</Text>
          </View>
          <Text style={styles.count}>{filteredCourses.length}</Text>
        </View>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={Colors.light.primary} />
            <Text style={styles.stateText}>Chargement des formations…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateBox}>
            <Text style={styles.emptyTitle}>Impossible de charger les cours</Text>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable onPress={() => void refresh()} style={styles.retryButton} disabled={refreshing}>
              <Text style={styles.retryText}>{refreshing ? 'Actualisation…' : 'Réessayer'}</Text>
            </Pressable>
          </View>
        ) : filteredCourses.length === 0 ? (
          <View style={styles.stateBox}>
            <SymbolView name={{ ios: 'books.vertical', android: 'menu_book', web: 'menu_book' } as any} size={30} tintColor={Colors.light.primary} />
            <Text style={styles.emptyTitle}>{courses.length ? 'Aucun résultat' : 'Les cours arrivent bientôt'}</Text>
            <Text style={styles.stateText}>
              {courses.length ? 'Modifiez la recherche ou choisissez une autre catégorie.' : 'Les formations publiées par l’équipe apparaîtront ici.'}
            </Text>
          </View>
        ) : (
          filteredCourses.map((item) => <CourseCard key={item.course.id} item={item} />)
        )}

        <Text style={styles.footer}>Le catalogue se met à jour dès qu’un cours est publié.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function CourseCard({ item }: { item: CourseCatalogItem }) {
  const { course, lessonCount } = item;
  const openCourse = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push({ pathname: '/(tabs)/formations/[courseId]', params: { courseId: course.id } });
        return;
      }
    } catch {
      // En cas de session illisible, demander une authentification reste le choix sûr.
    }
    router.push({ pathname: '/login', params: { courseId: course.id } });
  };

  return (
    <Pressable
      onPress={() => void openCourse()}
      style={({ pressed }) => [styles.courseCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Voir la formation ${course.title}`}
    >
      <View style={styles.courseTop}>
        <View style={styles.courseIcon}>
          <SymbolView name={iconForCategory(course.category) as any} size={23} tintColor={Colors.light.primary} />
        </View>
        <View style={styles.courseHeading}>
          <Text style={styles.courseCategory}>{course.category}</Text>
          <Text style={styles.courseTitle}>{course.title}</Text>
        </View>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any} size={17} tintColor="#8B968F" />
      </View>
      <Text style={styles.courseDescription} numberOfLines={3}>{course.description || 'Découvrez le programme de cette formation.'}</Text>
      <View style={styles.courseMeta}>
        <Text style={[styles.metaPill, styles.languagePill]}>{course.language === 'bm' ? 'Bambara' : 'Français'}</Text>
        <Text style={styles.metaPill}>{course.level}</Text>
        <View style={styles.metaItem}>
          <SymbolView name={{ ios: 'play.rectangle', android: 'play_lesson', web: 'play_lesson' } as any} size={15} tintColor="#68756C" />
          <Text style={styles.metaText}>{lessonCount} leçon{lessonCount > 1 ? 's' : ''}</Text>
        </View>
        {course.duration_minutes ? <Text style={styles.metaText}>{Math.ceil(course.duration_minutes / 60)} h</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F8F6' },
  content: { paddingBottom: 126 },
  hero: { backgroundColor: Colors.light.primary, paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  eyebrow: { color: '#B9CDBF', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 29, fontWeight: '800', marginTop: 7 },
  subtitle: { color: '#E1ECE4', fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 340 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  heroStatText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', minHeight: 52, marginHorizontal: Spacing.four, marginTop: Spacing.three, paddingHorizontal: Spacing.three, backgroundColor: '#FFFFFF', borderRadius: 15, borderWidth: 1, borderColor: '#E6ECE8' },
  searchInput: { flex: 1, fontSize: 14, color: '#26332C', marginLeft: Spacing.two, paddingVertical: 0 },
  filters: { gap: 8, paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  languageFilters: { gap: 8, paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  filter: { borderRadius: 18, paddingHorizontal: 15, paddingVertical: 9, borderWidth: 1, borderColor: '#E2E9E4', backgroundColor: '#FFFFFF' },
  filterActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  filterText: { color: '#64736A', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginHorizontal: Spacing.four, marginTop: Spacing.three, marginBottom: Spacing.three },
  sectionKicker: { color: Colors.light.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  sectionTitle: { color: '#26332C', fontSize: 19, fontWeight: '800', marginTop: 3 },
  count: { color: '#607067', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  courseCard: { marginHorizontal: Spacing.four, marginBottom: Spacing.three, padding: Spacing.three, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEE9', shadowColor: '#143322', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 9, elevation: 2 },
  pressed: { opacity: 0.84 },
  courseTop: { flexDirection: 'row', alignItems: 'center' },
  courseIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#E5F0E8', alignItems: 'center', justifyContent: 'center' },
  courseHeading: { flex: 1, marginHorizontal: Spacing.two },
  courseCategory: { color: Colors.light.accent, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 },
  courseTitle: { color: '#26332C', fontSize: 16, fontWeight: '800', lineHeight: 21 },
  courseDescription: { color: '#69766E', fontSize: 13, lineHeight: 19, marginTop: Spacing.two },
  courseMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: Spacing.three },
  metaPill: { color: '#486451', backgroundColor: '#EFF5F0', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '700' },
  languagePill: { color: '#76502B', backgroundColor: '#F8EBDD' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: '#68756C', fontSize: 11 },
  stateBox: { alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.four, padding: Spacing.four, minHeight: 160, borderRadius: 18, backgroundColor: '#FFFFFF', gap: 10 },
  stateText: { color: '#69766E', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyTitle: { color: '#26332C', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  retryButton: { backgroundColor: Colors.light.primary, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  footer: { color: '#849088', fontSize: 11, textAlign: 'center', marginHorizontal: Spacing.four, marginTop: Spacing.one },
});
