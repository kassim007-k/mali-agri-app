import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function VerifyPhoneScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyCode = async () => {
    if (!phone || !/^\d{6}$/.test(code.trim())) {
      Alert.alert('Code invalide', 'Saisissez le code à 6 chiffres reçu par SMS.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' });
      if (error) {
        Alert.alert('Vérification impossible', error.message);
        return;
      }
      router.replace('/(tabs)/home');
    } catch {
      Alert.alert('Vérification impossible', 'Vérifiez votre connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'sms', phone });
      if (error) Alert.alert('Envoi impossible', error.message);
      else Alert.alert('Code renvoyé', 'Un nouveau code vient d’être demandé.');
    } catch {
      Alert.alert('Envoi impossible', 'Vérifiez votre connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
          <SymbolView name="chevron.left" size={24} tintColor="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmer le téléphone</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Entrez le code SMS</Text>
        <Text style={styles.description}>Nous avons envoyé un code de confirmation au {phone || 'numéro indiqué'}.</Text>
        <TextInput
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          style={styles.input}
          editable={!loading}
          maxLength={6}
          accessibilityLabel="Code de confirmation à 6 chiffres"
        />
        <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={() => void verifyCode()} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Confirmer le numéro</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => void resendCode()} disabled={loading} style={styles.resend}>
          <Text style={styles.resendText}>Renvoyer le code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: Colors.light.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 24 },
  content: { padding: Spacing.four, marginTop: Spacing.four },
  title: { color: '#26332C', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  description: { color: '#68756C', fontSize: 14, lineHeight: 21, marginTop: Spacing.two },
  input: { backgroundColor: '#FFFFFF', padding: Spacing.three, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 24, fontWeight: '700', letterSpacing: 8, textAlign: 'center', marginTop: Spacing.four },
  button: { backgroundColor: Colors.light.accent, padding: Spacing.three, borderRadius: 10, alignItems: 'center', marginTop: Spacing.three, minHeight: 52, justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  resend: { alignItems: 'center', padding: Spacing.three, marginTop: Spacing.two },
  resendText: { color: Colors.light.primary, fontSize: 14, fontWeight: '700' },
});
