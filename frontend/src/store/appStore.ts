/**
 * HOPNet — App Mode Store
 * ─────────────────────────────────────────────────────────────────────────────
 * Controls the top-level UX mode for the visitor experience.
 *
 * AppMode is a routing/UX concept, NOT a graph-data concept.
 * The graph itself always comes from the same central Neo4j source.
 * AppMode only controls what UI is shown around the graph.
 *
 * Future graph-projection architecture (user | admin | public views) will live
 * here when Phase 2 is implemented — this store is the correct home for it.
 *
 * Modes:
 *   'choosing'  — First visit: WelcomeGate is shown, graph not yet loaded
 *   'demo'      — Visitor is exploring the public demo network (read-only UI)
 *   'own'       — Visitor clicked "Build Your Own" → InviteOnlyScreen shown
 *
 * Persistence:
 *   Stored in localStorage as a preference, NOT as irreversible account state.
 *   The user can always switch between 'demo' and 'own' via the UI.
 *   Clearing localStorage resets to 'choosing' (WelcomeGate).
 */

import { create } from 'zustand';

export type AppMode = 'choosing' | 'demo' | 'own';

const STORAGE_KEY = 'hopnet_app_mode';

interface AppState {
  appMode: AppMode;
  /** True once localStorage has been read (avoids SSR flash) */
  isAppModeReady: boolean;

  /** Read persisted mode from localStorage. Call once on client mount. */
  initAppMode: () => void;

  /** Set a new mode and persist it. */
  setAppMode: (mode: AppMode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  appMode: 'choosing',
  isAppModeReady: false,

  initAppMode: () => {
    if (typeof window === 'undefined') return;
    // Always start in 'choosing' mode on mount/reload so Welcome Gate popup opens on entrance
    set({ appMode: 'choosing', isAppModeReady: true });
  },

  setAppMode: (mode: AppMode) => {
    set({ appMode: mode });
  },
}));
