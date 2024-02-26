import type * as Party from "partykit/server";

interface SoundAtBeat {
  beat: number;
  sound: string;
}

interface JoinRequest {
  name: string;
}

const AVAILABLE_SOUNDS = ["kick", "hihat", "snare", "cowbell"];

export default class Server implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onRequest(req: Party.Request) {
    const soundsAtBeat =
      (await this.room.storage.get<SoundAtBeat[]>("soundsAtBeat")) ?? [];
    const players =
      (await this.room.storage.get<
        {
          name: string;
          assignedSound: string;
        }[]
      >("players")) ?? [];
    console.log("players", players);
    if (req.method === "POST") {
      const request = (await req.json()) as JoinRequest;
      console.log("request", request);
      const existingPlayer = players.find(
        (player) => player.name === request.name
      );
      let sound = existingPlayer?.assignedSound;
      if (!sound) {
        const availableSound = AVAILABLE_SOUNDS.find(
          (sound) => !players.some((player) => player.assignedSound === sound)
        );
        console.log("availableSound", availableSound);
        if (!availableSound) {
          return new Response("No available sounds", { status: 400 });
        } else {
          players.push({
            name: request.name,
            assignedSound: availableSound,
          });
          await this.room.storage.put("players", players);
          sound = availableSound;
        }
      }
      console.log(JSON.stringify({ sound, players: players }));
      return new Response(JSON.stringify({ sound }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers",
        },
      });
    }
    if (req.method === "OPTIONS") {
      return new Response("", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  }

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A websocket just connected!
    const soundsAtBeat =
      (await this.room.storage.get<SoundAtBeat[]>("soundsAtBeat")) ?? [];

    console.log(
      `Connected:
  id: ${conn.id}
  room: ${this.room.id}
  url: ${new URL(ctx.request.url).pathname}`
    );

    // let's send a message to the connection
    // conn.send("hello from server");
    const soundsAtBeatMap = soundsAtBeat.reduce((acc, soundAtBeat) => {
      if (!acc[soundAtBeat.sound]) {
        acc[soundAtBeat.sound] = [];
      }
      acc[soundAtBeat.sound].push(soundAtBeat);
      return acc;
    }, {} as Record<string, number[]>);

    console.log("soundsAtBeatMap", soundsAtBeatMap);
    conn.send(JSON.stringify(soundsAtBeatMap));
  }

  async onMessage(message: string, sender: Party.Connection) {
    console.log(`connection ${sender.id} sent message: ${message}`);
    const beats = JSON.parse(message) as SoundAtBeat[];
    if (beats.length === 0) {
      return;
    }

    const soundAtBeat = beats[0].sound;

    const broadcastedMessage = JSON.stringify({
      [soundAtBeat]: beats,
    });

    await this.room.storage.put(
      "soundsAtBeat",
      (await this.room.storage.get<SoundAtBeat[]>("soundsAtBeat"))
        ?.filter((soundAtBeat) => soundAtBeat.sound !== beats[0].sound)
        ?.concat(beats) ?? beats
    );

    this.room.broadcast(
      broadcastedMessage,
      // ...except for the connection it came from
      [sender.id]
    );
  }
}

Server satisfies Party.Worker;
