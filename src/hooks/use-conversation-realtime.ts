"use client";

import { useEffect, useState } from "react";
import Pusher from "pusher-js";

type RealtimeMessage = { id: string };
type Options<T extends RealtimeMessage> = { conversationId?: string; onMessage: (message: T) => void; onRefresh: () => void };

/** Uses private managed WebSocket channels, with five-second polling as a safe fallback. */
export function useConversationRealtime<T extends RealtimeMessage>({ conversationId, onMessage, onRefresh }: Options<T>) {
  const [isLive, setIsLive] = useState(false);
  useEffect(() => {
    if (!conversationId) return;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) {
      const poll = window.setInterval(onRefresh, 5000);
      return () => window.clearInterval(poll);
    }
    const pusher = new Pusher(key, { cluster, authEndpoint: "/api/realtime/auth" });
    const channelName = `private-conversation-${conversationId}`;
    const channel = pusher.subscribe(channelName);
    const connected = () => setIsLive(true);
    const disconnected = () => setIsLive(false);
    const received = (event: { message?: T }) => { if (event.message) onMessage(event.message); onRefresh(); };
    pusher.connection.bind("connected", connected);
    pusher.connection.bind("disconnected", disconnected);
    pusher.connection.bind("error", disconnected);
    channel.bind("message:created", received);
    return () => {
      channel.unbind("message:created", received);
      pusher.connection.unbind("connected", connected);
      pusher.connection.unbind("disconnected", disconnected);
      pusher.connection.unbind("error", disconnected);
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [conversationId, onMessage, onRefresh]);
  return isLive;
}
