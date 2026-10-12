import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View, Text, SafeAreaView } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const theme = useTheme();

  // VÉRIFICATION INITIALE DU RÔLE POUR REDIRECTION
  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email?.toLowerCase().trim();
        const { data: profile } = await supabase.from('agri_profiles').select('role').eq('id', session.user.id).single();

        const isAdmin = profile?.role === 'admin' ||
                        email === 'ibrahimakeita24@icloud.com' ||
                        email === 'kk.boulkassimkeita.keita@gmail.com';

        if (isAdmin) {
          router.replace('/(tabs)/settings/admin');
        } else {
          router.replace('/(tabs)/home');
        }
      }
    };
    void checkSession();
  }, []);

  const handlePress = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.light.primary }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>AF</Text>
          <View style={styles.logoLine} />
        </View>

        <Text style={styles.title}>AfriFarm: Agri-Élevage Solidaire</Text>
        <Text style={styles.slogan}>Éduquer - Connecter - Cultiver</Text>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerIcon}>✧</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: Colors.light.accent }]}
          onPress={handlePress}
        >
          <Text style={styles.buttonText}>Commencer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  logoText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#D8823B',
  },
  logoLine: {
    width: 60,
    height: 4,
    backgroundColor: '#D8823B',
    marginTop: -10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  slogan: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: Spacing.one,
    fontStyle: 'italic',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.six,
    width: '60%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#D8823B',
  },
  dividerIcon: {
    color: '#D8823B',
    paddingHorizontal: 10,
    fontSize: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
