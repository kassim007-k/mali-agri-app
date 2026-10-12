import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('agri_notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('agri_notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.card, !item.is_read && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        {!item.is_read && <View style={styles.badge} />}
      </View>
      <Text style={styles.content}>{item.content}</Text>
      <Text style={styles.date}>
        {format(new Date(item.created_at), 'd MMMM yyyy HH:mm', { locale: fr })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <SymbolView name="chevron.left" size={24} tintColor="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.light.primary} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchNotifications();
            }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <SymbolView name="bell.slash" size={50} tintColor="#CCC" />
              <Text style={styles.emptyText}>Aucune notification pour le moment</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  list: { padding: Spacing.four },
  card: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  unreadCard: {
    borderColor: Colors.light.accent,
    backgroundColor: '#F0F9F4',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', color: '#333' },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.light.accent },
  content: { fontSize: 14, color: '#666', lineHeight: 20 },
  date: { fontSize: 12, color: '#999', marginTop: 8 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 },
});
