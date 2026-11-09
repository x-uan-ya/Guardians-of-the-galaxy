/**
 * educationalTopics.ts
 * ---------------------
 * Prewritten educational content for all ten topic categories in Feature 5.
 *
 * Every topic contains accurate, simplified explanations of real-world space
 * science and engineering principles, with references to trustworthy sources
 * (NASA, ESA, peer-reviewed institutions).
 *
 * The content is written in simple English that beginners can understand.
 * Each topic clearly distinguishes simplified game mechanics from real-world
 * space engineering.
 *
 * This module is pure data: no I/O, no React, no mutation of any game state.
 */

import type { EducationalTopic, EducationalTopicId } from './educationalTypes';

// ---------------------------------------------------------------------------
// Topic definitions
// ---------------------------------------------------------------------------

const TOPICS: EducationalTopic[] = [
  // =========================================================================
  // 1. Resource Scarcity and Resource Management
  // =========================================================================
  {
    id: 'resource-scarcity',
    title: 'Resource Scarcity',
    sciencePrinciple:
      'On Mars or any off-Earth outpost, every resource is finite and difficult to replace. ' +
      'Unlike on Earth, there is no quick resupply chain. Water, food, oxygen and power must ' +
      'be carefully budgeted because producing or transporting replacements costs enormous ' +
      'amounts of energy and time. When one resource runs low, the temptation is to borrow ' +
      'from another, but this can create a chain of shortages.',
    playerLesson:
      'Resource management is about prioritisation under constraint. You rarely have enough ' +
      'of everything, so the skill is deciding which shortage to tolerate now to prevent a ' +
      'worse shortage later. Rationing preserves supplies but costs morale. Spending freely ' +
      'solves the immediate problem but may leave you exposed tomorrow.',
    realWorldConnection:
      'On the International Space Station, every kilogram of supplies must be launched from ' +
      'Earth at a cost of roughly $20,000 per kilogram. Crew members track consumables ' +
      'daily and mission planners schedule resupply missions months in advance. For a Mars ' +
      'mission, the round-trip resupply time would be measured in years, not weeks, making ' +
      'careful resource budgeting a matter of survival.',
    references: [
      {
        label: 'NASA — Life Support Systems',
        url: 'https://www.nasa.gov/humans-in-space/life-support-systems/',
      },
      {
        label: 'ESA — Closing the Loop: Recycling on the ISS',
        url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Research/Closing_the_loop_Recycling_on_the_ISS',
      },
    ],
    keyTakeaway:
      'In space, every gram of every resource matters. The ability to prioritise which ' +
      'shortage to address first is the most important survival skill an astronaut can develop.',
    gameVsRealityNote:
      'In the game, resources are tracked as simple percentages (0-100). Real space missions ' +
      'track dozens of individual consumables with precise mass and volume accounting.',
  },

  // =========================================================================
  // 2. Redundancy and Backup Systems
  // =========================================================================
  {
    id: 'redundancy-backup-systems',
    title: 'Redundancy and Backup Systems',
    sciencePrinciple:
      'Redundancy means having backup components or alternative methods to perform a ' +
      'critical function. In aerospace engineering, critical systems are often designed with ' +
      'double or triple redundancy so that if one component fails, another can take over. ' +
      'Skipping inspections or deferring repairs removes this safety margin, meaning the ' +
      'next failure could become catastrophic.',
    playerLesson:
      'Investing in maintenance and inspections before problems appear feels expensive, but ' +
      'it builds a safety buffer. When you skip checks to save resources now, you are ' +
      'gambling that nothing will go wrong. In high-stakes environments, that gamble ' +
      'eventually fails.',
    realWorldConnection:
      'NASA spacecraft follow the principle of "fail-operational, fail-safe": critical ' +
      'systems must continue working after the first failure and reach a safe state after a ' +
      'second failure. The ISS has multiple redundant life-support units, backup power ' +
      'channels, and duplicate computers. During the Apollo 13 mission, redundant systems ' +
      'and creative problem-solving saved the crew after an oxygen tank explosion.',
    references: [
      {
        label: 'NASA — Reliability and Redundancy in Spacecraft Design',
        url: 'https://www.nasa.gov/reference/5-0-spacecraft-reliability/',
      },
      {
        label: 'NASA — Apollo 13: Mission Overview',
        url: 'https://www.nasa.gov/mission/apollo-13/',
      },
    ],
    keyTakeaway:
      'Redundancy is not wasted resources — it is survival insurance. The cost of a backup ' +
      'system is almost always less than the cost of the failure it prevents.',
    gameVsRealityNote:
      'The game simplifies equipment to a few system efficiency percentages. Real spacecraft ' +
      'have hundreds of individually redundant components, each with detailed failure-mode analysis.',
  },

  // =========================================================================
  // 3. Radiation Protection and Solar Storms
  // =========================================================================
  {
    id: 'radiation-protection',
    title: 'Radiation Protection',
    sciencePrinciple:
      'In space, astronauts face two main radiation threats: galactic cosmic rays (a ' +
      'constant background) and solar particle events (intense bursts during solar storms). ' +
      'Mars has a very thin atmosphere and no global magnetic field, so surface radiation ' +
      'levels are much higher than on Earth. Shielding reduces exposure but requires mass ' +
      'and power. Choosing whether to shelter or continue working during a radiation event ' +
      'is a trade-off between safety and productivity.',
    playerLesson:
      'Radiation damage accumulates over time and cannot be fully reversed. Accepting small ' +
      'exposures repeatedly can lead to a lethal total dose. The safest response to a solar ' +
      'storm is always to shelter, even though it costs time and resources. The riskier ' +
      'option of continuing operations may look productive in the short term but can cause ' +
      'irreversible harm.',
    realWorldConnection:
      'ISS astronauts shelter in the most shielded modules during solar particle events, ' +
      'sometimes for hours. NASA monitors solar activity continuously using the Space ' +
      'Weather Prediction Center and alerts crews to take protective action. For future Mars ' +
      'missions, NASA is researching advanced shielding materials including polyethylene and ' +
      'water-filled walls that absorb radiation more effectively than metal.',
    references: [
      {
        label: 'NASA — Space Radiation',
        url: 'https://www.nasa.gov/humans-in-space/space-radiation/',
      },
      {
        label: 'NOAA — Space Weather Prediction Center',
        url: 'https://www.swpc.noaa.gov/',
      },
    ],
    keyTakeaway:
      'Radiation is an invisible, cumulative threat. In space, sheltering during a solar ' +
      'storm is not optional — it is the difference between a healthy crew and a medical emergency.',
    gameVsRealityNote:
      'The game tracks radiation as a single 0-100 index. Real radiation dosimetry measures ' +
      'exposure in millisieverts across different tissue types and accounts for the type and ' +
      'energy of radiation particles.',
  },

  // =========================================================================
  // 4. Oxygen Management and Life-Support Systems
  // =========================================================================
  {
    id: 'oxygen-life-support',
    title: 'Oxygen and Life Support',
    sciencePrinciple:
      'Life-support systems maintain a breathable atmosphere by generating oxygen, removing ' +
      'carbon dioxide, and controlling temperature and humidity. These systems depend on a ' +
      'continuous power supply and regular maintenance. If life support degrades, oxygen ' +
      'levels drop and carbon dioxide builds up, both of which are immediately dangerous. ' +
      'Small leaks or efficiency losses compound quickly in a sealed habitat.',
    playerLesson:
      'Oxygen is the most urgent resource because you cannot survive without it for more ' +
      'than minutes. Investing in life-support maintenance prevents the slow decline that ' +
      'suddenly becomes a crisis. A small airlock leak that seems minor today becomes a ' +
      'serious oxygen shortage if ignored for several days.',
    realWorldConnection:
      'The ISS uses the Oxygen Generation System (OGS), which splits water molecules into ' +
      'oxygen and hydrogen through electrolysis. The Sabatier reactor then combines hydrogen ' +
      'with exhaled carbon dioxide to produce water and methane, recycling part of the ' +
      'loop. If this system fails, backup oxygen candles (solid fuel oxygen generators) ' +
      'provide emergency supply. The ISS also had a real oxygen leak in 2020 that crew ' +
      'tracked for months before finding and patching it.',
    references: [
      {
        label: 'NASA — Environmental Control and Life Support System',
        url: 'https://www.nasa.gov/reference/eclss/',
      },
      {
        label: 'ESA — Life Support',
        url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station/Life_support',
      },
    ],
    keyTakeaway:
      'Oxygen is the resource with the smallest margin for error. A well-maintained ' +
      'life-support system is the single most important piece of equipment in any space habitat.',
    gameVsRealityNote:
      'The game models oxygen as a single reserve percentage. Real life-support systems ' +
      'manage partial pressures of O2 and CO2 separately and use multiple subsystems ' +
      '(electrolysis, scrubbing, ventilation) that each require independent monitoring.',
  },

  // =========================================================================
  // 5. Mars Habitat Temperature and Thermal Control
  // =========================================================================
  {
    id: 'temperature-thermal-control',
    title: 'Temperature and Thermal Control',
    sciencePrinciple:
      'Mars surface temperatures range from about -60 C on average to below -120 C at ' +
      'the poles in winter. A habitat must maintain roughly 20 C inside, requiring ' +
      'continuous heating that draws significant power. Insulation reduces heat loss but ' +
      'cannot eliminate it. During extreme temperature drops, the heating system must work ' +
      'harder, competing with other systems for limited power. The lunar surface faces ' +
      'even more extreme swings: over 120 C in sunlight and below -170 C in shadow.',
    playerLesson:
      'Thermal management is an energy problem in disguise. Heating (or cooling) the ' +
      'habitat competes directly with every other power need. Enduring extreme cold to ' +
      'save power is a dangerous gamble because hypothermia degrades crew performance and ' +
      'health rapidly, leading to worse decisions and cascading problems.',
    realWorldConnection:
      'The ISS uses an Active Thermal Control System (ATCS) with ammonia coolant loops to ' +
      'manage heat. On the sunlit side, the station reaches over 120 C; in shadow, it ' +
      'drops below -150 C. The thermal system must balance both extremes simultaneously. ' +
      'For Mars habitats, NASA is studying inflatable modules with multi-layer insulation ' +
      'and buried habitats that use regolith (Martian soil) as natural insulation.',
    references: [
      {
        label: 'NASA — Active Thermal Control System',
        url: 'https://www.nasa.gov/reference/active-thermal-control-system-atcs/',
      },
      {
        label: 'NASA — Mars Facts',
        url: 'https://science.nasa.gov/mars/facts/',
      },
    ],
    keyTakeaway:
      'Keeping a space habitat warm (or cool) is one of the biggest continuous power costs. ' +
      'Thermal control is not a one-time problem — it demands energy every single day.',
    gameVsRealityNote:
      'The game does not model temperature as a separate metric. Real thermal control ' +
      'involves radiators, coolant loops, heaters, and multi-layer insulation working ' +
      'together as an integrated system.',
  },

  // =========================================================================
  // 6. Energy and Power Management
  // =========================================================================
  {
    id: 'energy-power-management',
    title: 'Energy and Power Management',
    sciencePrinciple:
      'Solar panels are the primary power source for most space missions near the Sun, but ' +
      'their output depends on distance from the Sun, dust accumulation, and panel ' +
      'degradation. Batteries store power for nighttime or emergencies, but they have ' +
      'limited capacity and degrade with charge cycles. When power generation drops (from ' +
      'dust storms, equipment failure, or distance from the Sun), every watt must be ' +
      'rationed across competing needs: life support, heating, communications, and science.',
    playerLesson:
      'Power is the "master resource" — almost every other system depends on it. When power ' +
      'generation fails, the effects cascade through the entire outpost. Investing in power ' +
      'system maintenance and having a plan for power shortages is more important than ' +
      'stockpiling any single consumable.',
    realWorldConnection:
      'The ISS runs on eight large solar arrays generating up to 240 kilowatts of power. ' +
      'The Mars rovers Spirit and Opportunity experienced significant power loss from ' +
      'Martian dust covering their solar panels. Opportunity survived partly because ' +
      'Martian winds occasionally cleaned its panels (called "cleaning events"). For ' +
      'deep-space missions beyond Mars, NASA uses Radioisotope Thermoelectric Generators ' +
      '(RTGs) because solar power becomes insufficient.',
    references: [
      {
        label: 'NASA — Solar Arrays on the ISS',
        url: 'https://www.nasa.gov/reference/solar-arrays/',
      },
      {
        label: 'NASA — Radioisotope Power Systems',
        url: 'https://science.nasa.gov/planetary-science/programs/radioisotope-power-systems/',
      },
    ],
    keyTakeaway:
      'Power is the foundation every other system depends on. Losing power generation does ' +
      'not just mean darkness — it means life support, heating, and communications all ' +
      'begin to fail.',
    gameVsRealityNote:
      'The game uses a single "power" percentage and a "power generation" efficiency. Real ' +
      'spacecraft manage voltage buses, battery charge states, solar array pointing angles, ' +
      'and load-shedding schedules independently.',
  },

  // =========================================================================
  // 7. Risk Management
  // =========================================================================
  {
    id: 'risk-management',
    title: 'Risk Management',
    sciencePrinciple:
      'Risk management in aerospace means identifying what could go wrong, estimating how ' +
      'likely it is and how bad the consequences would be, and then deciding what to do ' +
      'about it. Every action in a space mission carries risk. The goal is not to eliminate ' +
      'all risk (which is impossible) but to choose which risks are acceptable and have ' +
      'mitigation plans for the rest.',
    playerLesson:
      'The "safe" option usually has a known, moderate cost. The "risky" option can produce ' +
      'a better outcome but also a much worse one. In survival situations, consistently ' +
      'choosing moderate-cost safe options tends to outperform occasional big wins mixed ' +
      'with occasional catastrophic losses. The key question is: "Can I survive the worst ' +
      'case if this goes wrong?"',
    realWorldConnection:
      'NASA uses Probabilistic Risk Assessment (PRA) to evaluate every mission phase. ' +
      'Before each Space Shuttle launch, engineers calculated the probability of ' +
      'catastrophic failure (historically about 1 in 90 missions). The decision to launch ' +
      'the Challenger in cold weather in 1986 is a classic case study in risk management ' +
      'failure: engineers warned that O-ring seals might fail in cold temperatures, but ' +
      'schedule pressure overrode their concerns.',
    references: [
      {
        label: 'NASA — Risk Management',
        url: 'https://www.nasa.gov/reference/2-0-fundamentals-of-risk-management/',
      },
      {
        label: 'NASA — Challenger Accident',
        url: 'https://www.nasa.gov/history/the-space-shuttle-challenger-accident/',
      },
    ],
    keyTakeaway:
      'Good risk management is not about avoiding all risk — it is about understanding the ' +
      'worst case and making sure you can survive it.',
    gameVsRealityNote:
      'The game presents risk as a choice between options with visible effects. Real risk ' +
      'assessment involves statistical modelling, testing, peer review, and sometimes ' +
      'accepting unknown risks that cannot be fully quantified.',
  },

  // =========================================================================
  // 8. Decision-Making Under Uncertainty
  // =========================================================================
  {
    id: 'decision-under-uncertainty',
    title: 'Decision-Making Under Uncertainty',
    sciencePrinciple:
      'In space, decisions often must be made with incomplete information. Communication ' +
      'delays with Earth (up to 24 minutes one-way for Mars) mean crews cannot always wait ' +
      'for mission control guidance. Unknown signals, equipment anomalies, and unexpected ' +
      'situations require the crew to assess limited data and act. Waiting too long to ' +
      'decide can be as dangerous as deciding too quickly.',
    playerLesson:
      'When you lack full information, the best approach is to gather what data you can ' +
      'within the time available, choose the option with the most tolerable worst-case ' +
      'outcome, and prepare to adapt if new information arrives. Deferring a decision is ' +
      'itself a decision — and sometimes the most costly one.',
    realWorldConnection:
      'During Apollo 13, mission controllers and crew had to make life-or-death decisions ' +
      'with limited information about the spacecraft damage. They could not inspect the ' +
      'damaged service module directly and had to infer the situation from telemetry data. ' +
      'On Mars, the Curiosity and Perseverance rovers operate with significant autonomy ' +
      'because the communication delay makes real-time remote control impossible.',
    references: [
      {
        label: 'NASA — Lessons from Apollo 13',
        url: 'https://www.nasa.gov/mission/apollo-13/',
      },
      {
        label: 'NASA — Mars Communication Delay',
        url: 'https://mars.nasa.gov/mars2020/spacecraft/rover/communications/',
      },
    ],
    keyTakeaway:
      'Perfect information is a luxury you rarely have in space. The best decision is the ' +
      'one you can make with the information available, in the time available, that you can ' +
      'survive being wrong about.',
    gameVsRealityNote:
      'The game shows you the effects of each option before you choose. Real space ' +
      'decisions involve far more uncertainty — crews often do not know the full ' +
      'consequences of any option until after they commit.',
  },

  // =========================================================================
  // 9. Cascading Failures and Delayed Consequences
  // =========================================================================
  {
    id: 'cascading-failures',
    title: 'Cascading Failures',
    sciencePrinciple:
      'A cascading failure occurs when the failure of one component causes additional ' +
      'components to fail in sequence. In tightly coupled systems like a space habitat, ' +
      'almost everything is connected: power feeds life support, life support maintains ' +
      'oxygen, oxygen keeps the crew alive, and the crew maintains the power system. A ' +
      'failure anywhere in this loop can propagate through the entire chain.',
    playerLesson:
      'The most dangerous failures are not the ones that cause immediate damage — they ' +
      'are the ones that seem minor now but trigger bigger problems later. Temporary fixes ' +
      'and deferred maintenance create hidden risks. The key skill is recognising when a ' +
      'small problem today could become a chain reaction tomorrow.',
    realWorldConnection:
      'The 2003 Columbia disaster began with a piece of foam insulation striking the ' +
      'shuttle wing during launch — a seemingly minor event. The resulting thermal ' +
      'protection damage was not detected during the mission and caused catastrophic ' +
      'failure during re-entry. On the ISS, engineers carefully analyse how any single ' +
      'failure might propagate: a cooling loop failure could overheat electronics, which ' +
      'could shut down guidance computers, which could affect station orientation and solar ' +
      'power generation.',
    references: [
      {
        label: 'NASA — Columbia Accident Investigation',
        url: 'https://www.nasa.gov/columbia-accident/',
      },
      {
        label: 'NASA — ISS Failure Analysis',
        url: 'https://www.nasa.gov/reference/5-0-spacecraft-reliability/',
      },
    ],
    keyTakeaway:
      'In complex systems, small failures can become catastrophic if left unaddressed. ' +
      'A temporary fix is not a real fix — it is a countdown to the next problem.',
    gameVsRealityNote:
      'The game models delayed consequences as effects that fire on a specific future day. ' +
      'Real cascading failures are often more complex and less predictable, with failure ' +
      'chains that engineers work to model but can never fully anticipate.',
  },

  // =========================================================================
  // 10. Water Recycling and Food Production
  // =========================================================================
  {
    id: 'water-recycling-food-production',
    title: 'Water Recycling and Food Production',
    sciencePrinciple:
      'Water recycling is essential for long-duration space missions because launching water ' +
      'from Earth is extremely expensive. Filtration and purification systems convert ' +
      'wastewater (including humidity, sweat, and urine) back into drinkable water. Food ' +
      'production through hydroponics or bioregenerative systems can supplement packaged ' +
      'food supplies, but growing food requires water, light, nutrients, and careful ' +
      'contamination control.',
    playerLesson:
      'Water and food production systems are investments: they cost resources to maintain ' +
      'but pay back over time. Pushing filtration systems too hard can cause breakdowns. ' +
      'Contamination in a greenhouse can destroy an entire crop if not contained quickly. ' +
      'The trade-off is always between short-term resource cost and long-term ' +
      'sustainability.',
    realWorldConnection:
      'The ISS Water Recovery System recycles about 90% of all water on board, including ' +
      'processed urine and humidity condensate. Astronaut Peggy Whitson described ISS ' +
      'recycled water as tasting like bottled water. NASA has also tested growing lettuce, ' +
      'radishes, and chili peppers on the ISS through the Veggie and Advanced Plant ' +
      'Habitat experiments, studying how plants grow in microgravity to prepare for Mars ' +
      'food production.',
    references: [
      {
        label: 'NASA — Water Recovery on the ISS',
        url: 'https://www.nasa.gov/missions/station/water-recovery-system/',
      },
      {
        label: 'NASA — Growing Plants in Space',
        url: 'https://www.nasa.gov/missions/station/growing-plants-in-space/',
      },
    ],
    keyTakeaway:
      'On a long-duration space mission, water recycling and food production are not ' +
      'luxuries — they are essential systems that reduce dependence on resupply and must ' +
      'be maintained as carefully as life support.',
    gameVsRealityNote:
      'The game tracks water and food as simple reserve percentages. Real water recycling ' +
      'involves multiple purification stages, and real space agriculture must manage light ' +
      'spectra, nutrient solutions, CO2 levels, and microbial contamination.',
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Map from topic id to topic content for O(1) lookup. */
const TOPIC_MAP = new Map<EducationalTopicId, EducationalTopic>(
  TOPICS.map((t) => [t.id, t]),
);

/** Look up a topic by id. Returns undefined if the id is not recognised. */
export function getEducationalTopic(id: EducationalTopicId): EducationalTopic | undefined {
  return TOPIC_MAP.get(id);
}

/** All educational topics (for diagnostic/test enumeration). */
export function getAllTopics(): readonly EducationalTopic[] {
  return TOPICS;
}
