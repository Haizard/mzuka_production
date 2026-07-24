import Pusher from "pusher";

function getPusherConfig() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) return null;
  return { appId, key, secret, cluster };
}

let pusher: Pusher | null | undefined;

export function getPusher() {
  if (pusher !== undefined) return pusher;
  const config = getPusherConfig();
  pusher = config ? new Pusher({ ...config, useTLS: true }) : null;
  return pusher;
}

export function conversationChannel(conversationId: string) {
  return `private-conversation-${conversationId}`;
}

export async function publishDirectMessage(conversationId: string, message: unknown) {
  const client = getPusher();
  if (!client) return;
  await client.trigger(conversationChannel(conversationId), "message:created", { message });
}
