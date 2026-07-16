"use client";

import { useEffect, useState } from "react";
import PwaInstallModal from "./pwa-install-modal";
import { Download } from "lucide-react";

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      // @ts-ignore
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }

    function onAppInstalled() {
      setIsInstalled(true);
      setVisible(false);
    }

    const checkInstalled = () => {
      const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const iOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(Boolean(standalone || iOSStandalone));
    };

    checkInstalled();
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", onAppInstalled as EventListener);
    window.matchMedia && window.matchMedia('(display-mode: standalone)').addEventListener('change', checkInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", onAppInstalled as EventListener);
      window.matchMedia && window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkInstalled);
    };
  }, []);

  const sendAnalytics = (action: string) => {
    try {
      // @ts-ignore
      if (typeof window.gtag === 'function') { window.gtag('event', 'pwa_' + action, { event_category: 'pwa' }); return; }
      // @ts-ignore
      if (Array.isArray(window.dataLayer)) { window.dataLayer.push({ event: 'pwa_' + action }); return; }
    } catch {}
    console.log('[pwa] analytics', action);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        sendAnalytics(choiceResult?.outcome === 'accepted' ? 'accepted' : 'dismissed');
        setVisible(false);
        setDeferredPrompt(null);
      } catch {
        sendAnalytics('error');
        setVisible(false);
      }
    } else {
      setModalOpen(true);
      sendAnalytics('manual_instructions_shown');
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {/* ── Fixed top-right install pill ─────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 10000,
        }}
      >
        <button
          aria-label="Install app"
          onClick={handleInstallClick}
          title="Install Muzuka Gilbert app"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(10,10,10,0.85)",
            color: "#d4af37",
            border: "1px solid rgba(212,175,55,0.35)",
            padding: "7px 14px",
            borderRadius: 9999,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: "0.02em",
            transition: "all 0.2s",
          }}
        >
          <Download size={14} />
          Install App
        </button>
      </div>
      <PwaInstallModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
