/**
 * educationalTypes.ts
 * --------------------
 * Types for Feature 5 — Educational Explanations.
 *
 * These types describe the educational content that connects player decisions
 * to real-world space science and engineering. All data is READ-ONLY and
 * derived from recorded game state + prewritten scientific content.
 *
 * Nothing here mutates game state or redefines shared types.
 */

// ---------------------------------------------------------------------------
// Educational topics
// ---------------------------------------------------------------------------

/**
 * The ten educational topic categories that lessons can cover.
 * Each maps to a body of prewritten scientific content.
 */
export type EducationalTopicId =
  | 'resource-scarcity'
  | 'redundancy-backup-systems'
  | 'radiation-protection'
  | 'oxygen-life-support'
  | 'temperature-thermal-control'
  | 'energy-power-management'
  | 'risk-management'
  | 'decision-under-uncertainty'
  | 'cascading-failures'
  | 'water-recycling-food-production';

/**
 * A prewritten educational topic containing real-world science content.
 * Each topic has template text that the explanation builder fills in with
 * the player's actual decision data.
 */
export interface EducationalTopic {
  /** Unique topic identifier. */
  id: EducationalTopicId;
  /** Short display title (e.g. "Water Recycling"). */
  title: string;
  /**
   * The scientific / engineering principle explanation. Used for the
   * "Why Did It Happen?" section. Written in simple English.
   */
  sciencePrinciple: string;
  /**
   * The transferable lesson about risk, resources or decision-making.
   * Used for the "What Can You Learn?" section.
   */
  playerLesson: string;
  /**
   * Connection to real-world space missions (NASA, ESA, ISS, etc.).
   * Used for the "Real Space Missions" section.
   */
  realWorldConnection: string;
  /**
   * Trustworthy reference sources (NASA, ESA, etc.).
   * Displayed as clickable links in the UI.
   */
  references: EducationalReference[];
  /**
   * One or two sentence summary of the most important learning point.
   * Used for the "Key Takeaway" section.
   */
  keyTakeaway: string;
  /**
   * A note clarifying how the simplified game mechanic differs from
   * real-world engineering. Displayed as a footnote.
   */
  gameVsRealityNote: string;
}

/** A reference to a trustworthy external source. */
export interface EducationalReference {
  /** Display label (e.g. "NASA — Water Recovery System"). */
  label: string;
  /** URL to the source. */
  url: string;
}

// ---------------------------------------------------------------------------
// Explanation output (rendered in the UI)
// ---------------------------------------------------------------------------

/**
 * A complete educational explanation for a single decision, containing all
 * five sections plus metadata. This is the output of the explanation builder
 * and the input to the EducationalLessonCard component.
 */
export interface EducationalExplanation {
  /** The matched topic. */
  topicId: EducationalTopicId;
  /** Display title for the lesson card header (e.g. "Water Recycling"). */
  topicTitle: string;
  /** Section 1: What Happened? — references the player's actual decision. */
  whatHappened: string;
  /** Section 2: Why Did It Happen? — the scientific/engineering principle. */
  whyItHappened: string;
  /** Section 3: What Can You Learn? — transferable lesson. */
  whatYouCanLearn: string;
  /** Section 4: Real Space Missions — NASA/ESA connection. */
  realWorldConnection: string;
  /** Section 5: Key Takeaway — 1-2 sentence summary. */
  keyTakeaway: string;
  /** References to external sources. */
  references: EducationalReference[];
  /** Footnote distinguishing game mechanics from real science. */
  gameVsRealityNote: string;
}

// ---------------------------------------------------------------------------
// Topic matching
// ---------------------------------------------------------------------------

/**
 * Result of matching a decision to an educational topic. Null means no
 * relevant lesson exists for this decision (and nothing should be displayed).
 */
export type TopicMatch = EducationalTopicId | null;
