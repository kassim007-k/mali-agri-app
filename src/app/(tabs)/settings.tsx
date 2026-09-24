import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Section Authentification */}
        <View style={styles.authSection}>
          <Text style={styles.authTitle}>Rejoignez la communauté</Text>
          <Text style={styles.authSubtitle}>Connectez-vous pour accéder à toutes vos formations et groupes.</Text>
          <View style={styles.authButtons}>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: Colors.light.primary }]}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.authButtonText}>Se connecter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: Colors.light.accent }]}
              onPress={() => router.push('/register')}
            >
              <Text style={styles.authButtonText}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.settingItem}>
          <SymbolView name="person.fill" size={22} tintColor={Colors.light.primary} />
          <Text style={styles.settingText}>Mon Profil</Text>
          <SymbolView name="chevron.right" size={16} tintColor="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <SymbolView name="bell.fill" size={22} tintColor={Colors.light.primary} />
          <Text style={styles.settingText}>Notifications</Text>
          <SymbolView name="chevron.right" size={16} tintColor="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <SymbolView name="questionmark.circle.fill" size={22} tintColor={Colors.light.primary} />
          <Text style={styles.settingText}>Aide & Support</Text>
          <SymbolView name="chevron.right" size={16} tintColor="#CCC" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: Spacing.four,
  },
  authSection: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.four,
    borderRadius: 20,
    marginBottom: Spacing.four,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: Spacing.one,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  authButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
  },
  authButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.four,
    borderRadius: 15,
    marginBottom: Spacing.two,
  },
  settingText: {
    flex: 1,
    marginLeft: Spacing.three,
    fontSize: 16,
    fontWeight: '500',
  },
});
