export const JITSI_BASE_URL = process.env.NEXT_PUBLIC_JITSI_URL?.replace(/\/+$/, "") ?? "https://meet.jit.si";
export const JITSI_ROOM_PREFIX = process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX?.trim() || process.env.NEXT_PUBLIC_JITSI_APP_ID?.trim();

export function getJitsiRoomName(roomId: string) {
  const cleanRoomId = roomId.trim();
  return JITSI_ROOM_PREFIX ? `${JITSI_ROOM_PREFIX}/${cleanRoomId}` : cleanRoomId;
}

export function getJitsiRoomUrl(roomId: string) {
  const roomSegments = getJitsiRoomName(roomId)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment));

  return `${JITSI_BASE_URL}/${roomSegments.join('/')}`;
}

export function getJitsiIframeUrl(roomId: string, extraHash = "") {
  return `${getJitsiRoomUrl(roomId)}${extraHash}`;
}
