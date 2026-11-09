/**
 * glossary.ts
 * -----------
 * Plain-language meanings for the harder words used in the game's text. The
 * Mission Tablet shows these as hover (or keyboard focus) tips so a first-time
 * player never has to leave the game to look a word up.
 *
 * Each entry has a regular expression (so "recycling", "recycler" and "recycled"
 * all work) and a short definition. ORDER MATTERS: longer phrases come before the
 * shorter words inside them ("radiation exposure" before "radiation").
 */

export interface GlossaryEntry {
  /** Stable id. One tip per id is shown in each block of text. */
  id: string;
  /** Regular-expression source, matched whole-word and ignoring case. */
  pattern: string;
  /** What it means, in everyday words. */
  definition: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  // Phrases first.
  {
    id: 'coronal-mass-ejection',
    pattern: 'coronal mass ejections?',
    definition:
      'A huge burst of energy and particles thrown out by the Sun. Mars has little protection, so it raises radiation.',
  },
  {
    id: 'solar-flare',
    pattern: 'solar (?:flare|storm)s?',
    definition:
      'A sudden burst of energy from the Sun. It can disturb electronics and raises radiation for a few days.',
  },
  {
    id: 'radiation-exposure',
    pattern: 'radiation exposure',
    definition:
      'How much harmful radiation your body has absorbed. It builds up and is hard to bring down. At 100 the mission ends.',
  },
  {
    id: 'life-support',
    pattern: 'life[- ]support',
    definition:
      'The machines that keep you alive: they make breathable air, clean water and a safe temperature.',
  },
  {
    id: 'power-generation',
    pattern: 'power[- ]generation',
    definition: 'How much electricity your solar panels make each Sol.',
  },
  {
    id: 'food-production',
    pattern: 'food[- ]production',
    definition: 'How well the greenhouse grows food each Sol.',
  },
  {
    id: 'solar-panels',
    pattern: 'solar (?:array|panel)s?',
    definition: 'Panels that turn sunlight into electricity. Dust on them means less power.',
  },
  {
    id: 'dust-storm',
    pattern: 'dust[- ]storms?',
    definition:
      'A Martian storm of fine dust. It blocks sunlight and coats solar panels, so power drops.',
  },
  {
    id: 'closed-loop',
    pattern: 'closed[- ]loop',
    definition: 'A system that reuses what it makes, such as recycling the same water again and again.',
  },
  {
    id: 'critical-systems',
    pattern: 'critical systems?',
    definition: 'The machines you cannot survive without, like oxygen and water production.',
  },

