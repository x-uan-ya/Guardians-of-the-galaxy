/**
 * tutorialSteps.ts
 * ----------------
 * Content data for the five-step introductory tutorial. Keeping text and
 * metadata here (not in the components) makes it easy to edit, translate or
 * A/B-test without touching rendering code.
 *
 * The step components import what they need; the Tutorial wizard uses the
 * ordered STEPS array for the progress bar and navigation.
 */

export interface TutorialStepMeta {
  /** Unique key used as React key and for progress tracking. */
  id: string;
  /** Short title shown in the progress bar. */
  title: string;
  /** Subtitle displayed at the top of the step panel. */
  subtitle: string;
  /** One-line description for screen readers / tooltips. */
  description: string;
}

export const STEPS: readonly TutorialStepMeta[] = [
  {
    id: 'mission',
    title: 'Your Mission',
    subtitle: 'Meet Your Mission',
    description: 'Learn what you are doing on Mars and what success looks like.',
  },
  {
    id: 'resources',
    title: 'Resources',
    subtitle: 'Understand Your Resources',
    description: 'Discover the four life-support resources that keep you alive.',
  },
  {
    id: 'occupation',
    title: 'Occupations',
    subtitle: 'Choose Your Occupation',
    description: 'Preview the eight roles and how their skills change gameplay.',
  },
  {
    id: 'decision',
    title: 'Decisions',
    subtitle: 'Make Your First Decision',
    description: 'Try a practice scenario to see how choices affect your outpost.',
  },
  {
    id: 'consequences',
    title: 'Consequences',
    subtitle: 'Learn From the Consequences',
    description: 'Understand delayed effects, risk vs. reward, and scoring.',
  },
] as const;

/** Total number of tutorial steps. */
export const STEP_COUNT = STEPS.length;

/**
 * Mock decision scenario used in Step 4. Kept here so the step component
 * stays purely presentational.
 */
export interface MockChoice {
  id: string;
  label: string;
  description: string;
  /** Immediate resource effects shown to the player (illustrative). */
  effects: { resource: string; delta: number; icon: string }[];
  /** Short narrative outcome revealed after choosing. */
  outcome: string;
  /** Whether this is the "safer" or "riskier" option (for teaching). */
  risk: 'low' | 'high';
  /** Sol-by-Sol consequence timeline shown in Step 5 (illustrative). */
  timeline: TimelineEvent[];
  /** What the player learned from this choice (shown in Step 5). */
  lesson: string;
}

/**
 * Timeline event for Step 5 — illustrative Sol-by-Sol consequences.
 * Each choice in the mock scenario has its own timeline.
 */
export interface TimelineEvent {
  sol: number;
  label: string;
  description: string;
  type: 'decision' | 'immediate' | 'delayed' | 'cascade';
}

export const MOCK_SCENARIO = {
  title: 'Dust Storm Approaching',
  description:
    'Sensors detect a dust storm heading for the outpost. It will reduce solar panel efficiency and could damage exposed equipment. You must decide how to prepare.',
  choices: [
    {
      id: 'secure',
      label: 'Secure the Outpost',
      description:
        'Retract solar panels and seal external hatches. Safe, but you lose a full day of power generation.',
      effects: [
        { resource: 'Power', delta: -12, icon: '⚡' },
        { resource: 'Oxygen', delta: -3, icon: '🫁' },
      ],
      outcome:
        'The storm passes without damage. You lost some power but the outpost is intact. Systems resume normal operation tomorrow.',
      risk: 'low' as const,
      /** Illustrative Sol-by-Sol timeline for Step 5. */
      timeline: [
        {
          sol: 3,
          label: 'Decision Made',
          description: 'You chose to secure the outpost — solar panels retracted, hatches sealed.',
          type: 'decision' as const,
        },
        {
          sol: 3,
          label: 'Immediate Effect',
          description: 'Power -12%. Oxygen -3%. The outpost is buttoned up but generating nothing.',
          type: 'immediate' as const,
        },
        {
          sol: 4,
          label: 'Delayed Effect',
          description: 'Storm passes harmlessly. Panels redeploy. Power generation resumes at full efficiency.',
          type: 'delayed' as const,
        },
        {
          sol: 6,
          label: 'Recovery',
          description: 'Resources stabilise. No lasting damage — the cautious approach paid off.',
          type: 'cascade' as const,
        },
      ] satisfies TimelineEvent[],
      /** Lesson the player takes away from this choice. */
      lesson:
        'The safe choice preserved your systems at the cost of short-term resources. In a real mission, this buys you time — the most valuable resource of all.',
    },
    {
      id: 'brave',
      label: 'Keep Panels Running',
      description:
        'Leave the solar panels deployed to maintain power, but risk storm damage to equipment.',
      effects: [
        { resource: 'Power', delta: +4, icon: '⚡' },
        { resource: 'Systems', delta: -18, icon: '🔧' },
        { resource: 'Health', delta: -8, icon: '❤️' },
      ],
      outcome:
        'The panels kept generating power through the storm, but flying debris damaged the life-support intake. Repairs will take days and your health took a hit.',
      risk: 'high' as const,
      timeline: [
        {
          sol: 3,
          label: 'Decision Made',
          description: 'You chose to keep the solar panels running through the dust storm.',
          type: 'decision' as const,
        },
        {
          sol: 3,
          label: 'Immediate Effect',
          description: 'Power +4% (panels still generating). But systems -18% and health -8% from flying debris.',
          type: 'immediate' as const,
        },
        {
          sol: 5,
          label: 'Delayed Effect',
          description: 'Damaged life-support intake reduces oxygen recycling. Oxygen begins dropping faster each Sol.',
          type: 'delayed' as const,
        },
        {
          sol: 8,
          label: 'Cascade',
          description: 'Low system efficiency triggers a health warning. Morale drops as repairs drag on.',
          type: 'cascade' as const,
        },
      ] satisfies TimelineEvent[],
      lesson:
        'The risky choice gained short-term power but created a chain reaction — damaged systems, declining health, falling morale. In a real mission, one bad cascade can end the run.',
    },
  ] satisfies MockChoice[],
};
