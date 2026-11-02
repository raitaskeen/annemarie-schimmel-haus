/* eslint-disable @typescript-eslint/no-require-imports -- a CommonJS preload for NODE_OPTIONS=--require */
/**
 * Windows helper for `bun run cf:build` (preloaded with NODE_OPTIONS=--require).
 * OpenNext links traced packages with fs.symlinkSync, which Windows refuses without
 * Developer Mode or admin rights (EPERM). Directories fall back to a junction (allowed
 * for every user) and files to a copy. On Linux/macOS, and whenever symlinks work, this
 * changes nothing.
 */
const fs = require("node:fs");
const path = require("node:path");
const { syncBuiltinESMExports } = require("node:module");

if (process.platform === "win32") {
  const original = fs.symlinkSync;
  fs.symlinkSync = function symlinkSync(target, linkPath, type) {
    try {
      return original.call(this, target, linkPath, type);
    } catch (error) {
      if (error.code !== "EPERM") throw error;
      const absolute = path.resolve(path.dirname(String(linkPath)), String(target));
      if (fs.statSync(absolute).isDirectory()) return original.call(this, absolute, linkPath, "junction");
      fs.copyFileSync(absolute, linkPath);
    }
  };
  // ES module imports of node:fs (used by OpenNext) see the patched function too.
  syncBuiltinESMExports();
}
