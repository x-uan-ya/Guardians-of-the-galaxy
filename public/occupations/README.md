# Occupation portraits

Drop a portrait image here for each occupation and it will be used automatically
on the occupation picker, the dashboard character panel, and the game-over
screen. If a file is missing, the UI renders a generated fallback portrait
(a tinted disc with the role's emoji), so the app always looks intentional.

Expected files (square images look best; `.webp` keeps them small):

- `engineer.webp`
- `scientist.webp`
- `medical-officer.webp`
- `botanist.webp`

The paths are configured in `src/features/mission/occupations.ts` (the `image`
field). Change those if you prefer different filenames or formats.
