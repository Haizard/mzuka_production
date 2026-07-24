export const JITSI_BASE_URL = process.env.NEXT_PUBLIC_JITSI_URL?.replace(/\/+$/, "") ?? "https://meet.jit.si";
export const JITSI_ROOM_PREFIX = process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX?.trim();

export function getJitsiRoomName(roomId: string) {
  return JITSI_ROOM_PREFIX ? `${JITSI_ROOM_PREFIX}/${roomId}` : roomId;
}

export function getJitsiRoomUrl(roomId: string) {
  return `${JITSI_BASE_URL}/${encodeURIComponent(getJitsiRoomName(roomId))}`;
}

export function getJitsiIframeUrl(roomId: string, extraHash = "") {
  return `${getJitsiRoomUrl(roomId)}${extraHash}`;
}
