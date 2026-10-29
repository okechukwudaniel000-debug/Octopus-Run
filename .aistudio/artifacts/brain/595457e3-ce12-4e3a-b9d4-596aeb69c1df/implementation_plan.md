# Magnet Power-Up Implementation Plan

Implement a high-energy **Magnet Power-Up** for *OctoRun*, enabling Octocat to draw all visible colored score blocks directly into their grasp while running and moving freely, complete with an 8-second countdown HUD banner, magnetic field wave animations, and procedural world integration.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed during the interactive interview:
> - **Attraction Range & Pull Behavior**: Full screen pull that draws in all visible score blocks smoothly accelerating toward Octocat.
> - **Power-Up Duration**: 8 seconds with dedicated HUD countdown timer and animated progress bar (updated per user request).
> - **Visual Appearance & Theme**: Horseshoe magnet icon with glowing magnetic field waves emanating around Octocat.

---

## 1. Overview & Core Concept

- **What It Does**: When Octocat touches a Horseshoe Magnet pickup, the Magnet power-up activates for 8 seconds. Every visible score block on screen feels an irresistible magnetic attraction force toward Octocat, swooping into Octocat's collection radius and awarding points automatically.
- **Player Freedom**: Octocat retains 100% full movement freedom (running, holding edges, jumping 2x, bouncing off bugs, breaking bricks) while the magnet does the harvesting work.
- **Dual Engine Parity**: Synchronized across both the React App Router component (`components/OctoPlatformerGame.tsx`) and the single-file standalone web game (`public/game.html`).

---

## 2. User Experience & Visual Design

### A. The Magnet Pickup Item
- **Pixel Art**: A classic horseshoe magnet rendered via Canvas 2D: curved red metallic U-shape body with silver/white pole caps, subtle white specular highlight, and small pulsing magnetic sparks.
- **Floating Motion**: Gentle sinusoidal floating bob with glowing cyan aura.

### B. Octocat's Magnetized State & Visual Feedback
- **Glowing Magnetic Field Waves**: Pulsing curved arcs/lines in alternating cyan/blue/white rendered around Octocat, expanding outward in waves to visually convey active magnetism.
- **Companion Magnet Icon**: A mini horseshoe magnet floating above Octocat's head or shoulder, bobbing rhythmically.
- **Suction Trajectory**: Attracted score blocks break free from their stationary grid coordinates, curving smoothly in 2D space toward Octocat's center with accelerating velocity and spark trails.

### C. HUD Timer & Progress Bar
- **Magnet Active Banner**: Positioned at top-center (coordinated with the Rainbow power-up if both are active) featuring:
  - Magnet icon `🧲`
  - Label: `MAGNET ACTIVE (FULL SCREEN PULL)`
  - Digital countdown timer: `8.0s` (updating every frame with tabular numbers)
  - Smooth progress bar track with cyan-to-indigo gradient fill.

### D. Audio Feedback (Web Audio API)
- **Magnet Pickup Sound**: Resonant dual-tone rising magnetic charge chime.
- **Attraction Hum**: Gentle subtle synthesizer pulse as items enter Octocat's pull zone.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Screen Pull Scope vs. Screen Clutter**
  - *Chosen Approach*: Collectibles currently rendered within the camera view (`camera.x - 30` to `camera.x + screenWidth + 80`) are attracted toward Octocat with exponential acceleration based on distance.
  - *Why*: Satisfies the user's explicit request for full-screen collection while preventing off-screen unseen collectibles from skewing the camera pipeline.
- **Decision 2: Stacking Power-Ups (Magnet + Rainbow)**
  - *Chosen Approach*: Magnet and Rainbow can be active simultaneously! When both are active, score blocks are pulled in by the magnet and also receive the Rainbow 2x score multiplier, creating an exciting jackpot synergy.
  - *Why*: Intuitive and exhilarating arcade gameplay reward.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   OctoRun Game Loop                    │
└──────────────────────────┬─────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
┌────────────────────────┐   ┌───────────────────────────┐
│ Magnet Timer & State   │   │  Collectible Magnetism    │
│ - magnetTimer: 8.0s    │   │  - Distance vector to Octo│
│ - magnetBarRef / HUD   │──▶│  - vx += dx * acc         │
│ - Magnetic Wave Render │   │  - vy += dy * acc         │
└────────────────────────┘   │  - checkAABB -> Collect   │
                             └───────────────────────────┘
```

### State Model Additions
```typescript
interface GameState {
  player: {
    // Existing fields...
    magnetTimer: number; // 480 frames (8 seconds at 60fps)
  };
  collectibles: Array<{
    // Existing fields...
    type: 'yellow' | 'orange' | 'purple' | 'green' | 'blue' | 'quad' | 'chick' | 'rainbow' | 'magnet';
    vx?: number;
    vy?: number;
  }>;
}
```

### Verification Plan & Status
- **Compilation**: `compile_applet` and `lint_applet` passed with zero errors.
- **Completed Implementation**:
  1. Magnet spawns in initial world (`gx = 14, gy = groundGridY - 3`) and procedurally generated chunks (patterns 1 & 4).
  2. Magnet activation triggers the 8.0s HUD banner with smooth progress bar and digital countdown.
  3. Full-screen magnetic attraction smoothly accelerates all visible colored score blocks into Octocat while Octocat runs and jumps freely.
  4. Glowing cyan/electric blue magnetic field waves and mini floating horseshoe magnet render around Octocat.
  5. Both Next.js app (`components/OctoPlatformerGame.tsx`) and standalone HTML game (`public/game.html`) are 100% synchronized and tested.
