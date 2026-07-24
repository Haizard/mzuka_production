export const JITSI_BASE_URL = process.env.NEXT_PUBLIC_JITSI_URL?.replace(/\/+$/, "") ?? "https://meet.jit.si";

export function getJitsiRoomUrl(roomId: string) {
  return `${JITSI_BASE_URL}/${encodeURIComponent(roomId)}`;
}

export function getJitsiIframeUrl(roomId: string, extraHash = "") {
  return `${getJitsiRoomUrl(roomId)}${extraHash}`;
}
