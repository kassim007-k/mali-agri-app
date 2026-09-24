import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export default function FormationsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nos Formations</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.text}>Découvrez nos programmes d'apprentissage pour booster votre exploitation.</Text>
        {/* Contenu à venir */}
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
  text: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});
