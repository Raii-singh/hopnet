/**
 * HOPNet Frontend Build Preprocessor — Shared Engine Mirror Copy
 * ─────────────────────────────────────────────────────────────────────────────
 * Bypasses Next.js Turbopack filesystem root sandboxing.
 * Reads source files from `shared/graph-engine/src` and mirrors them
 * into `frontend/src` on boot/build so Turbopack compiles them natively.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../shared/graph-engine/src');
const DEST_DIR = path.resolve(__dirname, 'src');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) {
    console.error(`[Pre-build Copy] Error: Source shared engine folder not found at ${from}`);
    process.exit(1);
  }

  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }

  const files = fs.readdirSync(from);
  for (const file of files) {
    const fromPath = path.join(from, file);
    const toPath = path.join(to, file);

    const stat = fs.statSync(fromPath);
    if (stat.isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

console.log('[Pre-build Copy] Mirroring shared/graph-engine/src to frontend/src...');
try {
  copyFolderSync(SRC_DIR, DEST_DIR);
  console.log('[Pre-build Copy] Mirror completed successfully! Files synced.');
} catch (error) {
  console.error('[Pre-build Copy] Copy failed:', error);
  process.exit(1);
}
