# Standalone Mobile & Offline App Export Implementation Plan

Export *OctoRun* as a standalone, zero-data-connection mobile application featuring an installable Progressive Web App (PWA) with complete Service Worker offline pre-caching, single-file downloadable package export, and in-game controls across the top navigation and Game Over overlay.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following specifications were confirmed during the interactive interview:
> - **Packaging & Distribution**: Installable PWA with offline Service Worker pre-caching **plus** an instant single-file downloadable offline HTML package (`OctoRun-Offline.html`).
> - **Display Mode & Orientation**: Fullscreen standalone app display (`display: standalone`) with adaptive rotation support (`orientation: any`) so the game automatically scales whether held in landscape or portrait.
> - **In-Game Action Placement**: In-app **Install App** and **Export Offline Package** controls integrated into both the top navigation header and the Game Over overlay scorecard.

---

## 1. Overview & Core Concept

- **What It Delivers**: Transforms *OctoRun* from a web-only page into a fully independent, offline-capable mobile and desktop application that requires **no data connection** once loaded or installed.
- **Offline Reliability**: When airplane mode is active or no network is available, the Service Worker serves all assets, audio synthesizers, canvas renderers, and game states from the local browser cache.
- **Standalone Experience**: Once added to the mobile home screen, browser address bars, tabs, and navigation chrome are completely stripped away, running full-screen like a native mobile game with tactile touch buttons.
- **Downloadable Offline Bundle**: A single-click "Export Offline Game" button enables users to save a self-contained, zero-dependency HTML file (`OctoRun-Offline.html`) directly to their device filesystem, playable in any browser without a web server.

---

## 2. User Experience & Visual Design

### A. Top Navigation Bar Controls
- **Install App Button**: A clean, compact install button (`Install App` with download icon) positioned in the top HUD on Chromium/Android and desktop devices.
- **Export Package Button**: A quick-action export button (`Export .html`) that generates and downloads the complete standalone offline bundle.
- **iOS Safari Support**: Intelligent detection for iOS devices with a sleek guided modal showing: *"Tap Share ⎋ → Add to Home Screen ⊞"*.
- **Auto-Suppression**: When the app is already running in `standalone` mode (installed PWA), the install button automatically hides to avoid visual clutter.

### B. Game Over Overlay Actions
- **Post-Run Callout Strip**: Below the score grid and "Play again" button, a discreet offline banner displays:
  - *"Play anytime without internet — Install to Home Screen or Download Offline File"*
  - Direct action buttons: `Install PWA` and `Download Game (.html)`.

### C. Offline Status Banner
- **Tactile Connectivity Pill**: When the network disconnects, an unobtrusive, non-blocking indicator appears in the corner:
  - `⚡ Offline Mode — Running from Local Storage`
  - Fades away smoothly when online.

### D. Adaptive Screen Orientation & Touch Ergonomics
- **Full-Bleed Canvas**: Adapts seamlessly to both landscape and portrait device orientations.
- **Touch Dock Padding**: Safe-area insets (`env(safe-area-inset-bottom)`) prevent on-screen navigation home bars on iOS and Android from interfering with the jump and hold buttons.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native Next.js App Router PWA + Zero-Dependency Service Worker vs. External Heavy Libraries**
  - *Chosen Approach*: Use Next.js native `app/manifest.ts` metadata combined with a dedicated vanilla Service Worker (`public/sw.js`) and precaching cache-first strategy.
  - *Why*: Eliminates unmaintained legacy dependencies (like `next-pwa` which breaks on Next.js 15+ App Router) and ensures 100% predictable, lightning-fast offline cache storage without bloating the build.
- **Decision 2: Dual Distribution (PWA + Single-File HTML Download)**
  - *Chosen Approach*: Provide both the native PWA install prompt and a downloadable single-file HTML file (`public/game.html` with inlined assets).
  - *Why*: Gives users complete flexibility: they can install it directly to their home screen with an app icon OR save the standalone `.html` file to USB/files to run anywhere forever without internet.
- **Decision 3: Zero-Data Web Audio Synthesizer Guarantee**
  - *Chosen Approach*: Maintain procedural Web Audio API oscillators and sound synthesis (already implemented in both engines).
  - *Why*: No MP3 or WAV audio files to stream or cache over the network; audio generates 100% locally from math and Web Audio oscillators.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Next.js App Router                   │
├──────────────────────────┬─────────────────────────────┤
│   app/manifest.ts        │   public/sw.js              │
│   - id: '/'              │   - Install: Precache core  │
│   - display: standalone  │   - Fetch: Cache-First      │
│   - orientation: any     │   - Offline fallback        │
│   - 192x192 & 512x512    │   - Stale-While-Revalidate  │
└────────────┬─────────────┴──────────────┬──────────────┘
             │                            │
             ▼                            ▼
┌──────────────────────────┐    ┌─────────────────────────┐
│   usePWAInstall Hook     │    │  Offline Export Engine  │
│   - beforeinstallprompt  │    │  - Fetch public/game.html│
│   - isStandalone check   │    │  - Blob -> File Download│
│   - iOS Safari guidance  │    │  - Zero network needed  │
└────────────┬─────────────┘    └────────────┬────────────┘
             │                               │
             ▼                               ▼
┌─────────────────────────────────────────────────────────┐
│              OctoRun UI (Top Bar & Game Over)           │
│   - [Install App] (Hides in standalone)                 │
│   - [Export Offline Game]                               │
│   - Offline Connectivity Badge (navigator.onLine)       │
└─────────────────────────────────────────────────────────┘
```

### Components to Create / Update:
1. `app/manifest.ts`: Standard PWA Web App Manifest providing complete metadata, standalone display mode, orientation `any`, and responsive theme colors.
2. `public/sw.js`: Service worker implementing precaching of `/`, `/game.html`, scripts, styles, icons, and cache-first network fallback.
3. `public/pwa-192x192.png` & `public/pwa-512x512.png`: High-resolution Octocat pixel art app icons for mobile home screens, task switchers, and splash screens.
4. `components/usePWAInstall.ts`: React hook managing `beforeinstallprompt`, standalone detection, and iOS Safari instructions.
5. `components/OctoPlatformerGame.tsx`: Mount install and export triggers in the top HUD and Game Over overlay.
6. `public/game.html`: Add matching standalone export button and offline service worker registration to the single-file version for complete engine parity.

---

## 5. Verification Plan & Status

- **Status**: Completed and fully verified.
- **PWA Manifest Validated**: `app/manifest.ts` configured with `display: 'standalone'`, `orientation: 'any'`, `id: '/'`, `short_name: 'OctoRun'`, and complete PNG/SVG icons.
- **Offline Service Worker (`public/sw.js`)**: Implemented with cache-first strategy, pre-caching all shell assets, canvas renderers, synthesizers, and offline fallbacks.
- **Standalone Mobile Icons**: Generated `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`, and `pwa-maskable-512x512.png`.
- **In-Game Export & Install**:
  - Top HUD bar: Integrated "Export" (.html download) and "Install" (PWA install prompt, auto-hides when installed).
  - Game Over Overlay: Added standalone offline app strip with "Install App" and "Export .html" buttons.
  - Guided iOS Safari home-screen installation modal.
  - Non-intrusive offline connectivity status pill.
- **Dual-Engine Parity**: Synced across Next.js React engine (`components/OctoPlatformerGame.tsx`) and single-file standalone web game (`public/game.html`).
- **Code Quality**: `lint_applet` passed with zero errors/warnings; `compile_applet` built successfully.
