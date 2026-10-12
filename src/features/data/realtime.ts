import { supabase } from '@/lib/supabase';

/**
 * S'abonne aux changements en temps réel de manière sécurisée.
 * Empêche l'erreur "cannot add callbacks after subscribe" en utilisant
 * des noms de canaux uniques et en respectant l'ordre des opérations.
 */
export function subscribeToAgriTables(
  channelName: string,
  tables: readonly string[],
  onChange: () => void,
) {
  if (!tables || tables.length === 0) return () => {};

  // 1. On crée un ID unique pour CET abonnement précis
  const subscriptionId = Math.random().toString(36).slice(2, 9);
  const internalChannelName = `agri_rt_${channelName}_${subscriptionId}`;

  const channel = supabase.channel(internalChannelName);

  console.log(`[Realtime] 📡 Inscription : ${internalChannelName}`);

  // 2. On ajoute les écouteurs AVANT d'appeler subscribe()
  // C'est la règle d'or de Supabase Realtime.
  tables.forEach((table) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        console.log(`[Realtime] 🔔 Modification sur ${table}`);
        onChange();
      }
    );
  });

  // 3. On lance l'abonnement
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[Realtime] ✅ Connecté : ${internalChannelName}`);
    }
  });

  // 4. Nettoyage : on ferme CE canal précis quand le composant est détruit
  return () => {
    console.log(`[Realtime] 🚪 Fermeture : ${internalChannelName}`);
    void supabase.removeChannel(channel);
  };
}
