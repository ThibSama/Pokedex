import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';

import { getPokemonCryUrl } from '@/api/pokemonAudio';
import { IconButton } from '@/components/Controls';

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
 *
 * Rendered as one of the detail screen's round icon buttons, so it sits in the
 * secondary action row without competing with the Figma hierarchy.
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
  const disabled = unavailable || !status.isLoaded;

  async function playCry() {
    try {
      // Rewind first so a tap after the cry ended replays it from the start.
      await player.seekTo(0);
      player.play();
    } catch {
      setFailedFor(apiName);
    }
  }

  return (
    <IconButton
      icon={unavailable ? 'volume-off' : 'volume-high'}
      accent={accent}
      active={status.playing}
      disabled={disabled}
      onPress={playCry}
      accessibilityLabel={unavailable ? `Cri de ${apiName} indisponible` : `Écouter le cri de ${apiName}`}
      accessibilityState={{ busy: status.playing }}
    />
  );
}
