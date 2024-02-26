"use client";

import { useSearchParams } from "next/navigation";
import usePartySocket from "partysocket/react";
import { useState, useEffect, useCallback, useRef } from "react";
import useSound from "use-sound";

const soundUrl = "/sounds/909-drums.mp3";

const PARTYKIT_URL = "http://127.0.0.1:1999";

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

const soundsForSprite = {
  kick: [0, 350] as [number, number],
  hihat: [374, 160] as [number, number],
  snare: [666, 290] as [number, number],
  cowbell: [968, 200] as [number, number],
};

type SoundsForTurn = {
  [sound: string]: SoundAtBeat[];
};

type SoundType = keyof typeof soundsForSprite;
const Player = ({ roomId, turn }: { roomId: string; turn: SoundType }) => {
  const { beat, reset } = useBeats(1000);
  const [sounds, setSounds] = useState<SoundAtBeat[]>([]);
  const [mode, setMode] = useState<"record" | "playback" | null>(null);
  const [playBackIndex, setPlaybackIndex] = useState(0);
  const [play] = useSound(soundUrl, {
    sprite: soundsForSprite,
  });

  const socket = usePartySocket({
    host: PARTYKIT_URL,
    room: roomId as string,
    onMessage(event) {
      const soundAtBeat = JSON.parse(event.data) as SoundsForTurn;
      const incomingSounds = new Set(
        Object.entries(soundAtBeat).map(([sound]) => sound)
      );
      setSounds((currentSounds) => {
        if (currentSounds.length === 0) {
          return Object.entries(soundAtBeat)
            .map(([sound, sounds]) => sounds)
            .flat();
        }
        // Remove existing sounds for the same sound
        // Then add the new sounds
        return [
          ...currentSounds.filter(
            (sound) => sound.sound === turn || !incomingSounds.has(sound.sound)
          ),
          ...Object.entries(soundAtBeat)
            .filter(([sound]) => sound !== turn)
            .map(([sound, sounds]) => sounds)
            .flat(),
        ];
      });
    },
  });

  const updateMode = (newMode: typeof mode) => {
    if (newMode === mode) {
      return;
    }

    switch (newMode) {
      case "record":
        reset();
        setSounds((sounds) => sounds.filter((sound) => sound.sound !== turn));
        break;
      case "playback":
        reset();
        // sort sounds by beat
        setSounds((sounds) => sounds.sort((a, b) => a.beat - b.beat));
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
      if (turn === sound) {
        setSounds((sounds) => [...sounds, { beat, sound }]);
      }
    }
  };

  useKeyboardBindings({
    // 1: () => playSound("kick"),
    // 2: () => playSound("hihat"),
    // 3: () => playSound("snare"),
    // 4: () => playSound("cowbell"),
    " ": () => turn && playSound(turn),
  });

  useEffect(() => {
    if (mode == null) {
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
  const lineRef = useRef<HTMLDivElement>(null);

  const sendSound = () => {
    const soundsForTurn = sounds.filter((sound) => sound.sound === turn);
    socket.send(JSON.stringify(soundsForTurn));
  };

  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.style.left = `${beat}px`;
    }
  }, [beat]);

  const soundTypes = Object.keys(soundsForSprite);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {mode}
      <div
        style={{
          position: "relative",
          height: "100px",
          width: "100%",
          border: "1px solid white",
        }}
      >
        <div
          ref={lineRef}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "1px",
            background: "#fda4af",
            boxShadow: "0 0 5px #fda4af, 0 0 5px #fda4af",
          }}
        />
        {soundTypes.map((sound, index) => (
          <div
            key={index}
            style={{
              height: "25px",
              border: "1px solid gray",
              color: "#64748b",
            }}
          >
            {sound}
          </div>
        ))}
        {sounds.map((sound, index) => {
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: `${sound.beat}px`,
                top: soundTypes.indexOf(sound.sound) * 25,
                height: "25px",
                width: "1px",
                background: "#93c5fd",
                boxShadow: "0 0 5px #93c5fd, 0 0 5px #93c5fd",
              }}
            />
          );
        })}
      </div>
      {turn && (
        <div className="bg-blue-500 text-white font-bold py-2 px-4 rounded text-center">
          You are {turn}
        </div>
      )}
      {roomId && (
        <div className="bg-blue-500 text-white font-bold py-2 px-4 rounded text-center">
          Room ID: {roomId}
        </div>
      )}
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
          onClick={() => reset()}
        >
          Reset
        </button>
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => updateMode("playback")}
        >
          Play
        </button>
        <button
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          onClick={sendSound}
        >
          Send
        </button>
      </div>
    </main>
  );
};

export default function Home({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const turn = searchParams?.get("turn") as SoundType;

  if (!roomId) {
    return <div>No room ID</div>;
  }

  return <Player roomId={roomId} turn={turn} />;
}
