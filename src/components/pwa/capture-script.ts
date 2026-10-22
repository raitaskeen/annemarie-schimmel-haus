/**
 * Inline <head> script: catches the browser's install prompt before React has loaded,
 * so the install button works even when the prompt fires very early. Read by use-install.ts.
 */
export const captureInstallPromptScript =
  "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__ashInstall=e;});";
