# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Beginners who want to learn about space, with no gaming or technical background assumed. They play on all devices over time, but the current focus is getting the experience working well on a laptop. They are curious rather than expert, so nothing in the game should require prior knowledge to understand.

## Product Purpose
MARS: OUTPOST ZERO is an educational Mars survival game. The player manages a Mars outpost, balances power, water, food and oxygen, responds to emergencies, and sees how their choices have both immediate and delayed consequences. Success means a player comes away knowing more about space and Mars survival, and is able to start playing without help.

## Positioning
A space-education game that teaches through play: simple choices, visible consequences and quick rewards (ranks, mood, badges) in the spirit of a life-simulation game, set on Mars instead of in everyday life.

## Operating Context
Played in a browser, in short sessions, one Sol (Martian day) at a time. A mission runs for 30 Sols. Progress is saved locally in the browser; there is no backend. Players sign in with a local account, and an in-app How to Play guide explains the basics.

## Capabilities and Constraints
- Single-player; React and TypeScript web app, no backend or live AI.
- A Sol is one Martian day. The term is kept deliberately as authentic NASA vocabulary and is explained to beginners.
- All gameplay numbers (starting resources, consumption, thresholds) are illustrative assumptions for an educational game, not real NASA data or engineering specifications.
- Mission rules: failed if oxygen or health reaches 0 or radiation reaches 100; completed on surviving to Sol 30; critical when any resource or health is at 15 or below, or radiation is at 80 or above.
- Progression is deliberately light: XP and rank, a mood readout and badges. Relationships, skill trees and traits were tried and removed because they confused beginners.

## Brand Commitments
Name: MARS: OUTPOST ZERO. Terminology: "Sol" for a Martian day. Tone: approachable and encouraging to beginners, not insider or militaristic.

## Evidence on Hand
No testimonials, user research, usage data or partner endorsements exist. Do not invent any. Educational claims should stay general and must not be presented as real mission data.

## Product Principles
- A complete beginner should understand what to do within the first minute, without reading everything first.
- Teach by showing consequences, not by lecturing.
- Keep every screen simple. Add a system only if a first-time player can understand it without explanation.
- Be honest about what is simulated: the numbers are illustrative, never presented as real NASA data.
- Laptop first, without making other devices an afterthought.

## Accessibility & Inclusion
No specific standard has been set yet. The app already respects the reduced-motion preference. Open decisions: target contrast and keyboard standard, colour-blind safety for the green/amber/red status colours, and a plain-language reading level for beginners.
