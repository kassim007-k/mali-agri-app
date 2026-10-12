import { supabase } from '@/lib/supabase';

export function subscribeToAgriTables(
  channelName: string,
  tables: readonly string[],
  onChange: () => void,
) {
  let channel = supabase.channel(`agri:${channelName}`);

  for (const table of tables) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      onChange,
    );
  }

  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