  // Single words.
  {
    id: 'sol',
    pattern: 'sols?',
    definition:
      'One Martian day: about 24 hours and 39 minutes. This game counts time in Sols, and a mission lasts 30.',
  },
  {
    id: 'radiation',
    pattern: 'radiation',
    definition:
      'Harmful energy from the Sun and space. Too much damages your health, and Mars has little shielding of its own.',
  },
  {
    id: 'shielding',
    pattern: 'shield(?:ing|s)?',
    definition: 'Thick barriers that block radiation before it reaches you.',
  },
  {
    id: 'habitat',
    pattern: 'habitats?',
    definition: 'The sealed, pressurised building where you live and work.',
  },
  {
    id: 'airlock',
    pattern: 'airlocks?',
    definition:
      'A small room with two sealed doors. It lets you go outside without letting the air out of the habitat.',
  },
  {
    id: 'eva',
    pattern: 'EVAs?',
    definition: 'Extra-vehicular activity: going outside in a spacesuit to repair things or collect samples.',
  },
  {
    id: 'hydroponics',
    pattern: 'hydroponics?',
    definition: 'Growing plants in nutrient water instead of soil. It is how you grow fresh food here.',
  },
  {
    id: 'greenhouse',
    pattern: 'greenhouses?',
    definition: 'The warm, lit room where your plants grow. It is your food factory.',
  },
  {
    id: 'regolith',
    pattern: 'regolith',
    definition: 'The loose dust and broken rock that covers the ground on Mars and the Moon.',
  },
  {
    id: 'resupply',
    pattern: 'resupply|resupplies',
    definition: 'A delivery of fresh supplies sent from Earth. In this game it arrives once per mission.',
  },
  {
    id: 'reserves',
    pattern: 'reserves?',
    definition: 'Supplies you have stored and can use later. Bigger reserves are a safety cushion.',
  },
  {
    id: 'efficiency',
    pattern: 'efficiency',
    definition: 'How well a machine is working. 100% is perfect, and lower means it is wearing down.',
  },
  {
    id: 'morale',
    pattern: 'morale',
    definition: 'How good you feel. Low morale makes you use supplies a little faster.',
  },
  {
    id: 'contamination',
    pattern: 'contaminat(?:ion|ed|e|es)',
    definition: 'Something harmful getting into water or air, so it is no longer safe to use.',
  },
  {
    id: 'filtration',
    pattern: 'filtration|filters?',
    definition: 'Cleaning water or air by passing it through a filter.',
  },
  {
    id: 'recycling',
    pattern: 'recycl(?:ing|er|ers|ed|es|e)',
    definition: 'Cleaning used water and air so you can use them again. On Mars nothing is wasted.',
  },
  {
    id: 'insulation',
    pattern: 'insulation',
    definition: 'A layer that keeps heat in. It lets the habitat stay warm outside in the freezing cold.',
  },
  {
    id: 'thermal',
    pattern: 'thermal',
    definition: 'To do with heat and temperature.',
  },
  {
    id: 'rationing',
    pattern: 'ration(?:ing|ed|s)?',
    definition: 'Using less of something on purpose so it lasts longer.',
  },
  {
    id: 'diagnostics',
    pattern: 'diagnostics?',
    definition: 'Checks that find out what is wrong with a machine.',
  },
  {
    id: 'subsystem',
    pattern: 'subsystems?',
    definition: 'One smaller part of a bigger machine or system.',
  },
  {
    id: 'protocol',
    pattern: 'protocols?',
    definition: 'A fixed set of steps to follow so things are done safely.',
  },
  {
    id: 'mitigate',
    pattern: 'mitigat(?:e|es|ed|ing|ion)',
    definition: 'To make something less harmful or less serious.',
  },
  {
    id: 'degrade',
    pattern: 'degrad(?:e|es|ed|ing|ation)',
    definition: 'To slowly get worse or wear out.',
  },
  {
    id: 'anomaly',
    pattern: 'anomal(?:y|ies)',
    definition: 'Something unusual that nobody expected and that needs checking.',
  },
  {
    id: 'bypass',
    pattern: 'bypass(?:es|ed|ing)?',
    definition: 'To go around a broken part instead of fixing it.',
  },
  {
    id: 'purge',
    pattern: 'purg(?:e|es|ed|ing)',
    definition: 'To clear something out completely, such as bad air from a pipe.',
  },
  {
    id: 'telemetry',
    pattern: 'telemetry',
    definition: 'Readings that machines send back automatically, like temperatures and pressures.',
  },
  {
    id: 'uplink',
    pattern: 'uplinks?',
    definition: 'The radio link that sends messages up to Earth.',
  },
  {
    id: 'coolant',
    pattern: 'coolant',
    definition: 'A liquid that carries heat away from hot machines so they do not overheat.',
  },
  {
    id: 'generator',
    pattern: 'generators?',
    definition: 'A machine that makes electricity.',
  },
  {
    id: 'rtg',
    pattern: 'RTGs?',
    definition:
      'Radioisotope thermoelectric generator: a small nuclear battery that makes power from heat, day and night.',
  },
  {
    id: 'sterilise',
    pattern: 'steriliz(?:e|es|ed|ing)|sterilis(?:e|es|ed|ing)',
    definition: 'To kill germs so something is safe to use.',
  },
  {
    id: 'pressure',
    pattern: 'pressure',
    definition: 'How hard the air pushes inside the habitat. If it drops too far you cannot breathe.',
  },
];

// ---------------------------------------------------------------------------
// Splitting text
// ---------------------------------------------------------------------------

/** One piece of a sentence: plain text, or a word with a definition. */
export type GlossaryPiece = { text: string; entry?: GlossaryEntry };

const COMBINED = new RegExp(`\\b(?:${GLOSSARY.map((e) => `(?:${e.pattern})`).join('|')})\\b`, 'gi');
const EACH = GLOSSARY.map((entry) => ({ entry, regex: new RegExp(`^(?:${entry.pattern})$`, 'i') }));

/** Which entry does this exact word or phrase belong to? */
function entryFor(match: string): GlossaryEntry | undefined {
  return EACH.find(({ regex }) => regex.test(match))?.entry;
}

/**
 * Cut `text` into pieces, marking the words that have a definition. Each
 * definition is marked only the FIRST time it appears, so a sentence does not
 * fill up with underlines.
 */
export function splitGlossary(text: string): GlossaryPiece[] {
  const pieces: GlossaryPiece[] = [];
  const seen = new Set<string>();
  let last = 0;

  for (const m of text.matchAll(COMBINED)) {
    const start = m.index ?? 0;
    const entry = entryFor(m[0]);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    if (start > last) pieces.push({ text: text.slice(last, start) });
    pieces.push({ text: m[0], entry });
    last = start + m[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces.length > 0 ? pieces : [{ text }];
}
