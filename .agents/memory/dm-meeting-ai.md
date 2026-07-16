---
name: Messaging, Meetings, AI Support Architecture
description: How private messaging, Jitsi meetings, and role-aware AI were built into the MG platform
---

## Direct Messaging
- `DirectConversation` — links adminId + participantId (unique pair); admin always initiates
- `DirectMessage` — senderId, body, readAt (null = unread), conversationId
- Notification bell polls `/api/dm/unread` every 30s, shows red badge
- Messages page polls `/api/dm/conversations/{id}/messages` every 5s
- `NotificationBell` at `src/components/notification-bell.tsx` accepts `href` prop
- Admin messages page at `/admin/messages` (full dual-panel UI)
- Client/Staff messages at `/client/messages` and `/staff/messages`

**Why:** Existing `Message` model was one-way system notifications — unusable for private chat.

## Meetings (Jitsi Embed)
- `Meeting` model — roomId is unique nanoid (format: `mg-{nanoid(10)}`), scheduledAt/endsAt
- Jitsi embed URL: `https://meet.jit.si/{roomId}#config.startWithAudioMuted=false&config.prejoinPageEnabled=false`
- iframe needs `allow="camera; microphone; fullscreen; display-capture; autoplay"`
- Admin creates meetings at `/admin/meetings`, all portals can join
- No API key needed — meet.jit.si is free and public

**Why:** Jitsi chosen over Zoom/Daily because it needs zero API credentials.

## AI Platform Support
- Route: `POST /api/ai/platform-support` (uses same OpenAI pattern as admin/ai/actions.ts)
- `buildSystemPrompt(role, staffRole)` switches system prompt by role
- CLIENT: platform guide, booking/gallery help
- PHOTOGRAPHER: Lightroom, Photoshop, Capture One
- VIDEO_EDITOR: Premiere Pro, After Effects, DaVinci Resolve
- EDITOR: Lightroom, Photoshop frequency separation, Topaz AI
- PRODUCTION_MANAGER/COORDINATOR: project management tools
- Chat UI at `/client/ai-support` and `/staff/ai-support`

## Key Auth Pattern for API Routes
- Always use `getCurrentUser()` (not `requireAdmin()`) for routes accessed by all roles
- Check `user.role === "FOUNDER" || user.role === "ADMIN" || user.staffRole === "ADMIN"` for admin-only ops
