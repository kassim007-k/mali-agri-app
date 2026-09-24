import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Types pour nos données
interface Formation {
  id: string;
  title: string;
  progress: number;
  icon: string;
}

interface Video {
  id: string;
  title: string;
  price: string;
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [userName, setUserName] = useState<string | null>(null);

  // Fonction pour charger les données
  const fetchData = async () => {
    try {
      // Vérifier la session utilisateur
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || "Utilisateur");
      } else {
        setUserName(null);
      }

      // Simulation d'un appel API (On pourra remplacer par supabase.from('formations').select('*'))
      await new Promise(resolve => setTimeout(resolve, 1500));

      setFormations([
        { id: '1', title: 'Élevage Bovin', progress: 75, icon: 'leaf.fill' },
        { id: '2', title: 'Cultures Maraîchères', progress: 40, icon: 'camera.macro' },
        { id: '3', title: 'Gestion d\'Eau', progress: 20, icon: 'drop.fill' },
      ]);

      setVideos([
        { id: '1', title: 'Culture Maraîchère', price: '5,000 CFA' },
        { id: '2', title: 'Conseils Semis', price: 'Gratuit' },
        { id: '3', title: 'Irrigation Solaire', price: '7,500 CFA' },
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
        <Text style={{ color: '#FFF', marginTop: 10 }}>Chargement de votre ferme...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity><SymbolView name="line.3.horizontal" size={24} tintColor="#FFFFFF" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Tableau de bord</Text>
        <TouchableOpacity>
          <SymbolView name="bell" size={24} tintColor="#FFFFFF" />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
      >
        {/* Profil */}
        <View style={styles.profileSection}>
          <View style={styles.profileImagePlaceholder}>
            <SymbolView name="person.circle.fill" size={50} tintColor="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.welcomeText}>
              {userName ? `Bienvenue ${userName}` : "Bienvenue"}
            </Text>
            <Text style={styles.subWelcomeText}>Éduquer - Cultiver</Text>
          </View>
        </View>

        <View style={styles.contentCard}>
          {/* Section Formations Dynamiques */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vos Formations ({formations.length})</Text>
          </View>

          {formations.map((item) => (
            <TouchableOpacity key={item.id} style={styles.formationItem}>
              <View style={styles.itemIconBox}>
                <SymbolView name={item.icon as any} size={24} tintColor={Colors.light.primary} />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${item.progress}%` }]} />
                </View>
              </View>
              <Text style={styles.progressText}>{item.progress}%</Text>
            </TouchableOpacity>
          ))}

          {/* Vidéos Dynamiques */}
          <View style={[styles.sectionHeader, { marginTop: Spacing.four }]}>
            <Text style={styles.sectionTitle}>Vidéos & Podcasts</Text>
            <SymbolView name="chevron.right" size={16} tintColor={Colors.light.accent} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {videos.map((video) => (
              <TouchableOpacity key={video.id} style={styles.videoCard}>
                <View style={styles.videoThumbnail}>
                  <SymbolView name="play.circle.fill" size={30} tintColor="#FFFFFF" />
                </View>
                <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
                <Text style={styles.videoPrice}>{video.price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Groupes */}
          <View style={[styles.sectionHeader, { marginTop: Spacing.four }]}>
            <Text style={styles.sectionTitle}>Vos Groupes Local</Text>
          </View>

          <TouchableOpacity style={styles.groupCard}>
            <View style={styles.mapPlaceholder}>
              <SymbolView name="mappin.and.ellipse" size={30} tintColor={Colors.light.accent} />
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>Groupe Sud</Text>
              <Text style={styles.groupLocation}>Mali, Zone Sud</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  notificationBadge: { position: 'absolute', right: 0, top: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.light.accent },
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  profileImagePlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  welcomeText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  subWelcomeText: { color: '#FFFFFF', opacity: 0.8, fontSize: 14 },
  contentCard: { flex: 1, backgroundColor: '#F5F5F5', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: Spacing.four, minHeight: 600 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.three },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  formationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: Spacing.three, borderRadius: 15, marginBottom: Spacing.two, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  itemIconBox: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#F0F7F4', justifyContent: 'center', alignItems: 'center' },
  itemContent: { flex: 1, marginLeft: Spacing.three },
  itemTitle: { fontSize: 16, fontWeight: '600', marginBottom: 5 },
  progressBarBg: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3 },
  progressBarFill: { height: '100%', backgroundColor: Colors.light.accent, borderRadius: 3 },
  progressText: { marginLeft: Spacing.two, fontWeight: 'bold', color: '#666' },
  horizontalScroll: { marginHorizontal: -Spacing.four, paddingHorizontal: Spacing.four },
  videoCard: { width: 160, backgroundColor: '#FFFFFF', borderRadius: 15, padding: Spacing.two, marginRight: Spacing.three },
  videoThumbnail: { height: 100, backgroundColor: '#1B392A', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  videoTitle: { fontSize: 14, fontWeight: '600' },
  videoPrice: { fontSize: 12, color: Colors.light.accent, fontWeight: 'bold' },
  groupCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 15, overflow: 'hidden' },
  mapPlaceholder: { width: 100, height: 80, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  groupInfo: { padding: Spacing.three, justifyContent: 'center' },
  groupName: { fontSize: 16, fontWeight: 'bold' },
  groupLocation: { fontSize: 14, color: '#666' },
});
