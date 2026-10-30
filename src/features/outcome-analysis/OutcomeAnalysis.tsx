/**
 * OutcomeAnalysis.tsx
 * --------------------
 * Container component for Feature 3 — Mission Outcome Analysis.
 *
 * Computes the full analysis from GameState (via buildFullOutcomeAnalysis) and
 * renders the three panels: Mission Results, Major Decisions, and Outcome
 * Explanation. All data is read-only and derived from recorded game state.
 *
 * Integrated into Debrief.tsx as a single component insertion.
 */

import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { GameState } from '../simulation/simulationTypes';
import { buildFullOutcomeAnalysis } from './outcomeAnalyzer';
import { MissionResultsPanel } from './MissionResultsPanel';
import { MajorDecisionsPanel } from './MajorDecisionsPanel';
import { OutcomeExplanation } from './OutcomeExplanation';
import './outcome-analysis.css';

interface OutcomeAnalysisProps {
  state: GameState;
}

export function OutcomeAnalysis({ state }: OutcomeAnalysisProps): ReactElement {
  const analysis = useMemo(() => buildFullOutcomeAnalysis(state), [state]);

  return (
    <div className="oa-container space-y-4">
      <MissionResultsPanel results={analysis.results} />
      <MajorDecisionsPanel
        rankedDecisions={analysis.rankedDecisions}
        recordedConsequences={analysis.recordedConsequences}
      />
      <OutcomeExplanation explanation={analysis.explanation} />
    </div>
  );
}
