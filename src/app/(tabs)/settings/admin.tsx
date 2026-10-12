import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { createCourse, getAdminSnapshot, getMyProfile, setUserRole, updateProfileName, type AdminSnapshot } from '@/features/data/learning';
import { useLiveQuery, type AgriTableName } from '@/features/data/use-live-query';
import type { AgriProfile } from '@/features/data/database.types';
import { supabase } from '@/lib/supabase';

const adminTables: AgriTableName[] = ['agri_profiles', 'agri_courses', 'agri_lessons', 'agri_enrollments', 'agri_lesson_progress'];
const noTables: AgriTableName[] = [];
const emptySnapshot: AdminSnapshot = { profiles: [], courses: [], enrollments: [], lessonProgress: [], lessonCount: 0 };

export default function AdminScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<AgriProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Cultures');
  const [level, setLevel] = useState('Tous niveaux');
  const [language, setLanguage] = useState<'fr' | 'bm'>('fr');
  const [creating, setCreating] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState('');
  const [updatingMember, setUpdatingMember] = useState(false);

  useEffect(() => {
    let active = true;
    const loadAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const id = session?.user.id ?? null;
      const email = session?.user.email ?? null;
      const currentProfile = id ? await getMyProfile(id).catch(() => null) : null;
      if (active) {
        setUserId(id);
        setUserEmail(email);
        setProfile(currentProfile);
        setAuthLoading(false);
      }
    };
    const timer = setTimeout(() => void loadAccess(), 0);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      const email = session?.user.email ?? null;
      setUserId(id);
      setUserEmail(email);
      if (!id) {
        setProfile(null);
        setAuthLoading(false);
      } else {
        setAuthLoading(true);
        setTimeout(() => {
          void getMyProfile(id).then((nextProfile) => setProfile(nextProfile)).catch(() => setProfile(null)).finally(() => setAuthLoading(false));
        }, 0);
      }
    });
    return () => { active = false; clearTimeout(timer); subscription.unsubscribe(); };
  }, []);

  const isAdmin = profile?.role === 'admin' || (userEmail && ['ibrahimakeita24@icloud.com', 'kk.boulkassimkeita.keita@gmail.com'].includes(userEmail));
  const loadSnapshot = useCallback(
    () => isAdmin ? getAdminSnapshot() : Promise.resolve(emptySnapshot),
    [isAdmin],
  );
  const tables = isAdmin ? adminTables : noTables;
  const { data: snapshot, loading, refreshing, error, refresh } = useLiveQuery(`admin-${userId ?? 'guest'}`, tables, loadSnapshot);
  const data = snapshot ?? emptySnapshot;

  const accountRows = useMemo(() => data.profiles.map((item) => ({
    profile: item,
    enrollments: data.enrollments.filter((enrollment) => enrollment.user_id === item.id && enrollment.status === 'active').length,
    completedLessons: data.lessonProgress.filter((progress) => progress.user_id === item.id && progress.is_completed).length,
  })), [data]);

  const handleCreateCourse = async () => {
    if (!userId || !title.trim() || !description.trim() || !category.trim()) {
      Alert.alert('Informations incomplètes', 'Le titre, la catégorie et la description sont nécessaires.');
      return;
    }
    setCreating(true);
    try {
      await createCourse(title, description, category, level, language, userId);
      setTitle('');
      setDescription('');
      await refresh();
      Alert.alert('Cours créé', 'Le cours est enregistré en brouillon. Ajoutez des leçons puis publiez-le depuis sa fiche.');
    } catch (caught) {
      Alert.alert('Création impossible', caught instanceof Error ? caught.message : 'Réessayez dans un instant.');
    } finally {
      setCreating(false);
    }
  };

  const saveMemberName = async (memberId: string) => {
    if (!memberName.trim()) {
      Alert.alert('Nom manquant', 'Saisissez le nom du compte.');
      return;
    }
    setUpdatingMember(true);
    try {
      await updateProfileName(memberId, memberName);
      setEditingMemberId(null);
      await refresh();
    } catch (caught) {
      Alert.alert('Modification impossible', caught instanceof Error ? caught.message : 'Réessayez dans un instant.');
    } finally {
      setUpdatingMember(false);
    }
  };

  const confirmRoleChange = (member: AgriProfile) => {
    const nextRole = member.role === 'admin' ? 'user' : 'admin';
    Alert.alert(
      nextRole === 'admin' ? 'Accorder les droits admin ?' : 'Retirer les droits admin ?',
      `Compte : ${member.full_name}\nIdentifiant : ${member.id}\nNouveau rôle : ${nextRole === 'admin' ? 'administrateur' : 'membre'}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: nextRole === 'admin' ? 'Accorder' : 'Retirer',
          style: nextRole === 'admin' ? 'default' : 'destructive',
          onPress: () => {
            setUpdatingMember(true);
            void setUserRole(member.id, nextRole)
              .then(() => refresh())
              .catch((caught: unknown) => Alert.alert('Modification impossible', caught instanceof Error ? caught.message : 'Réessayez dans un instant.'))
              .finally(() => setUpdatingMember(false));
          },
        },
      ],
    );
  };

  if (authLoading || (isAdmin && loading && !snapshot)) {
    return <CenteredState><ActivityIndicator color={Colors.light.primary} /><Text style={styles.muted}>Vérification des accès…</Text></CenteredState>;
  }

  if (!isAdmin) {
    return (
      <CenteredState>
        <SymbolView name={{ ios: 'lock.fill', android: 'lock', web: 'lock' } as any} size={30} tintColor={Colors.light.primary} />
        <Text style={styles.sectionTitle}>Accès réservé</Text>
        <Text style={styles.muted}>Cet espace est accessible uniquement aux comptes administrateurs.</Text>
        <Pressable onPress={() => router.replace('/(tabs)/settings')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Retour aux paramètres</Text></Pressable>
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
          <Text style={styles.backText}>Paramètres</Text>
        </Pressable>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>ADMINISTRATION</Text>
          <Text style={styles.title}>Vue d’ensemble</Text>
          <Text style={styles.subtitle}>Suivez les cours, les membres et l’apprentissage.</Text>
        </View>

        {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void refresh()}><Text style={styles.backText}>Réessayer</Text></Pressable></View> : null}

        <View style={styles.statsGrid}>
          <Metric value={`${data.profiles.length}`} label="comptes" icon={{ ios: 'person.2.fill', android: 'group', web: 'group' }} />
          <Metric value={`${data.courses.length}`} label="cours" icon={{ ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' }} />
          <Metric value={`${data.enrollments.length}`} label="inscriptions" icon={{ ios: 'rectangle.stack.fill', android: 'library_books', web: 'library_books' }} />
          <Metric value={`${data.lessonProgress.filter((row) => row.is_completed).length}`} label="leçons terminées" icon={{ ios: 'checkmark.circle.fill', android: 'task_alt', web: 'task_alt' }} />
        </View>

        <Pressable
          onPress={() => {
            Alert.prompt(
              "Message Global",
              "Envoyer une notification à TOUS les utilisateurs de Mali Agri.",
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Diffuser",
                  onPress: (text) => {
                    if (text) {
                      import('@/features/data/learning').then(m => m.broadcastMessage("Annonce Mali Agri", text))
                      .then(() => Alert.alert("Diffusé", "Le message a été envoyé à tout le monde."))
                      .catch(e => Alert.alert("Erreur", e.message));
                    }
                  }
                }
              ]
            );
          }}
          style={styles.broadcastButton}
        >
          <SymbolView name={{ ios: 'megaphone.fill', android: 'campaign', web: 'campaign' } as any} size={18} tintColor="#FFFFFF" />
          <Text style={styles.broadcastButtonText}>Envoyer un message à tous les membres</Text>
        </Pressable>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Créer un cours</Text>
          <Text style={styles.help}>Un nouveau cours commence en brouillon. Ajoutez les leçons et publiez-le quand il est prêt.</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Titre du cours" style={styles.input} editable={!creating} maxLength={140} />
          <Text style={styles.formLabel}>Langue du cours</Text>
          <View style={styles.languageChoices}>
            {(['fr', 'bm'] as const).map((item) => (
              <Pressable key={item} onPress={() => setLanguage(item)} style={[styles.languageChoice, language === item && styles.languageChoiceActive]} accessibilityRole="button" accessibilityState={{ selected: language === item }}>
                <Text style={[styles.languageChoiceText, language === item && styles.languageChoiceTextActive]}>{item === 'fr' ? 'Français' : 'Bambara'}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={category} onChangeText={setCategory} placeholder="Catégorie (ex. Cultures)" style={styles.input} editable={!creating} maxLength={50} />
          <TextInput value={level} onChangeText={setLevel} placeholder="Niveau" style={styles.input} editable={!creating} maxLength={50} />
          <TextInput value={description} onChangeText={setDescription} placeholder="Présentation et objectifs pédagogiques" style={[styles.input, styles.multiline]} multiline textAlignVertical="top" editable={!creating} maxLength={1200} />
          <Pressable onPress={() => void handleCreateCourse()} style={[styles.primaryButton, creating && styles.disabled]} disabled={creating}>
            <Text style={styles.primaryButtonText}>{creating ? 'Création…' : 'Créer le brouillon'}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Cours ({data.courses.length})</Text>
        </View>
        {data.courses.length ? data.courses.map((course) => (
          <Pressable key={course.id} onPress={() => router.push({ pathname: '/(tabs)/formations/[courseId]', params: { courseId: course.id } })} style={styles.listRow}>
            <View style={styles.listContent}>
              <Text style={styles.listTitle}>{course.title}</Text>
              <Text style={styles.muted}>{course.category} · {course.language === 'bm' ? 'Bambara' : 'Français'} · {course.is_published ? 'Publié' : 'Brouillon'}</Text>
            </View>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any} size={16} tintColor="#89948D" />
          </Pressable>
        )) : <Text style={styles.emptyText}>Aucun cours enregistré.</Text>}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Comptes ({accountRows.length})</Text>
        </View>
        {accountRows.length ? accountRows.map(({ profile: member, enrollments, completedLessons }) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <View style={[styles.memberAvatar, member.role === 'admin' && styles.memberAdmin]}>
                <Text style={styles.avatarText}>{(member.full_name.trim()[0] || 'M').toUpperCase()}</Text>
              </View>
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>{member.full_name || 'Agriculteur'}</Text>
                <Text style={styles.muted}>{member.role === 'admin' ? 'Administrateur' : 'Membre'} · {enrollments} cours · {completedLessons} leçons</Text>
              </View>
            </View>
            {editingMemberId === member.id ? (
              <View style={styles.memberEditor}>
                <TextInput value={memberName} onChangeText={setMemberName} placeholder="Nom du compte" style={styles.input} editable={!updatingMember} maxLength={120} />
                <Pressable onPress={() => void saveMemberName(member.id)} style={[styles.secondaryButton, updatingMember && styles.disabled]} disabled={updatingMember}><Text style={styles.secondaryButtonText}>Enregistrer le nom</Text></Pressable>
                <Pressable onPress={() => setEditingMemberId(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Annuler</Text></Pressable>
              </View>
            ) : (
              <View style={styles.memberActions}>
                <Pressable onPress={() => {
                  Alert.prompt(
                    "Envoyer un message",
                    `À : ${member.full_name}`,
                    [
                      { text: "Annuler", style: "cancel" },
                      {
                        text: "Envoyer",
                        onPress: (text) => {
                          if (text) {
                            import('@/features/data/learning').then(m => m.sendNotification(member.id, "Message de l'admin", text))
                            .then(() => Alert.alert("Succès", "Message envoyé !"))
                            .catch(e => Alert.alert("Erreur", e.message));
                          }
                        }
                      }
                    ]
                  );
                }} style={styles.memberAction}><Text style={styles.memberActionText}>Message</Text></Pressable>
                <Pressable onPress={() => { setMemberName(member.full_name); setEditingMemberId(member.id); }} style={styles.memberAction}><Text style={styles.memberActionText}>Modifier</Text></Pressable>
                <Pressable onPress={() => confirmRoleChange(member)} style={styles.memberAction} disabled={updatingMember || member.id === userId}>
                  <Text style={[styles.memberActionText, member.role === 'admin' && styles.roleRemove]}>{member.id === userId ? 'Moi' : member.role === 'admin' ? 'Retirer admin' : 'Rendre admin'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )) : <Text style={styles.emptyText}>Les comptes créés apparaîtront ici.</Text>}
        <Text style={styles.footer}>Les changements de rôle passent par Supabase et le dernier administrateur ne peut pas être rétrogradé. La désactivation ou suppression d’un compte Auth se fait dans le tableau de bord Supabase.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ value, label, icon }: { value: string; label: string; icon: { ios: string; android: string; web: string } }) {
  return (
    <View style={styles.metricCard}>
      <SymbolView name={icon as any} size={19} tintColor={Colors.light.accent} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.centered}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F8F6' },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: 130 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two, backgroundColor: '#F6F8F6' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: Spacing.two },
  backText: { color: Colors.light.primary, fontSize: 13, fontWeight: '800' },
  hero: { backgroundColor: Colors.light.primary, borderRadius: 20, padding: Spacing.three, marginTop: Spacing.two },
  eyebrow: { color: '#E5B17D', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#DDE9E0', fontSize: 13, lineHeight: 19, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: Spacing.three },
  metricCard: { width: '48%', minHeight: 104, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEE9', borderRadius: 15, padding: Spacing.two, justifyContent: 'center', alignItems: 'center' },
  metricValue: { color: '#26332C', fontSize: 22, fontWeight: '800', marginTop: 4 },
  metricLabel: { color: '#69766E', fontSize: 10, textAlign: 'center', marginTop: 2 },
  broadcastButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.light.accent, borderRadius: 15, paddingVertical: 14, marginTop: Spacing.three, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  broadcastButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: Spacing.three, marginTop: Spacing.three, borderWidth: 1, borderColor: '#E6ECE8' },
  panelTitle: { color: '#26332C', fontSize: 17, fontWeight: '800' },
  help: { color: '#69766E', fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: Spacing.one },
  formLabel: { color: '#26332C', fontSize: 13, fontWeight: '700', marginTop: Spacing.three },
  languageChoices: { flexDirection: 'row', gap: 8, marginTop: Spacing.one },
  languageChoice: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#DEE7E1', paddingHorizontal: 14, backgroundColor: '#FBFCFB' },
  languageChoiceActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  languageChoiceText: { color: '#516158', fontSize: 12, fontWeight: '700' },
  languageChoiceTextActive: { color: '#FFFFFF' },
  input: { minHeight: 45, borderWidth: 1, borderColor: '#DEE7E1', borderRadius: 10, paddingHorizontal: 11, color: '#26332C', backgroundColor: '#FBFCFB', fontSize: 13, marginTop: Spacing.two },
  multiline: { minHeight: 92, paddingTop: 11 },
  primaryButton: { minHeight: 45, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingHorizontal: Spacing.three, marginTop: Spacing.two },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', borderRadius: 11, backgroundColor: '#E8F0EA', paddingVertical: 12, marginTop: Spacing.two },
  secondaryButtonText: { color: Colors.light.primary, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.58 },
  sectionHeading: { marginTop: Spacing.four, marginBottom: Spacing.two },
  sectionTitle: { color: '#26332C', fontSize: 18, fontWeight: '800' },
  listRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEE9', borderRadius: 14, padding: Spacing.two, marginBottom: Spacing.two },
  memberCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEE9', borderRadius: 14, marginBottom: Spacing.two, overflow: 'hidden' },
  memberHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.two },
  listContent: { flex: 1, marginHorizontal: Spacing.one },
  listTitle: { color: '#26332C', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  muted: { color: '#69766E', fontSize: 11, lineHeight: 17 },
  memberAvatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#E8F1EA', alignItems: 'center', justifyContent: 'center' },
  memberAdmin: { backgroundColor: '#FCEBD9' },
  avatarText: { color: Colors.light.primary, fontWeight: '800', fontSize: 14 },
  memberId: { color: '#89948D', fontSize: 9, marginTop: 4 },
  memberActions: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderColor: '#EDF1EE', paddingHorizontal: Spacing.two, paddingVertical: 4 },
  memberAction: { paddingVertical: 9, paddingHorizontal: Spacing.one, marginRight: Spacing.two },
  memberActionText: { color: Colors.light.primary, fontSize: 11, fontWeight: '800' },
  roleRemove: { color: '#A14B40' },
  memberEditor: { borderTopWidth: 1, borderColor: '#EDF1EE', padding: Spacing.two },
  cancelButton: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: '#718077', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#78857D', fontSize: 12, marginVertical: Spacing.two },
  footer: { color: '#89948D', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: Spacing.three },
  errorCard: { padding: Spacing.two, borderRadius: 12, backgroundColor: '#FBEDEA', marginTop: Spacing.two, gap: 5 },
  errorText: { color: '#963C32', fontSize: 12 },
});
