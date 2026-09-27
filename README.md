# jojo-assets

2D jungle run-and-gun platformer built with **Phaser 4 + Vite + JavaScript**. Play as John through a jungle level against grunts and turrets, with in-canvas HUD and a press-start → play → game-over → retry flow.

## Stack

- Node 24 + pnpm 12.6.0
- `phaser 4.2.1` (pinned, always v4) + `vite 8`
- Plain JavaScript, no TypeScript
- Arcade Physics only

## Quickstart

```bash
pnpm install
pnpm dev      # local dev server, open the printed URL
pnpm build    # production build to dist/
pnpm preview  # preview the production build
```

## Controls

| Action | Keys |
|---|---|
| Run left/right | `←`/`→` or `A`/`D` |
| Jump | `↑` or `W` / `Space` / `Z` (ground only) |
| Crouch | `↓` or `S` / `X` |
| Shoot | `C` |
| Start / retry | key or click on press-start / game-over screens |

## Project state

Playable jungle MVP is in place (`src/`):

- `BootScene` — press-start screen (titlescreen assets)
- `PreloadScene` — loads only MVP assets with progress bar + error/retry branch
- `PlayScene` — static ground/platforms, 2-layer jungle parallax, camera follow with lerp, Arcade colliders/overlaps
- `player.js` — John: run/jump/crouch, idle/run/jump/crouch anims, grounded jump via `body.blocked.down`
- `enemies.js` — grunt (patrol + simple fire) and static turret, pooled bullets (`maxSize`), hit/knockback, score
- `HUDScene` — parallel scene (`launch`), lives/ammo/score via `registry`, `setScrollFactor(0)`
- `GameOverScene` — game-over screen, retry resets run state in `init()`
- Render: `pixelArt: true`, `roundPixels`, `Scale.FIT + CENTER_BOTH`, 480x270 base with integer zoom, crisp pixels with letterboxing

`pnpm build` passes. Known accepted MVP simplifications live in `TODO.md` (combat debt from T4).

## Assets

Originals are never moved, renamed, or converted in place:

- `SpriteSheets/player/` — John (~53 PNGs: idle, run, jump, crouch, shoot, hang, hit, dead…)
- `SpriteSheets/background/` — jungle/cave backgrounds, clouds, parallax
- `SpriteSheets/enemy/` — grunt + turret
- `SpriteSheets/boss/`, `SpriteSheets/props/`, `SpriteSheets/fx/`, `SpriteSheets/titlescreen/`, `SpriteSheets/ui/`
- Root tiles: `tiles_spritesheet.png`, `tileset.png`, `cave_tileset.png`
- `GIFs/`, `Mockups/` — reference only, never imported by the game
- `public/assets/` — runtime copies actually loaded by Vite; originals stay intact

## What's next

Post-MVP combat fixes (see `TODO.md`):

1. No off-screen damage — aggro/fire only when attacker and target are in camera (± margin) or within range
2. Turret facing — pick frame / `flipX` by sign of `john.x - turret.x` (strip is 8× 18x18 frames, frame 0 faces left today)
3. Bullet lifetime — kill bullets by distance travelled or TTL (~300px / ~1s) instead of level-exit margin only

Then, in roadmap order:

- Full jungle tilemap with Tiled + cave level
- Boss (`SpriteSheets/boss/`)
- Props as destructibles (barrels/crates), FX/particles/shadows
- Audio/music/SFX
- Bundle optimization (Phaser is one big chunk today, ~1.3MB / ~358kB gzip): dynamic `import()` boot screen + vendor chunk split
- Full mobile touch, fullscreen/orientation lock, persistent highscore/save
- CI/CD + deploy

Out of scope for now: TypeScript migration.
