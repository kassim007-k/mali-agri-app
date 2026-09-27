import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Colors, Spacing } from '@/constants/theme';

type Category = 'Tous' | 'Cultures' | 'Élevage' | 'Gestion';

const symbols = {
  bell: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  clear: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  sparkle: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  play: { ios: 'play.rectangle.fill', android: 'play_circle', web: 'play_circle' },
  leaf: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
  paw: { ios: 'pawprint.fill', android: 'pets', web: 'pets' },
  water: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  soil: { ios: 'square.stack.3d.up.fill', android: 'layers', web: 'layers' },
  chart: { ios: 'chart.line.uptrend.xyaxis', android: 'monitoring', web: 'monitoring' },
};

type Formation = {
  id: string;
  title: string;
  category: Exclude<Category, 'Tous'>;
  level: string;
  duration: string;
  lessons: string;
  description: string;
  progress: number;
  icon: keyof typeof symbols;
  iconBackground: string;
  featured?: boolean;
};

const categories: Category[] = ['Tous', 'Cultures', 'Élevage', 'Gestion'];

const normalizeText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const formations: Formation[] = [
  {
    id: 'maraichage',
    title: 'Maraîchage en saison sèche',
    category: 'Cultures',
    level: 'Débutant',
    duration: '4 semaines',
    lessons: '18 leçons',
    description: 'Préparez vos planches et réussissez vos récoltes avec moins d’eau.',
    progress: 42,
    icon: 'leaf',
    iconBackground: '#DDEFE4',
    featured: true,
  },
  {
    id: 'bovin',
    title: 'Élevage bovin responsable',
    category: 'Élevage',
    level: 'Intermédiaire',
    duration: '3 semaines',
    lessons: '12 leçons',
    description: 'Améliorez l’alimentation, la santé et le suivi de votre troupeau.',
    progress: 75,
    icon: 'paw',
    iconBackground: '#FBE7D5',
  },
  {
    id: 'irrigation',
    title: 'Irrigation et gestion de l’eau',
    category: 'Gestion',
    level: 'Tous niveaux',
    duration: '2 semaines',
    lessons: '9 leçons',
    description: 'Choisissez une irrigation adaptée à votre parcelle et à votre budget.',
    progress: 20,
    icon: 'water',
    iconBackground: '#DCEAF6',
  },
  {
    id: 'sols',
    title: 'Des sols vivants et fertiles',
    category: 'Cultures',
    level: 'Débutant',
    duration: '10 jours',
    lessons: '8 leçons',
    description: 'Apprenez à nourrir votre sol naturellement, saison après saison.',
    progress: 0,
    icon: 'soil',
    iconBackground: '#EDE6D5',
  },
  {
    id: 'commercialisation',
    title: 'Mieux vendre sa production',
    category: 'Gestion',
    level: 'Intermédiaire',
    duration: '1 semaine',
    lessons: '6 leçons',
    description: 'Calculez vos coûts et trouvez les bons débouchés près de chez vous.',
    progress: 0,
    icon: 'chart',
    iconBackground: '#F3E1D8',
  },
];

