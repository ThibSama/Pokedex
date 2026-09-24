import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getPokemonCryUrl } from "@/api/pokemonAudio";
import { IconButton } from "@/components/Controls";

// Entre 0.0 et 1.0.
const CRY_VOLUME = 0.05;

// Session audio configurée une fois par exécution, pour jouer en mode silencieux iOS.
let audioModeConfigured = false;

interface CryButtonProps {
  apiName: string;
  name: string;
  accent: string;
}

// La source ne dépend que de `apiName` : changer de variante ou de langue ne recharge pas l'audio.
export function CryButton({ apiName, name, accent }: CryButtonProps) {
  const { t } = useTranslation();
  const url = getPokemonCryUrl(apiName);
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  // Indexé par nom : un nouveau Pokémon retente sa chance sans effet.
  const [failedFor, setFailedFor] = useState<string | null>(null);

  useEffect(() => {
    if (audioModeConfigured) return;
    audioModeConfigured = true;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
      // Sans gravité : la lecture marche, sauf avec le mode silencieux iOS activé.
    });
  }, []);

  const unavailable =
    url === null || failedFor === apiName || status.error !== null;
  const disabled = unavailable || !status.isLoaded;

  async function playCry() {
    try {
      // AudioPlayer est un objet Expo impératif : son API documentée expose
      // volume comme propriété mutable.
      // eslint-disable-next-line react-hooks/immutability
      player.volume = CRY_VOLUME;

      // On rembobine pour qu'un appui après la fin rejoue le cri depuis le début.
      await player.seekTo(0);
      player.play();
    } catch {
      setFailedFor(apiName);
    }
  }

  return (
    <IconButton
      icon={unavailable ? "volume-off" : "volume-high"}
      accent={accent}
      active={status.playing}
      disabled={disabled}
      onPress={playCry}
      accessibilityLabel={t(
        unavailable ? "detail.cryUnavailable" : "detail.cryPlay",
        { name },
      )}
      busy={status.playing}
    />
  );
}
