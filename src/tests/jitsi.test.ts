import { generateKeyPairSync } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Jitsi URL helpers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('builds JaaS-style room URLs with a path prefix', async () => {
    process.env.NEXT_PUBLIC_JITSI_URL = 'https://8x8.vc';
    process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX = 'vpaas-magic-cookie-abc123';

    const { getJitsiRoomUrl } = await import('../lib/jitsi');

    expect(getJitsiRoomUrl('my-room')).toBe('https://8x8.vc/vpaas-magic-cookie-abc123/my-room');
  });

  it('keeps room IDs as separate path segments when no prefix is set', async () => {
    process.env.NEXT_PUBLIC_JITSI_URL = 'https://meet.jit.si';
    process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX = '';

    const { getJitsiRoomUrl } = await import('../lib/jitsi');

    expect(getJitsiRoomUrl('my-room')).toBe('https://meet.jit.si/my-room');
  });

  it('uses the JaaS app ID as the room prefix when no explicit prefix is provided', async () => {
    process.env.NEXT_PUBLIC_JITSI_URL = 'https://8x8.vc';
    process.env.NEXT_PUBLIC_JITSI_APP_ID = 'vpaas-magic-cookie-09e2a798c83341f590987c94519ef889';
    process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX = '';

    const { getJitsiRoomUrl } = await import('../lib/jitsi');

    expect(getJitsiRoomUrl('my-room')).toBe('https://8x8.vc/vpaas-magic-cookie-09e2a798c83341f590987c94519ef889/my-room');
  });

  it('creates an RS256 JaaS-style JWT with the expected header and claims', async () => {
    const { createJitsiJwt } = await import('../lib/jitsi-server');
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const token = createJitsiJwt({
      roomId: '*',
      userId: 'user-1',
      userName: 'Test User',
      userEmail: 'test@example.com',
      isModerator: true,
      appId: 'vpaas-magic-cookie-09e2a798c83341f590987c94519ef889',
      privateKey,
      kid: 'vpaas-magic-cookie-09e2a798c83341f590987c94519ef889/DEFAULT_KEY',
    });

    const [header, payload] = token.split('.');
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

    expect(decodedHeader.alg).toBe('RS256');
    expect(decodedHeader.kid).toContain('vpaas-magic-cookie-09e2a798c83341f590987c94519ef889');
    expect(decodedPayload.room).toBe('*');
    expect(decodedPayload.context.user.moderator).toBe(true);
    expect(decodedPayload.context.user.email).toBe('test@example.com');
    expect(decodedPayload.sub).toBe('vpaas-magic-cookie-09e2a798c83341f590987c94519ef889');
    expect(publicKey).toContain('BEGIN PUBLIC KEY');
  });
});
