"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useSound from "use-sound";

const soundUrl = "/sounds/909-drums.mp3";

const useKeyboardBindings = (map: Record<string | number, () => void>) => {
  useEffect(() => {
    const handlePress = (ev: KeyboardEvent) => {
      const handler = map[ev.key];

      if (typeof handler === "function") {
        handler();
      }
    };

    window.addEventListener("keydown", handlePress);

    return () => {
      window.removeEventListener("keydown", handlePress);
    };
  }, [map]);
};

const useBeats = (bpm: number) => {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setBeat((beat) => beat + 1);
    }, 60000 / bpm);
    return () => clearInterval(id);
  }, [bpm]);

  const reset = useCallback(() => {
    setBeat(0);
  }, [setBeat]);

  return {
    beat,
    reset,
  };
};

interface SoundAtBeat {
  beat: number;
  sound: string;
}

export default function Home() {
  const { beat, reset } = useBeats(600);
  const [sounds, setSounds] = useState<SoundAtBeat[]>([]);
  const [mode, setMode] = useState<"record" | "playback" | null>(null);
  const [playBackIndex, setPlaybackIndex] = useState(0);
  const [play] = useSound(soundUrl, {
    sprite: {
      kick: [0, 350],
      hihat: [374, 160],
      snare: [666, 290],
      cowbell: [968, 200],
    },
  });

  const updateMode = (newMode: typeof mode) => {
    // if (newMode === mode) {
    //   return;
    // }

    switch (newMode) {
      case "record":
        reset();
        setSounds([]);
        break;
      case "playback":
        reset();
        setPlaybackIndex(0);
        break;
      default:
        break;
    }

    setMode(newMode);
  };

  const playSound = (sound: string) => {
    play({ id: sound });
    if (mode === "record") {
      setSounds((sounds) => [...sounds, { beat, sound }]);
    }
  };

  useKeyboardBindings({
    1: () => playSound("kick"),
    2: () => playSound("hihat"),
    3: () => playSound("snare"),
    4: () => playSound("cowbell"),
  });

  useEffect(() => {
    if (mode !== "playback") {
      return;
    }

    if (sounds[playBackIndex] && sounds[playBackIndex].beat === beat) {
      // Find all the sounds until the next beat, starting from the current index
      let i = playBackIndex;
      for (; i < sounds.length; i++) {
        if (sounds[i].beat === beat) {
          play({ id: sounds[i].sound });
        } else {
          break;
        }
      }
      setPlaybackIndex(i);
    }
  }, [beat, mode]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {beat}
      {mode}
      {JSON.stringify(sounds)}
      <div className="flex justify-center space-x-4">
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => updateMode("record")}
        >
          Record
        </button>
        <button
          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => updateMode(null)}
        >
          Stop
        </button>
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => updateMode("playback")}
        >
          Play
        </button>
      </div>
    </main>
  );
}
