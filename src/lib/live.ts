import { useEffect, useRef, useState } from "react";

/** One shared websocket to the server's live hub; components subscribe to channels (feed, token:<a>, wallet:<a>). */
type Frame = { channel: string; type: string; data: unknown };
type Listener = (f: Frame) => void;

let socket: WebSocket | undefined;
let connected = false;
const listeners = new Map<string, Set<Listener>>();
const statusListeners = new Set<(c: boolean) => void>();

function url(): string {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) return configured;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws`;
}

function ensure(): void {
  if (socket && socket.readyState <= 1) return;
  socket = new WebSocket(url());
  socket.onopen = () => {
    connected = true;
    statusListeners.forEach((l) => l(true));
    for (const channel of listeners.keys()) socket?.send(JSON.stringify({ subscribe: channel }));
  };
  socket.onmessage = (m) => {
    const frame = JSON.parse(String(m.data)) as Frame;
    listeners.get(frame.channel)?.forEach((l) => l(frame));
  };
  socket.onclose = () => {
    connected = false;
    statusListeners.forEach((l) => l(false));
    setTimeout(ensure, 2000);
  };
}

export function useLive(channel: string | undefined, onFrame: Listener): void {
  const ref = useRef(onFrame);
  ref.current = onFrame;
  useEffect(() => {
    if (!channel) return;
    const key = channel.toLowerCase();
    const l: Listener = (f) => ref.current(f);
    let set = listeners.get(key);
    if (!set) listeners.set(key, (set = new Set()));
    set.add(l);
    ensure();
    if (socket?.readyState === 1) socket.send(JSON.stringify({ subscribe: key }));
    return () => {
      set!.delete(l);
      if (set!.size === 0) {
        listeners.delete(key);
        if (socket?.readyState === 1) socket.send(JSON.stringify({ unsubscribe: key }));
      }
    };
  }, [channel]);
}

export function useLiveStatus(): boolean {
  const [c, setC] = useState(connected);
  useEffect(() => {
    statusListeners.add(setC);
    ensure();
    return () => void statusListeners.delete(setC);
  }, []);
  return c;
}
