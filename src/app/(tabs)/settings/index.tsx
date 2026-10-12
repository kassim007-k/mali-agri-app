import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { getMyProfile } from '@/features/data/learning';
import type { AgriProfile } from '@/features/data/database.types';
import { useLiveQuery, type AgriTableName } from '@/features/data/use-live-query';
import { supabase } from '@/lib/supabase';

const profileTable: AgriTableName[] = ['agri_profiles'];
const noTables: AgriTableName[] = [];

export default function SettingsScreen() {
  const [userId, setUserId] = useState<string | null>('00000000-0000-0000-0000-000000000000');
  const [email, setEmail] = useState('dev@afri-farm.com');
  const [authReady, setAuthReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (active && session?.user) {
        setUserId(session.user.id);
        setEmail(session.user.email ?? '');
      }
      if (active) setAuthReady(true);
    };
    loadSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setEmail(session.user.email ?? '');
      } else {
        setUserId('00000000-0000-0000-0000-000000000000');
        setEmail('dev@afri-farm.com');
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = useCallback(
    () => userId ? getMyProfile(userId) : Promise.resolve(null as AgriProfile | null),
    [userId],
  );
  const tables = userId ? profileTable : noTables;
  const { data: profile, loading, error, refresh } = useLiveQuery(`settings-${userId ?? 'guest'}`, tables, loadProfile);

  const handleSignOut = async () => {
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setSigningOut(false);
    if (signOutError) return;
    router.replace('/(tabs)/settings');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>VOTRE COMPTE</Text>
          <Text style={styles.title}>Paramètres</Text>
          <Text style={styles.subtitle}>Profil, accès et gestion de votre espace Mali Agri.</Text>
        </View>

        {!authReady ? (
          <View style={styles.stateCard}><ActivityIndicator color={Colors.light.primary} /><Text style={styles.muted}>Vérification de votre compte…</Text></View>
        ) : (
          <>
            {userId === '00000000-0000-0000-0000-000000000000' && (
              <View style={styles.devBanner}>
                <SymbolView name={{ ios: 'hammer.fill', android: 'build', web: 'build' } as any} size={14} tintColor="#856404" />
                <Text style={styles.devBannerText}>Mode Développement : Session simulée active.</Text>
              </View>
            )}
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <SymbolView name={{ ios: 'person.fill', android: 'person', web: 'person' } as any} size={26} tintColor="#FFFFFF" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.full_name || (userId === '00000000-0000-0000-0000-000000000000' ? 'Développeur' : 'Votre profil')}</Text>
                <Text style={styles.muted}>{userId === '00000000-0000-0000-0000-000000000000' ? 'Accès invité (ID de test)' : (email || 'Compte connecté')}</Text>
              </View>
              {profile ? <Text style={[styles.roleBadge, profile.role === 'admin' && styles.adminBadge]}>{profile.role === 'admin' ? 'ADMIN' : 'MEMBRE'}</Text> : null}
            </View>

            {loading && !profile ? (
              <View style={styles.stateCard}><ActivityIndicator color={Colors.light.primary} /><Text style={styles.muted}>Chargement du profil…</Text></View>
            ) : error ? (
              <View style={styles.stateCard}>
                <Text style={styles.rowTitle}>Profil indisponible</Text>
                <Text style={styles.muted}>{error}</Text>
                <Pressable onPress={() => void refresh()}><Text style={styles.actionText}>Réessayer</Text></Pressable>
              </View>
            ) : null}

            <SettingsRow
              icon={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
              title="Modifier mon profil"
              subtitle="Nom affiché et informations du compte"
              onPress={() => router.push('/(tabs)/settings/profile')}
            />
            {profile?.role === 'admin' ? (
              <SettingsRow
                icon={{ ios: 'chart.bar.xaxis', android: 'admin_panel_settings', web: 'admin_panel_settings' }}
                title="Espace administration"
                subtitle="Cours, membres et suivi des inscriptions"
                onPress={() => router.push('/(tabs)/settings/admin')}
              />
            ) : null}

            {userId !== '00000000-0000-0000-0000-000000000000' ? (
              <Pressable onPress={() => void handleSignOut()} disabled={signingOut} style={[styles.signOutButton, signingOut && styles.disabled]}>
                <SymbolView name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' } as any} size={19} tintColor="#A34337" />
                <Text style={styles.signOutText}>{signingOut ? 'Déconnexion…' : 'Se déconnecter'}</Text>
              </Pressable>
            ) : (
              <View style={styles.stateCard}>
                <Text style={styles.rowTitle}>Passer au mode réel</Text>
                <Text style={styles.muted}>Pour tester l'authentification par email et les restrictions de sécurité.</Text>
                <View style={styles.authButtonsRow}>
                  <Pressable onPress={() => router.push('/login')} style={styles.authButton}><Text style={styles.authButtonText}>Connexion</Text></Pressable>
                  <Pressable onPress={() => router.push('/register')} style={styles.authButton}><Text style={styles.authButtonText}>S'inscrire</Text></Pressable>
                </View>
              </View>
            )}
          </>
        )}

        <Text style={styles.version}>Mali Agri · Espace d’apprentissage</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({ icon, title, subtitle, onPress }: { icon: { ios: string; android: string; web: string }; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowIcon}><SymbolView name={icon as any} size={21} tintColor={Colors.light.primary} /></View>
      <View style={styles.rowContent}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.muted}>{subtitle}</Text></View>
      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any} size={16} tintColor="#8B968F" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F8F6' },
  content: { paddingBottom: 130 },
  hero: { backgroundColor: Colors.light.primary, paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: 27, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  eyebrow: { color: '#B9CDBF', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 7 },
  subtitle: { color: '#DDE9E0', fontSize: 14, lineHeight: 20, marginTop: 6 },
  profileCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.four, marginTop: Spacing.three, marginBottom: Spacing.three, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EDE8', borderRadius: 17, padding: Spacing.three },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1, marginLeft: Spacing.two },
  profileName: { color: '#26332C', fontSize: 15, fontWeight: '800', marginBottom: 3 },
  roleBadge: { color: '#4A6D54', backgroundColor: '#E9F2EB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: '800' },
  adminBadge: { color: '#8A4A1D', backgroundColor: '#FCEBD9' },
  muted: { color: '#6B786F', fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.four, marginBottom: Spacing.two, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEE9', borderRadius: 15, padding: Spacing.three },
  pressed: { opacity: 0.82 },
  rowIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#EAF2EC', alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1, marginHorizontal: Spacing.two },
  rowTitle: { color: '#26332C', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  devBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF3CD', borderBottomWidth: 1, borderColor: '#FFEEBA', paddingHorizontal: Spacing.four, paddingVertical: 10 },
  devBannerText: { color: '#856404', fontSize: 12, fontWeight: '600' },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: Spacing.four, marginTop: Spacing.two, padding: 14, borderRadius: 13, backgroundColor: '#FBEDEA' },
  signOutText: { color: '#A34337', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  stateCard: { alignItems: 'center', margin: Spacing.four, padding: Spacing.four, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEE9', gap: 10 },
  authButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  authButton: { backgroundColor: Colors.light.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  authButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  guestIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2EC' },
  primaryButton: { backgroundColor: Colors.light.primary, alignItems: 'center', minWidth: 160, paddingHorizontal: Spacing.four, paddingVertical: 13, borderRadius: 11, marginTop: Spacing.one },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  registerButton: { padding: 7 },
  actionText: { color: Colors.light.primary, fontSize: 13, fontWeight: '800' },
  version: { color: '#8B968F', fontSize: 11, textAlign: 'center', marginTop: Spacing.three },
});
