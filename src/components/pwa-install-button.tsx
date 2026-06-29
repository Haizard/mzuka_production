"use client";

import { useEffect, useState } from "react";

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      // @ts-ignore
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        // @ts-ignore
        deferredPrompt.prompt();
        // @ts-ignore
        const choiceResult = await deferredPrompt.userChoice;
        setVisible(false);
        setDeferredPrompt(null);
        // Optionally log choiceResult.outcome
      } catch (e) {
        setVisible(false);
      }
    } else {
      // Fallback: show simple instructions for manual install
      const message = `To install this app: open your browser menu and choose "Install app" (or "Add to Home screen").`;
      // eslint-disable-next-line no-alert
      alert(message);
    }
  };

  // Always render a small floating button so users can install anytime
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 20,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
      }}
    >
      <button
        aria-label="Install app"
        onClick={handleInstallClick}
        style={{
          background: "#d4af37",
          color: "#050505",
          border: "none",
          padding: "10px 14px",
          borderRadius: 9999,
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Install
      </button>
    </div>
  );
}
