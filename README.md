# Interstella

A mobile-first TypeScript space shooter built with Vite.

## Run
- npm install
- npm run dev
- npm run build

## Gameplay
Persistent hangar, five campaign missions, three ships, three weapons, upgrades, credits, mini/final bosses, enemy projectiles, particles, and Web Audio effects.

## Mobile architecture
The game core is TypeScript + Canvas. `src/billing.ts` provides a boundary for a future Google Play Billing / Apple StoreKit implementation. The current build does not process real-money payments.

## Progression
Progress is stored locally in localStorage. Credits are earned through gameplay and spent in the hangar. Ships and upgrades persist between missions.
