import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { getPokemonCryUrl } from '@/api/pokemonAudio';
import { PALETTE } from '@/constants/typeColors';

/** Configure the audio session once per app run, so cries play in iOS silent mode. */
let audioModeConfigured = false;

interface CryButtonProps {
  /** Canonical PokéAPI name; the only input to the cry source. */
  apiName: string;
  /** Accent color of the current Pokémon's primary type. */
  accent: string;
}

/**
 * Plays the current Pokémon's cry from Pokémon Showdown. The player source
 * depends only on `apiName`, so Normal/Shiny and FR/EN re-renders neither
 * reload the audio nor trigger any network request for detail data.
 */
export function CryButton({ apiName, accent }: CryButtonProps) {
  const url = getPokemonCryUrl(apiName);
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  // Keyed by name so a new Pokémon gets a fresh chance without an effect.
  const [failedFor, setFailedFor] = useState<string | null>(null);

  useEffect(() => {
    if (audioModeConfigured) return;
    audioModeConfigured = true;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
      // Non-fatal: playback still works, just not with the iOS mute switch on.
    });
  }, []);

  const unavailable = url === null || failedFor === apiName || status.error !== null;

  async function playCry() {
    try {
      // Rewind first so a tap after the cry ended replays it from the start.
      await player.seekTo(0);
      player.play();
    } catch {
      setFailedFor(apiName);
    }
  }

  const label = unavailable ? 'Cri indisponible' : status.playing ? '▶ Cri…' : '▶ Cri';

  return (
    <Pressable
      onPress={playCry}
      disabled={unavailable || !status.isLoaded}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={unavailable ? `Cri de ${apiName} indisponible` : `Écouter le cri de ${apiName}`}
      accessibilityState={{ disabled: unavailable || !status.isLoaded, busy: status.playing }}
      style={[
        styles.button,
        { backgroundColor: accent },
        (unavailable || !status.isLoaded) && styles.buttonDisabled,
      ]}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.white,
  },
});
