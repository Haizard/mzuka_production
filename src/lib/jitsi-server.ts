import { createSign } from "crypto";

interface JitsiJwtPayload {
  aud: string;
  iss: string;
  iat: number;
  exp: number;
  nbf: number;
  sub: string;
  room: string;
  context: {
    features?: Record<string, boolean>;
    user: {
      id: string;
      name: string;
      email?: string;
      avatar?: string;
      moderator?: boolean;
      "hidden-from-recorder"?: boolean;
    };
  };
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

export function createJitsiJwt({
  roomId,
  userId,
  userName,
  userEmail,
  isModerator,
  appId,
  privateKey,
  kid,
  audience = "jitsi",
  expiresInSeconds = 60 * 60,
}: {
  roomId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  isModerator: boolean;
  appId: string;
  privateKey: string;
  kid?: string;
  audience?: string;
  expiresInSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: JitsiJwtPayload = {
    aud: audience,
    iss: appId,
    iat: now,
    exp: now + expiresInSeconds,
    nbf: now - 60,
    sub: appId,
    room: roomId,
    context: {
      features: {
        livestreaming: true,
        "file-upload": true,
        "outbound-call": true,
        "sip-outbound-call": true,
        transcription: true,
        "list-visitors": true,
        recording: true,
        flip: false,
      },
      user: {
        id: userId,
        name: userName || "User",
        email: userEmail,
        avatar: "",
        moderator: isModerator,
        "hidden-from-recorder": true,
      },
    },
  };

  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(normalizePrivateKey(privateKey), "base64url");

  return `${signingInput}.${signature}`;
}
