"use client";

/**
 * GalleryProtection — mounts browser-side deterrents on preview-only galleries.
 *
 * What it does:
 *  - CSS: disables right-click context menu on images
 *  - CSS: disables drag-and-drop on images
 *  - CSS: applies user-select:none across the gallery
 *  - JS:  listens for visibility change (screen-record / tab-switch detection)
 *         and blurs the page when hidden
 *  - JS:  detects PrintScreen keydown and briefly hides images
 *  - JS:  logs a deterrent warning to the console
 *
 * IMPORTANT: These measures are deterrents only.
 * They CANNOT prevent someone photographing the screen with another device.
 * Dynamic watermarks (applied server-side) are the primary protection.
 */
import { useEffect } from "react";

interface GalleryProtectionProps {
  /** Only apply protections when not paid (preview mode) */
  isPreview: boolean;
  /** Client name embedded in warning messages */
  clientName?: string;
}

export function GalleryProtection({ isPreview, clientName }: GalleryProtectionProps) {
  useEffect(() => {
    if (!isPreview) return;

    // ── CSS injection ────────────────────────────────────────────────────────
    const style = document.createElement("style");
    style.id = "mg-gallery-protection";
    style.textContent = `
      .mg-protected-gallery img {
        pointer-events: none !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-user-drag: none !important;
      }
      .mg-protected-gallery {
        user-select: none !important;
        -webkit-user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    // ── Right-click block on images ──────────────────────────────────────────
    const blockContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.tagName === "IMG") {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", blockContextMenu);

    // ── Drag block on images ─────────────────────────────────────────────────
    const blockDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement)?.tagName === "IMG") {
        e.preventDefault();
      }
    };
    document.addEventListener("dragstart", blockDrag);

    // ── Visibility change (screen-record / alt-tab detection) ────────────────
    // When the user switches away and comes back, blur images briefly
    let blurTimeout: ReturnType<typeof setTimeout>;
    const handleVisibility = () => {
      if (document.hidden) {
        // Page hidden — could be screen-recording starting
        document.querySelectorAll(".mg-protected-gallery img").forEach((img) => {
          (img as HTMLElement).style.filter = "blur(20px)";
        });
      } else {
        // Restore after brief delay (discourage recording the unblur animation)
        blurTimeout = setTimeout(() => {
          document.querySelectorAll(".mg-protected-gallery img").forEach((img) => {
            (img as HTMLElement).style.filter = "";
          });
        }, 800);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // ── PrintScreen key detection ────────────────────────────────────────────
    const handleKeydown = (e: KeyboardEvent) => {
      // PrintScreen: key = "PrintScreen", some browsers fire it
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        // Briefly hide images
        document.querySelectorAll(".mg-protected-gallery img").forEach((img) => {
          (img as HTMLElement).style.opacity = "0";
        });
        setTimeout(() => {
          document.querySelectorAll(".mg-protected-gallery img").forEach((img) => {
            (img as HTMLElement).style.opacity = "";
          });
        }, 1000);
      }
    };
    document.addEventListener("keydown", handleKeydown);

    // ── Console warning ──────────────────────────────────────────────────────
    console.warn(
      `%c[MG] Muzuka Gilbert — Protected Gallery`,
      "color:#FFD700;font-size:14px;font-weight:bold;",
    );
    console.warn(
      `%cThis gallery is watermarked and access-logged for: ${clientName ?? "this account"}.\nUnauthorized reproduction is prohibited.`,
      "color:#ff6b6b;font-size:12px;"
    );

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("dragstart", blockDrag);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("keydown", handleKeydown);
      clearTimeout(blurTimeout);
      document.getElementById("mg-gallery-protection")?.remove();
    };
  }, [isPreview, clientName]);

  // Renders nothing — side-effects only
  return null;
}
