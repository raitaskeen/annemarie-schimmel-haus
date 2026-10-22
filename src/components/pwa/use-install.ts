"use client";

import { useSyncExternalStore } from "react";

/**
 * Install state shared by every install button and banner.
 *
 * Chromium browsers (Chrome, Edge, Samsung Internet, Opera) fire `beforeinstallprompt`
 * once the manifest and service worker qualify; we keep that event so our own button
 * can open the native dialog. Safari (iOS/macOS) and Firefox have no such event, so we
 * show short instructions instead. `window.__ashInstall` is filled by a tiny inline script
 * in <head> in case the event fires before this bundle has loaded.
 */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global {
  interface Window {
    __ashInstall?: InstallPromptEvent | null;
  }
}

export type Platform = "ios" | "ios-other" | "mac-safari" | "android" | "desktop" | "firefox-desktop";
export type InstallState = { ready: boolean; standalone: boolean; canPrompt: boolean; platform: Platform; installed: boolean };

let deferred: InstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const emit = () => {
  snapshot = null;
  listeners.forEach((l) => l());
};

if (typeof window !== "undefined") {
  deferred = window.__ashInstall ?? null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    justInstalled = true;
    emit();
  });
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "ios-other" : "ios";
  if (/Android/.test(ua)) return "android";
  if (/Firefox\//.test(ua)) return "firefox-desktop";
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome\/|Chromium|Edg\//.test(ua)) return "mac-safari";
  return "desktop";
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

let snapshot: InstallState | null = null;
const SERVER: InstallState = { ready: false, standalone: false, canPrompt: false, platform: "desktop", installed: false };

function getSnapshot(): InstallState {
  snapshot ??= { ready: true, standalone: isStandalone(), canPrompt: !!deferred, platform: detectPlatform(), installed: justInstalled };
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", emit);
  return () => {
    listeners.delete(listener);
    mql.removeEventListener("change", emit);
  };
}

export function useInstall() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER);
  /** Opens the native install dialog. Returns false when the browser needs manual steps. */
  const prompt = async () => {
    if (!deferred) return false;
    const event = deferred;
    deferred = null;
    emit();
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") {
      justInstalled = true;
      emit();
    }
    return true;
  };
  return { ...state, prompt };
}

