"use client";

import React from "react";

export default function PwaInstallModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        zIndex: 10000,
      }}
    >
      <div
        style={{
          background: "#fff",
          color: "#050505",
          borderRadius: 12,
          padding: 20,
          width: "min(720px, 92%)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 8 }}>Install MG Muzuka</h3>
        <p style={{ marginTop: 0, marginBottom: 12 }}>
          Install this app for a faster, app-like experience. Choose your platform
          below for instructions.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>Chrome / Chromium (Desktop)</strong>
            <ol>
              <li>Open the browser menu (⋮) in the top-right.</li>
              <li>Select "Install app" or "Install MG MUZUKA GILBERT".</li>
            </ol>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>Android (Chrome)</strong>
            <ol>
              <li>Tap the browser menu (⋮).</li>
              <li>Choose "Install app" or "Add to Home screen".</li>
            </ol>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>iOS / Safari</strong>
            <ol>
              <li>Tap the Share button in Safari (square with an arrow).</li>
              <li>Choose "Add to Home Screen" and confirm.</li>
            </ol>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #e5e7eb",
              padding: "8px 12px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