export default function FormationsScreen() {
  const [activeCategory, setActiveCategory] = useState<Category>('Tous');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFormations = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery.trim());

    return formations.filter((formation) => {
      const matchesCategory = activeCategory === 'Tous' || formation.category === activeCategory;
      const searchableText = normalizeText(
        `${formation.title} ${formation.category} ${formation.description}`,
      );
      const matchesSearch = !normalizedQuery || searchableText.includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const featuredFormation = filteredFormations.find((formation) => formation.featured);
  const otherFormations = filteredFormations.filter((formation) => !formation.featured);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.hero}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>MALI AGRI • APPRENDRE</Text>
              <Text style={styles.headerTitle}>Nos formations</Text>
            </View>
            <View style={styles.headerIcon}>
            <SymbolView name={symbols.bell as any} size={20} tintColor="#FFFFFF" />
              <View style={styles.notificationDot} />
            </View>
          </View>

          <Text style={styles.heroDescription}>
            Développez vos savoir-faire et faites grandir votre exploitation, à votre rythme.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formations.length}</Text>
              <Text style={styles.statLabel}>cours pratiques</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>domaines clés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>1</Text>
              <Text style={styles.statLabel}>objectif : progresser</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.searchBox}>
            <SymbolView name={symbols.search as any} size={20} tintColor={Colors.light.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher une formation..."
              placeholderTextColor={Colors.light.textSecondary}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Rechercher une formation"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
              >
                <SymbolView name={symbols.clear as any} size={19} tintColor="#A6ACA8" />
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {categories.map((category) => {
              const isActive = activeCategory === category;

              return (
                <Pressable
                  key={category}
                  onPress={() => setActiveCategory(category)}
                  style={[styles.filterChip, isActive && styles.activeFilterChip]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {featuredFormation && (
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionKicker}>À LA UNE</Text>
                  <Text style={styles.sectionTitle}>Le parcours du moment</Text>
                </View>
                <SymbolView name={symbols.sparkle as any} size={22} tintColor={Colors.light.accent} />
              </View>

              <View style={styles.featuredCard}>
                <View style={styles.featuredTopRow}>
                  <View style={styles.featuredIcon}>
                    <SymbolView name={symbols[featuredFormation.icon] as any} size={26} tintColor="#FFFFFF" />
                  </View>
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>LE PLUS SUIVI</Text>
                  </View>
                  <SymbolView
                    name={symbols.leaf as any}
                    size={86}
                    tintColor="rgba(255,255,255,0.12)"
                    style={styles.featuredDecoration}
                  />
                </View>
                <Text style={styles.featuredTitle}>{featuredFormation.title}</Text>
                <Text style={styles.featuredDescription}>{featuredFormation.description}</Text>
                <View style={styles.featuredMetaRow}>
                  <View style={styles.featuredMetaItem}>
                    <SymbolView name={symbols.clock as any} size={14} tintColor="rgba(255,255,255,0.8)" />
                    <Text style={styles.featuredMetaText}>{featuredFormation.duration}</Text>
                  </View>
                  <View style={styles.featuredMetaItem}>
                    <SymbolView name={symbols.play as any} size={14} tintColor="rgba(255,255,255,0.8)" />
                    <Text style={styles.featuredMetaText}>{featuredFormation.lessons}</Text>
                  </View>
                </View>
                <View style={styles.featuredProgressRow}>
                  <View style={styles.featuredProgressTrack}>
                    <View
                      style={[styles.featuredProgressFill, { width: `${featuredFormation.progress}%` }]}
                    />
                  </View>
                  <Text style={styles.featuredProgressText}>{featuredFormation.progress}%</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionKicker}>POUR VOUS</Text>
                <Text style={styles.sectionTitle}>Continuez votre parcours</Text>
              </View>
              <Text style={styles.resultCount}>{filteredFormations.length} cours</Text>
            </View>

            {otherFormations.length > 0 ? (
              otherFormations.map((formation) => (
                <View key={formation.id} style={styles.courseCard}>
                  <View style={styles.courseTopRow}>
                    <View style={[styles.courseIcon, { backgroundColor: formation.iconBackground }]}>
                      <SymbolView name={symbols[formation.icon] as any} size={23} tintColor={Colors.light.primary} />
                    </View>
                    <View style={styles.courseHeading}>
                      <View style={styles.courseCategoryRow}>
                        <Text style={styles.courseCategory}>{formation.category}</Text>
                        <Text style={styles.courseLevel}>{formation.level}</Text>
                      </View>
                      <Text style={styles.courseTitle}>{formation.title}</Text>
                    </View>
                  </View>
                  <Text style={styles.courseDescription}>{formation.description}</Text>
                  <View style={styles.courseMetaRow}>
                    <View style={styles.courseMetaItem}>
                      <SymbolView name={symbols.clock as any} size={15} tintColor={Colors.light.textSecondary} />
                      <Text style={styles.courseMetaText}>{formation.duration}</Text>
                    </View>
                    <View style={styles.courseMetaItem}>
                      <SymbolView name={symbols.play as any} size={15} tintColor={Colors.light.textSecondary} />
                      <Text style={styles.courseMetaText}>{formation.lessons}</Text>
                    </View>
                    <Text style={styles.courseActionText}>
                      {formation.progress > 0 ? 'En cours' : 'À commencer'}
                    </Text>
                  </View>
                  <View style={styles.courseProgressRow}>
                    <View style={styles.courseProgressTrack}>
                      <View style={[styles.courseProgressFill, { width: `${formation.progress}%` }]} />
                    </View>
                    <Text style={styles.courseProgressText}>
                      {formation.progress > 0 ? `${formation.progress}% terminé` : 'Pas encore commencé'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <SymbolView name={symbols.search as any} size={24} tintColor={Colors.light.primary} />
                </View>
                <Text style={styles.emptyTitle}>Aucune formation trouvée</Text>
                <Text style={styles.emptyDescription}>
                  Essayez un autre mot-clé ou choisissez une autre catégorie.
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.footerNote}>De nouveaux contenus pratiques seront ajoutés prochainement.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  hero: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#C5D5CB',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: Spacing.one,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.light.accent,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  heroDescription: {
    maxWidth: 330,
    color: '#E4EEE7',
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: '#B9CDBF',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.two,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F5F3',
    borderRadius: 15,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: '#E5EBE7',
  },
  searchInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 14,
    marginLeft: Spacing.two,
    paddingVertical: 0,
  },
  filterContent: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F4F5F4',
    borderWidth: 1,
    borderColor: '#E4E8E5',
  },
  activeFilterChip: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterText: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  section: {
    marginTop: Spacing.two,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sectionKicker: {
    color: Colors.light.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  sectionTitle: {
    color: '#26332C',
    fontSize: 19,
    fontWeight: '800',
  },
  resultCount: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  featuredCard: {
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    padding: Spacing.three,
    minHeight: 210,
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadge: {
    marginLeft: Spacing.two,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  featuredBadgeText: {
    color: '#E8F1EB',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  featuredDecoration: {
    position: 'absolute',
    right: -12,
    top: -16,
    transform: [{ rotate: '-18deg' }],
  },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginTop: Spacing.three,
    maxWidth: '86%',
  },
  featuredDescription: {
    color: '#CFE0D4',
    fontSize: 13,
    lineHeight: 19,
    marginTop: Spacing.one,
    maxWidth: '92%',
  },
  featuredMetaRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredMetaText: {
    color: '#D9E8DD',
    fontSize: 12,
  },
  featuredProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  featuredProgressTrack: {
    flex: 1,
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  featuredProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#F1B36F',
  },
  featuredProgressText: {
    width: 32,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  courseCard: {
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAF0EC',
    shadowColor: '#153123',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  courseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseHeading: {
    flex: 1,
    marginLeft: Spacing.two,
  },
  courseCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  courseCategory: {
    color: Colors.light.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  courseLevel: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    marginLeft: Spacing.two,
  },
  courseTitle: {
    color: '#26332C',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  courseDescription: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: Spacing.two,
  },
  courseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  courseMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: Spacing.three,
  },
  courseMetaText: {
    color: Colors.light.textSecondary,
    fontSize: 11,
  },
  courseActionText: {
    flex: 1,
    color: Colors.light.primary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  courseProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  courseProgressTrack: {
    flex: 1,
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: '#E7ECE9',
  },
  courseProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.light.accent,
  },
  courseProgressText: {
    minWidth: 86,
    color: Colors.light.textSecondary,
    fontSize: 10,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    borderRadius: 18,
    backgroundColor: '#F5F8F6',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2EEE6',
  },
  emptyTitle: {
    color: '#26332C',
    fontSize: 16,
    fontWeight: '800',
    marginTop: Spacing.two,
  },
  emptyDescription: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  footerNote: {
    color: '#89968E',
    fontSize: 11,
    lineHeight: 16,
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
});
