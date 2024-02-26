"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

const PARTYKIT_URL = "http://127.0.0.1:1999";

const JoinRoom = ({
  onRoomJoined,
}: {
  onRoomJoined: (roomId: string, sound: string) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const joinRoom = useCallback(async () => {
    setLoading(true);
    setError(null);
    let id = roomId || Math.random().toString(36).substring(7);
    try {
      const response = await fetch(`${PARTYKIT_URL}/party/${id}`, {
        method: "POST",
        mode: "cors", // defaults to same-origin
        body: JSON.stringify({
          name,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const { sound } = await response.json();
      onRoomJoined(id, sound);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, onRoomJoined, name]);

  return (
    <div className="flex-col">
      <input
        className="h-10 px-5 pr-16 rounded-lg text-black"
        value={roomId}
        placeholder="Room ID"
        onChange={(e) => setRoomId(e.target.value)}
      />
      <input
        className="h-10 px-5 pr-16 rounded-lg text-black"
        value={name}
        placeholder="Name"
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex items-center justify-center mt-10">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2"
          type="button"
          disabled={loading}
          onClick={joinRoom}
        >
          Join or create
        </button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <JoinRoom
        onRoomJoined={(roomId, assignedSound) => {
          router.push(`/rooms/${roomId}?turn=${assignedSound}`);
        }}
      />
    </main>
  );
}
