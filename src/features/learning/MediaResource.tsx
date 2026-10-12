import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';

import { Colors, Spacing } from '@/constants/theme';
import type { AgriLesson } from '@/features/data/database.types';

type Props = {
  kind: Exclude<AgriLesson['media_type'], 'text'>;
  url: string | null;
};

const isDirectMedia = (kind: Props['kind'], url: string) => {
  const extension = kind === 'video' ? /\.(mp4|m3u8)(?:[?#].*)?$/i : /\.(mp3|m4a|aac|wav|ogg)(?:[?#].*)?$/i;
  return extension.test(url);
};

export default function MediaResource({ kind, url }: Props) {
  if (url && /^https:\/\//i.test(url) && isDirectMedia(kind, url)) {
    return kind === 'video' ? <VideoLessonPlayer uri={url} /> : <AudioLessonPlayer uri={url} />;
  }

  return <ExternalResource kind={kind} url={url} />;
}

function VideoLessonPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  return (
    <View style={styles.videoFrame}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        fullscreenOptions={{ enable: true }}
        contentFit="contain"
        playsInline
      />
    </View>
  );
}

function AudioLessonPlayer({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const progress = status.duration > 0 ? Math.min(status.currentTime / status.duration, 1) : 0;

  return (
    <View style={styles.audioCard}>
      <Pressable
        onPress={() => status.playing ? player.pause() : player.play()}
        style={styles.audioButton}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Mettre en pause' : 'Écouter la leçon'}
      >
        <Text style={styles.audioButtonText}>{status.playing ? 'Ⅱ' : '▶'}</Text>
      </Pressable>
      <View style={styles.audioDetails}>
        <Text style={styles.audioTitle}>{status.isBuffering ? 'Chargement du son…' : status.playing ? 'Lecture audio' : 'Écouter la leçon'}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
        <Text style={styles.audioTime}>{formatTime(status.currentTime)} / {formatTime(status.duration)}</Text>
      </View>
    </View>
  );
}

function ExternalResource({ kind, url }: Props) {
  const openPage = async () => {
    if (!url || !/^https:\/\//i.test(url)) {
      Alert.alert('Ressource indisponible', 'Le lien HTTPS de cette ressource n’a pas été renseigné.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Ouverture impossible', 'Vérifiez votre connexion puis réessayez.');
    }
  };

  return (
    <View style={styles.externalCard}>
      <View style={styles.resourceIcon}><Text style={styles.resourceIconText}>{kind === 'video' ? '▶' : '♫'}</Text></View>
      <View style={styles.externalCopy}>
        <Text style={styles.externalTitle}>{kind === 'video' ? 'Vidéo de formation' : 'Audio de formation'}</Text>
        <Text style={styles.externalHint}>Ouvrir la page de la ressource; connexion Internet requise.</Text>
      </View>
      <Pressable onPress={() => void openPage()} style={styles.externalButton} accessibilityRole="button">
        <Text style={styles.externalButtonText}>Ouvrir</Text>
      </Pressable>
    </View>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  videoFrame: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', borderRadius: 16, backgroundColor: '#14251B', marginTop: Spacing.three },
  video: { width: '100%', height: '100%' },
  audioCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: '#FFFFFF', borderRadius: 16, padding: Spacing.three, marginTop: Spacing.three, borderWidth: 1, borderColor: '#E6ECE8' },
  audioButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: Colors.light.primary },
  audioButtonText: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  audioDetails: { flex: 1, gap: 6 },
  audioTitle: { color: '#26332C', fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#E7EEE9', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.light.accent },
  audioTime: { color: '#78857D', fontSize: 10 },
  externalCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: '#FFFFFF', borderRadius: 16, padding: Spacing.two, marginTop: Spacing.three, borderWidth: 1, borderColor: '#E6ECE8' },
  resourceIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#EAF2EC', alignItems: 'center', justifyContent: 'center' },
  resourceIconText: { color: Colors.light.primary, fontSize: 19, fontWeight: '800' },
  externalCopy: { flex: 1, gap: 3 },
  externalTitle: { color: '#26332C', fontSize: 13, fontWeight: '800' },
  externalHint: { color: '#69766E', fontSize: 11, lineHeight: 16 },
  externalButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: Colors.light.primary, paddingHorizontal: 14 },
  externalButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
