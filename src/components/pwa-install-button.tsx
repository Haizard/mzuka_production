"use client";

import { useEffect, useState } from "react";
import PwaInstallModal from "./pwa-install-modal";

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

    // Detect display-mode standalone (installed)
    const checkInstalled = () => {
      // @ts-ignore
      const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      // @ts-ignore (iOS)
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
      // Prefer gtag if available
      // @ts-ignore
      if (typeof window.gtag === 'function') {
        // @ts-ignore
        window.gtag('event', 'pwa_' + action, { event_category: 'pwa', event_label: 'install_button' });
        return;
      }
      // fallback to dataLayer
      // @ts-ignore
      if (Array.isArray(window.dataLayer)) {
        // @ts-ignore
        window.dataLayer.push({ event: 'pwa_' + action, category: 'pwa' });
        return;
      }
    } catch (e) {}
    // final fallback
    // eslint-disable-next-line no-console
    console.log('[pwa] analytics', action);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        // @ts-ignore
        deferredPrompt.prompt();
        // @ts-ignore
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          sendAnalytics('accepted');
        } else {
          sendAnalytics('dismissed');
        }
        setVisible(false);
        setDeferredPrompt(null);
      } catch (e) {
        sendAnalytics('error');
        setVisible(false);
      }
    } else {
      // Show our modal with platform instructions
      setModalOpen(true);
      sendAnalytics('manual_instructions_shown');
    }
  };

  if (isInstalled) return null;

  return (
    <>
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
          title="Install app"
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
      <PwaInstallModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
