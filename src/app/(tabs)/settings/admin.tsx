import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { createCourse, getAdminSnapshot, getMyProfile, setUserRole, updateProfileName, deleteCourse, createLesson, uploadMedia, type AdminSnapshot } from '@/features/data/learning';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLiveQuery, type AgriTableName } from '@/features/data/use-live-query';
import type { AgriProfile, AgriCourse } from '@/features/data/database.types';
import { supabase } from '@/lib/supabase';

const adminTables: AgriTableName[] = ['agri_profiles', 'agri_courses', 'agri_lessons', 'agri_enrollments', 'agri_lesson_progress'];
const noTables: AgriTableName[] = [];
const emptySnapshot: AdminSnapshot = { profiles: [], courses: [], enrollments: [], lessonProgress: [], lessonCount: 0 };

export default function AdminScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<AgriProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Onglets
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'members'>('dashboard');

  // Création de cours
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Agriculture');
  const [language, setLanguage] = useState<'fr' | 'bm'>('fr');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Détails de la première leçon
  const [lessonContent, setLessonContent] = useState('');
  const [mediaType, setMediaType] = useState<'text' | 'video' | 'audio'>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);

  // Membres
  const [searchMember, setSearchMember] = useState('');
  const [updatingMember, setUpdatingMember] = useState(false);

  useEffect(() => {
    let active = true;
    const loadAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      const id = session?.user.id ?? null;
      const email = session?.user.email ?? null;
      setUserId(id);
      setUserEmail(email);

      if (id) {
        const currentProfile = await getMyProfile(id).catch(() => null);
        if (active) setProfile(currentProfile);
      }
      setAuthLoading(false);
    };
    loadAccess();
    return () => { active = false; };
  }, []);

  const isAdmin = profile?.role === 'admin' || (userEmail && ['ibrahimakeita24@icloud.com', 'kk.boulkassimkeita.keita@gmail.com'].includes(userEmail));

  const loadSnapshot = useCallback(
    () => isAdmin ? getAdminSnapshot() : Promise.resolve(emptySnapshot),
    [isAdmin],
  );

  const { data: snapshot, loading, refreshing, error, refresh } = useLiveQuery(`admin-${userId}`, isAdmin ? adminTables : noTables, loadSnapshot);
  const data = snapshot ?? emptySnapshot;

  const filteredMembers = useMemo(() => {
    if (!searchMember) return data.profiles;
    return data.profiles.filter(p =>
      p.full_name.toLowerCase().includes(searchMember.toLowerCase())
    );
  }, [data.profiles, searchMember]);

  const handleCreateCourse = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le titre et la description.');
      return;
    }
    setCreating(true);
    try {
      let finalMediaUrl = mediaUrl;

      // Upload du fichier si présent
      if (selectedFile) {
        finalMediaUrl = await uploadMedia(selectedFile.uri, selectedFile.name);
      }

      // 1. Créer le cours
      const course = await createCourse(title, description || title, category, 'Tous niveaux', language, userId || '');

      // 2. Créer la première leçon
      if (course && course.id) {
        await createLesson(
          course.id,
          "Introduction",
          lessonContent || description,
          1,
          mediaType,
          finalMediaUrl,
          ''
        );
      }

      setTitle('');
      setDescription('');
      setLessonContent('');
      setMediaUrl('');
      setMediaType('text');
      setSelectedFile(null);
      setShowCreateForm(false);
      await refresh();
      Alert.alert('Succès', 'Le cours et sa première leçon ont été créés.');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = (course: AgriCourse) => {
    Alert.alert(
      "Supprimer le cours",
      `Êtes-vous sûr de vouloir supprimer "${course.title}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: async () => {
          await deleteCourse(course.id);
          refresh();
        }}
      ]
    );
  };

  const pickMedia = async () => {
    if (mediaType === 'video') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setSelectedFile({ uri: asset.uri, name: asset.fileName || `video-${Date.now()}.mp4` });
        setMediaUrl(''); // On vide le lien si on choisit un fichier
      }
    } else if (mediaType === 'audio') {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setSelectedFile({ uri: asset.uri, name: asset.name });
        setMediaUrl('');
      }
    }
  };

  if (authLoading || (isAdmin && loading && !snapshot)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.light.primary} size="large" />
        <Text style={styles.muted}>Chargement des données...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <SymbolView name="lock.fill" size={48} tintColor={Colors.light.primary} />
        <Text style={styles.title}>Accès réservé</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/settings')} style={styles.backButton}>
            <SymbolView name="chevron.left" size={24} tintColor="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Administration</Text>
        </View>
        <TouchableOpacity onPress={() => refresh()} disabled={refreshing}>
          <SymbolView name="arrow.clockwise" size={20} tintColor="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TabItem label="Stats" icon="chart.bar.fill" active={activeTab === 'dashboard'} onPress={() => setActiveTab('dashboard')} />
        <TabItem label="Cours" icon="book.fill" active={activeTab === 'courses'} onPress={() => setActiveTab('courses')} />
        <TabItem label="Membres" icon="person.2.fill" active={activeTab === 'members'} onPress={() => setActiveTab('members')} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      >
        {activeTab === 'dashboard' && (
          <View style={styles.statsSection}>
            <View style={styles.statsGrid}>
              <StatCard label="Membres" value={data.profiles.length} icon="person.fill" color="#3498db" />
              <StatCard label="Cours" value={data.courses.length} icon="book.closed.fill" color="#e67e22" />
              <StatCard label="Inscriptions" value={data.enrollments.length} icon="graduationcap.fill" color="#2ecc71" />
              <StatCard label="Leçons" value={data.lessonCount} icon="play.fill" color="#9b59b6" />
            </View>

            <TouchableOpacity
              style={styles.broadcastBtn}
              onPress={() => Alert.prompt("Annonce", "Message pour tous les membres", [
                { text: "Annuler" },
                { text: "Envoyer", onPress: (val) => val && supabase.rpc('broadcast_agri_message', { msg_title: "Annonce Admin", msg_content: val }) }
              ])}
            >
              <SymbolView name="megaphone.fill" size={20} tintColor="#FFFFFF" />
              <Text style={styles.broadcastText}>Envoyer une annonce globale</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'courses' && (
          <View>
            <TouchableOpacity
              style={[styles.primaryButton, { marginBottom: 20 }]}
              onPress={() => setShowCreateForm(!showCreateForm)}
            >
              <Text style={styles.primaryButtonText}>{showCreateForm ? "Fermer le formulaire" : "+ Nouveau Cours"}</Text>
            </TouchableOpacity>

            {showCreateForm && (
              <View style={styles.formCard}>
                <TextInput placeholder="Titre du cours" value={title} onChangeText={setTitle} style={styles.input} />
                <TextInput placeholder="Catégorie" value={category} onChangeText={setCategory} style={styles.input} />
                <View style={styles.langRow}>
                  <TouchableOpacity onPress={() => setLanguage('fr')} style={[styles.langBtn, language === 'fr' && styles.langBtnActive]}>
                    <Text style={[styles.langText, language === 'fr' && styles.langTextActive]}>Français</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setLanguage('bm')} style={[styles.langBtn, language === 'bm' && styles.langBtnActive]}>
                    <Text style={[styles.langText, language === 'bm' && styles.langTextActive]}>Bambara</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  placeholder="Description courte du cours..."
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.input, { minHeight: 60 }]}
                  multiline
                />

                <Text style={styles.sectionLabel}>Première Leçon</Text>

                <View style={styles.langRow}>
                  {(['text', 'video', 'audio'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setMediaType(type)}
                      style={[styles.langBtn, mediaType === type && styles.langBtnActive]}
                    >
                      <Text style={[styles.langText, mediaType === type && styles.langTextActive]}>
                        {type === 'text' ? 'Texte' : type === 'video' ? 'Vidéo' : 'Audio'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {mediaType !== 'text' && (
                  <View style={{ gap: 10, marginBottom: 15 }}>
                    <View style={styles.mediaSelectionRow}>
                      <TextInput
                        placeholder={mediaType === 'video' ? "Lien YouTube/Vidéo (HTTPS)" : "Lien Audio (HTTPS)"}
                        value={mediaUrl}
                        onChangeText={(val) => {
                          setMediaUrl(val);
                          setSelectedFile(null); // On vide le fichier si on tape un lien
                        }}
                        style={[styles.input, { marginBottom: 0, flex: 1 }]}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={pickMedia} style={styles.pickBtn}>
                        <SymbolView name="folder.fill" size={20} tintColor="#FFF" />
                      </TouchableOpacity>
                    </View>

                    {selectedFile && (
                      <View style={styles.selectedFileIndicator}>
                        <SymbolView name="doc.fill" size={14} tintColor={Colors.light.primary} />
                        <Text style={styles.selectedFileText} numberOfLines={1}>
                          Fichier sélectionné : {selectedFile.name}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedFile(null)}>
                          <SymbolView name="xmark.circle.fill" size={16} tintColor="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                <TextInput
                  placeholder="Contenu détaillé de la leçon..."
                  value={lessonContent}
                  onChangeText={setLessonContent}
                  style={[styles.input, styles.textArea]}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.saveBtn, creating && styles.disabled]}
                  onPress={handleCreateCourse}
                  disabled={creating}
                >
                  {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Créer le cours</Text>}
                </TouchableOpacity>
              </View>
            )}

            {data.courses.map(course => (
              <View key={course.id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{course.title}</Text>
                  <Text style={styles.itemSub}>{course.category} • {course.language === 'fr' ? '🇫🇷 FR' : '🇲🇱 BM'}</Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/formations/[courseId]', params: { courseId: course.id } })}>
                    <SymbolView name="eye.fill" size={20} tintColor={Colors.light.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(course)}>
                    <SymbolView name="trash.fill" size={20} tintColor="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'members' && (
          <View>
            <TextInput
              placeholder="Rechercher un membre..."
              value={searchMember}
              onChangeText={setSearchMember}
              style={styles.searchInput}
            />
            {filteredMembers.map(member => (
              <View key={member.id} style={styles.itemCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{member.full_name[0]}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{member.full_name}</Text>
                  <Text style={styles.itemSub}>{member.role === 'admin' ? '⭐ Administrateur' : 'Utilisateur'}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const next = member.role === 'admin' ? 'user' : 'admin';
                    Alert.alert("Changer le rôle", `Passer ${member.full_name} en ${next} ?`, [
                      { text: "Non" },
                      { text: "Oui", onPress: () => setUserRole(member.id, next).then(refresh) }
                    ]);
                  }}
                  style={styles.roleBtn}
                >
                  <Text style={styles.roleBtnText}>{member.role === 'admin' ? "Rétrograder" : "Promouvoir"}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabItem({ label, icon, active, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.activeTab]}>
      <SymbolView name={icon} size={18} tintColor={active ? Colors.light.primary : '#95a5a6'} />
      <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <SymbolView name={icon} size={20} tintColor={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { backgroundColor: Colors.light.primary, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, padding: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: Colors.light.primary },
  tabLabel: { fontSize: 14, color: '#95a5a6', fontWeight: '600' },
  activeTabLabel: { color: Colors.light.primary },
  content: { padding: 15 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', alignItems: 'center' },
  statIcon: { padding: 10, borderRadius: 10, marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  statLabel: { fontSize: 12, color: '#7f8c8d' },
  broadcastBtn: { backgroundColor: Colors.light.accent, padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  broadcastText: { color: '#FFF', fontWeight: 'bold' },
  primaryButton: { backgroundColor: Colors.light.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold' },
  formCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  input: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10, marginBottom: 15, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  langRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  langBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee', alignItems: 'center' },
  langBtnActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  langText: { color: '#7f8c8d' },
  langTextActive: { color: '#FFF', fontWeight: 'bold' },
  saveBtn: { backgroundColor: Colors.light.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  disabled: { opacity: 0.7 },
  itemCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  itemSub: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: 15 },
  searchInput: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontWeight: 'bold', color: Colors.light.primary },
  roleBtn: { padding: 8, backgroundColor: '#f1f2f6', borderRadius: 6 },
  roleBtnText: { fontSize: 12, color: Colors.light.primary, fontWeight: 'bold' },
  muted: { color: '#7f8c8d', marginTop: 10 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: Colors.light.primary, marginTop: 10, marginBottom: 10, textTransform: 'uppercase' },
  mediaSelectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickBtn: { backgroundColor: Colors.light.accent, padding: 12, borderRadius: 10, height: 46, justifyContent: 'center' },
  selectedFileIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EAF2EC', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#DEE7E1' },
  selectedFileText: { fontSize: 12, color: Colors.light.primary, flex: 1, fontWeight: '600' },
});
