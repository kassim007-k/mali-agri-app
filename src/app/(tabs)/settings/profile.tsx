import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { getMyProfile, updateProfileName } from '@/features/data/learning';
import { useLiveQuery, type AgriTableName } from '@/features/data/use-live-query';
import { supabase } from '@/lib/supabase';

const profileTables: AgriTableName[] = ['agri_profiles'];
const noTables: AgriTableName[] = [];

export default function ProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!active) return;
        if (!session?.user) {
          router.replace('/(tabs)/settings');
          return;
        }
        setUserId(session.user.id);
        setPhone(session.user.phone ?? '');
      });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const loadProfile = useCallback(() => userId ? getMyProfile(userId) : Promise.resolve(null), [userId]);
  const tables = userId ? profileTables : noTables;
  const { data: profile, loading, error, refresh } = useLiveQuery(`profile-edit-${userId ?? 'guest'}`, tables, loadProfile);

  const save = async () => {
    const submittedName = (name ?? profile?.full_name ?? '').trim();
    if (!userId || !submittedName) {
      Alert.alert('Nom requis', 'Saisissez le nom à afficher dans votre profil.');
      return;
    }
    setSaving(true);
    try {
      await updateProfileName(userId, submittedName);
      const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: submittedName } });
      if (metadataError) throw metadataError;
      await refresh();
      Alert.alert('Profil mis à jour', 'Votre nom a bien été enregistré.');
    } catch (caught) {
      Alert.alert('Enregistrement impossible', caught instanceof Error ? caught.message : 'Réessayez dans un instant.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any} size={17} tintColor={Colors.light.primary} />
          <Text style={styles.backText}>Paramètres</Text>
        </Pressable>
        <Text style={styles.title}>Mon profil</Text>
        <Text style={styles.subtitle}>Les informations de votre compte sont protégées.</Text>

        {loading && !profile ? <ActivityIndicator color={Colors.light.primary} style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <Text style={styles.label}>Nom complet</Text>
          <TextInput value={name ?? profile?.full_name ?? ''} onChangeText={setName} placeholder="Votre nom" style={styles.input} editable={!saving && !!profile} maxLength={100} />
          <Text style={styles.label}>Téléphone</Text>
          <View style={[styles.input, styles.readOnly]}><Text style={styles.readOnlyText}>{phone || 'Non renseigné'}</Text></View>
          <Text style={styles.help}>Pour modifier votre numéro, contactez l’équipe d’assistance.</Text>
          <Pressable onPress={() => void save()} disabled={saving || !profile} style={[styles.saveButton, (saving || !profile) && styles.disabled]}>
            <Text style={styles.saveText}>{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F8F6' },
  content: { padding: Spacing.four, paddingBottom: 120 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: Spacing.four },
  backText: { color: Colors.light.primary, fontSize: 13, fontWeight: '700' },
  title: { color: '#26332C', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#69766E', fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: Spacing.four },
  loader: { margin: Spacing.four },
  error: { color: '#A34337', fontSize: 12, marginBottom: Spacing.two },
  form: { padding: Spacing.three, backgroundColor: '#FFFFFF', borderRadius: 17, borderWidth: 1, borderColor: '#E6ECE8' },
  label: { color: '#344239', fontSize: 13, fontWeight: '800', marginBottom: 7, marginTop: Spacing.two },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#DEE7E1', borderRadius: 11, paddingHorizontal: 12, color: '#26332C', backgroundColor: '#FBFCFB', fontSize: 14 },
  readOnly: { justifyContent: 'center', backgroundColor: '#F2F5F3' },
  readOnlyText: { color: '#68756C', fontSize: 14 },
  help: { color: '#7A877F', fontSize: 11, marginTop: 7 },
  saveButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginTop: Spacing.four, backgroundColor: Colors.light.primary },
  saveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
