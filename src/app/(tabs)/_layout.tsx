import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#D8823B',
        tabBarInactiveTintColor: Colors.light.textSecondary,
      }}
    >
      <Tabs.Screen
        name="formations"
        options={{
          title: 'Formations',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' } as any} size={24} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.iconContainer,
              focused ? styles.activeIconContainer : styles.inactiveIconContainer
            ]}>
              <SymbolView
                name={{ ios: 'house.fill', android: 'home', web: 'home' } as any}
                size={28}
                tintColor={focused ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' } as any} size={24} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 80,
    right: 80,
    elevation: 10,
    backgroundColor: '#1B392A',
    borderRadius: 30,
    height: 64,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    paddingBottom: Platform.OS === 'ios' ? 0 : 0,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    top: -15, // C'est ici qu'on surélève l'icône
    borderWidth: 4,
    borderColor: '#F5F5F5', // Pour faire ressortir le bouton sur le fond blanc de la page
  },
  activeIconContainer: {
    backgroundColor: '#D8823B', // Orange quand sélectionné
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  inactiveIconContainer: {
    backgroundColor: '#1B392A',
  }
});
