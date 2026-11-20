'use client';

import React, { useMemo, useState } from 'react';
import {
  evaluateArenaHypothesisHLRE,
  computeLeaderboardWithExplanations,
  createWorkedExampleArenaState,
  evaluateDeterministicPairwiseMatchup,
  fitBradleyTerryRatings,
  getRubricMaxPoints,
  resetArenaTournamentMatches,
  resolveMatchupWithScores,
  runAllDeterministicMatchups,
  sumCriterionScores,
  type ArenaHypothesis,
  type ArenaPersona,
  type ArenaTournamentState,
} from '@/lib/hypothesis-arena';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  Play,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';

interface HypothesisArenaViewProps {
  arenaState: ArenaTournamentState | null;
  onUpdateArenaState: (next: ArenaTournamentState) => void;
  researchGoal: string;
  onUpdateResearchGoal: (goal: string) => void;
  onRegisterHypothesisAsClaim: (hypothesis: ArenaHypothesis, goal: string) => string;
  onNavigateToClaimRegistry: () => void;
}

const PERSONA_BADGE_STYLES: Record<ArenaPersona, string> = {
  Generator: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  'Skeptic/Adversary': 'bg-rose-50 text-rose-800 border-rose-200',
  Synthesizer: 'bg-teal-50 text-teal-800 border-teal-200',
  'Domain Specialist': 'bg-blue-50 text-blue-800 border-blue-200',
};

const HLRE_GRADE_STYLES: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  B: 'bg-blue-50 text-blue-800 border-blue-300',
  C: 'bg-amber-50 text-amber-800 border-amber-300',
  D: 'bg-rose-50 text-rose-800 border-rose-300',
};

export default function HypothesisArenaView({
  arenaState,
  onUpdateArenaState,
  researchGoal,
  onUpdateResearchGoal,
  onRegisterHypothesisAsClaim,
  onNavigateToClaimRegistry,
}: HypothesisArenaViewProps) {
  const [goalInput, setGoalInput] = useState<string>(
    arenaState?.researchGoal || researchGoal || ''
  );
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string>(
    arenaState?.hypotheses[0]?.id || ''
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunningTournament, setIsRunningTournament] = useState(false);
  const [groundingHypothesisId, setGroundingHypothesisId] = useState<string | null>(
    null
  );
  const [confirmingCitationKey, setConfirmingCitationKey] = useState<string | null>(
    null
  );
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const hypotheses = useMemo(
    () => arenaState?.hypotheses || [],
    [arenaState]
  );
  const matchups = useMemo(
    () => arenaState?.matchups || [],
    [arenaState]
  );

  const leaderboard = useMemo(
    () => computeLeaderboardWithExplanations(hypotheses, matchups),
    [hypotheses, matchups]
  );

  const selectedEntry =
    leaderboard.find((e) => e.hypothesis.id === selectedHypothesisId) ||
    leaderboard[0] ||
    null;

  const pendingMatchups = matchups.filter((m) => m.status === 'pending');
  const completedMatchupsCount = matchups.length - pendingMatchups.length;

  const handleLoadWorkedExample = () => {
    setErrorBanner(null);
    const seeded = createWorkedExampleArenaState(true);
    setGoalInput(seeded.researchGoal);
    onUpdateResearchGoal(seeded.researchGoal);
    onUpdateArenaState(seeded);
    const topLeader = computeLeaderboardWithExplanations(
      seeded.hypotheses,
      seeded.matchups
    )[0];
    setSelectedHypothesisId(topLeader?.hypothesis.id || seeded.hypotheses[0]?.id || '');
    setStatusNotice(
      'Loaded seeded 4-persona worked example and completed all 6 pairwise Bradley-Terry match-ups.'
    );
  };

  const handleGenerateHypotheses = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetGoal = goalInput.trim();
    if (!targetGoal) {
      setErrorBanner(
        'Enter a research goal first, or click "Load Worked Example & Run Tournament".'
      );
      return;
    }
    setErrorBanner(null);
    setStatusNotice(null);
    setIsGenerating(true);

    try {
      onUpdateResearchGoal(targetGoal);
      const res = await fetch('/api/coscientist/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          researchGoal: targetGoal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(
          data.error ||
            'Failed to generate live Arena hypotheses from Gemini API.'
        );
        return;
      }

      const nextState: ArenaTournamentState = {
        researchGoal: data.researchGoal || targetGoal,
        hypotheses: data.hypotheses,
        matchups: data.matchups,
        isWorkedExample: false,
        lastUpdatedAt: new Date().toISOString(),
      };
      onUpdateArenaState(nextState);
      setSelectedHypothesisId(nextState.hypotheses[0]?.id || '');
      setStatusNotice(
        `Generated ${nextState.hypotheses.length} competing persona hypotheses (${data.modelUsed}). Click "Run Full Tournament" to score all ${nextState.matchups.length} match-ups.`
      );
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Network error while generating Arena hypotheses.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const runSingleMatchup = async (
    currentState: ArenaTournamentState,
    matchId: string
  ): Promise<ArenaTournamentState> => {
    const targetMatch = currentState.matchups.find((m) => m.id === matchId);
    if (!targetMatch || targetMatch.status === 'completed') return currentState;

    const hypA = currentState.hypotheses.find(
      (h) => h.id === targetMatch.hypothesisAId
    );
    const hypB = currentState.hypotheses.find(
      (h) => h.id === targetMatch.hypothesisBId
    );
    if (!hypA || !hypB) return currentState;

    // For custom AI-generated arenas, attempt Gemini pairwise judging first;
    // fall back to deterministic UM-1 rubric judge if Gemini judging is unavailable.
    if (!currentState.isWorkedExample) {
      try {
        const res = await fetch('/api/coscientist/arena', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'judge',
            researchGoal: currentState.researchGoal,
            hypothesisA: hypA,
            hypothesisB: hypB,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const { updatedHypotheses, completedMatchup } = resolveMatchupWithScores(
            currentState.hypotheses,
            targetMatch,
            data.scoresA,
            data.scoresB,
            data.judgeSummary,
            'gemini',
            currentState.matchups
          );
          return {
            ...currentState,
            hypotheses: updatedHypotheses,
            matchups: currentState.matchups.map((m) =>
              m.id === completedMatchup.id ? completedMatchup : m
            ),
            lastUpdatedAt: new Date().toISOString(),
          };
        }
      } catch {
        // Fall through to deterministic rubric evaluation below
      }
    }

    const { updatedHypotheses, completedMatchup } =
      evaluateDeterministicPairwiseMatchup(
        currentState.hypotheses,
        targetMatch,
        currentState.matchups
      );

    return {
      ...currentState,
      hypotheses: updatedHypotheses,
      matchups: currentState.matchups.map((m) =>
        m.id === completedMatchup.id ? completedMatchup : m
      ),
      lastUpdatedAt: new Date().toISOString(),
    };
  };

  const handleRunNextMatch = async () => {
    if (!arenaState || pendingMatchups.length === 0 || isRunningTournament) return;
    setErrorBanner(null);
    setIsRunningTournament(true);
    try {
      const next = await runSingleMatchup(arenaState, pendingMatchups[0].id);
      onUpdateArenaState(next);
      setStatusNotice(
        `Completed ${pendingMatchups[0].id} and updated Bradley-Terry MLE + 95% CIs. ${
          pendingMatchups.length - 1
        } match-up(s) remaining.`
      );
    } finally {
      setIsRunningTournament(false);
    }
  };

  const handleRunFullTournament = async () => {
    if (!arenaState || isRunningTournament) return;
    setErrorBanner(null);
    setIsRunningTournament(true);
    try {
      let working =
        pendingMatchups.length === 0
          ? resetArenaTournamentMatches(arenaState)
          : arenaState;

      if (working.isWorkedExample) {
        working = runAllDeterministicMatchups(working);
        onUpdateArenaState(working);
      } else {
        const remaining = working.matchups.filter((m) => m.status === 'pending');
        for (const m of remaining) {
          working = await runSingleMatchup(working, m.id);
          onUpdateArenaState(working);
        }
        working = {
          ...working,
          hypotheses: fitBradleyTerryRatings(working.hypotheses, working.matchups),
          lastUpdatedAt: new Date().toISOString(),
        };
        onUpdateArenaState(working);
      }
      setStatusNotice(
        `Tournament complete across all ${working.matchups.length} pairwise match-ups (Bradley-Terry MLE converged).`
      );
    } finally {
      setIsRunningTournament(false);
    }
  };

  const handleResetMatches = () => {
    if (!arenaState) return;
    setErrorBanner(null);
    const reset = resetArenaTournamentMatches(arenaState);
    onUpdateArenaState(reset);
    setStatusNotice(
      'Reset all Bradley-Terry ratings to 1500 and cleared match results. Ready for step-by-step or full tournament replay.'
    );
  };

  const handleTogglePremiseVerified = (hypothesisId: string, premiseId: string) => {
    if (!arenaState) return;
    const updatedHyps = arenaState.hypotheses.map((h) => {
      if (h.id !== hypothesisId) return h;
      return {
        ...h,
        premises: h.premises.map((p) =>
          p.id === premiseId ? { ...p, verified: !p.verified } : p
        ),
      };
    });
    onUpdateArenaState({
      ...arenaState,
      hypotheses: updatedHyps,
      lastUpdatedAt: new Date().toISOString(),
    });
  };

  const handleGroundHypothesisWithSearch = async (hypothesis: ArenaHypothesis) => {
    if (!arenaState || groundingHypothesisId) return;
    setErrorBanner(null);
    setGroundingHypothesisId(hypothesis.id);
    try {
      const res = await fetch('/api/coscientist/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `${hypothesis.title} ${hypothesis.domain}`,
          targetSource: hypothesis.statement.slice(0, 140),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Literature grounding search failed.');
        return;
      }

      const incomingSources = Array.isArray(data.sources)
        ? (data.sources as Array<{ title: string; uri: string }>)
        : [];

      const updatedHyps = arenaState.hypotheses.map((h) => {
        if (h.id !== hypothesis.id) return h;
        const existingUris = new Set(h.citations.map((c) => c.uri));
        const merged = [...h.citations];
        for (const src of incomingSources) {
          if (src.uri && !existingUris.has(src.uri)) {
            existingUris.add(src.uri);
            merged.push({
              title: src.title || src.uri,
              uri: src.uri,
              snippet: `Suggested via P1 Literature Search (${data.modelUsed || 'Search'}) — run Confirm Source (HTTP 200) to verify`,
              verified: false,
              confirmationStatus: 'UNVERIFIED',
            });
          }
        }
        return {
          ...h,
          citations: merged,
        };
      });

      onUpdateArenaState({
        ...arenaState,
        hypotheses: updatedHyps,
        lastUpdatedAt: new Date().toISOString(),
      });
      setStatusNotice(
        `Attached ${incomingSources.length} unconfirmed literature source(s) (verified: false) to ${hypothesis.persona}. Use "Confirm Source (HTTP 200)" to verify UM-2.4b passage support.`
      );
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Failed to connect to P1 Literature Search grounding endpoint.'
      );
    } finally {
      setGroundingHypothesisId(null);
    }
  };

  const handleConfirmCitation = async (
    hypothesis: ArenaHypothesis,
    citationUri: string,
    citedPassage?: string
  ) => {
    if (!arenaState || confirmingCitationKey) return;
    const key = `${hypothesis.id}::${citationUri}`;
    setErrorBanner(null);
    setConfirmingCitationKey(key);
    try {
      const res = await fetch('/api/coscientist/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_source',
          uri: citationUri,
          citedPassage: citedPassage || hypothesis.statement,
          claimText: hypothesis.statement,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'UM-2.4b source confirmation failed.');
        return;
      }

      const updatedHyps = arenaState.hypotheses.map((h) => {
        if (h.id !== hypothesis.id) return h;
        return {
          ...h,
          citations: h.citations.map((c) => {
            if (c.uri !== citationUri) return c;
            if (data.verified === true && data.um24bQuote) {
              return {
                ...c,
                verified: true,
                confirmationStatus: 'VERIFIED' as const,
                confirmationReason: data.reason,
                um24bQuote: data.um24bQuote,
              };
            }
            return {
              ...c,
              verified: false,
              confirmationStatus: 'FAILED' as const,
              confirmationReason: data.reason || 'HTTP 200 passage check did not match.',
              um24bQuote: null,
            };
          }),
        };
      });

      onUpdateArenaState({
        ...arenaState,
        hypotheses: updatedHyps,
        lastUpdatedAt: new Date().toISOString(),
      });
      setStatusNotice(
        data.verified
          ? `UM-2.4b source verified (HTTP 200) for ${hypothesis.persona}: ${citationUri}`
          : `Source remained verified: false — ${data.reason || 'verification failed'}`
      );
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Network error during UM-2.4b source confirmation.'
      );
    } finally {
      setConfirmingCitationKey(null);
    }
  };

  const handleRegisterClaimClick = (hypothesis: ArenaHypothesis) => {
    if (!arenaState) return;
    const newClaimId = onRegisterHypothesisAsClaim(
      hypothesis,
      arenaState.researchGoal
    );
    const updatedHyps = arenaState.hypotheses.map((h) =>
      h.id === hypothesis.id ? { ...h, registeredClaimId: newClaimId } : h
    );
    onUpdateArenaState({
      ...arenaState,
      hypotheses: updatedHyps,
      lastUpdatedAt: new Date().toISOString(),
    });
    setStatusNotice(
      `Registered ${hypothesis.persona} hypothesis as UM-1 Claim ${newClaimId} (with Premise Ledger & worst-of HLRE cap preserved).`
    );
  };

  const hypTitleMap = useMemo(
    () => new Map(hypotheses.map((h) => [h.id, h])),
    [hypotheses]
  );

  return (
    <div className="space-y-6">
      {/* Header & Research Goal Control Bar */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-blue-700">
              <Swords className="w-4 h-4" />
              <span>UM-1 Co-Scientist · Bradley-Terry Tournament</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Hypothesis Arena
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Four distinct research personas compete on novelty, plausibility,
              testability, and evidence support. Every hypothesis receives an
              auditable HLRE grade (A–D) under UM-1 worst-of rules, a premise
              verification ledger, and P1 literature citations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLoadWorkedExample}
              data-testid="arena-load-worked-example"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Load Worked Example &amp; Run Tournament</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleGenerateHypotheses} className="mt-5 space-y-3">
          <label
            htmlFor="arena-research-goal"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Research Goal
          </label>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              id="arena-research-goal"
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Enter a frontier research question (or click Load Worked Example above)..."
              data-testid="arena-goal-input"
              className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={isGenerating}
              data-testid="arena-generate-hypotheses"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {isGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FlaskConical className="w-3.5 h-3.5" />
              )}
              <span>
                {isGenerating
                  ? 'Generating 4 Personas...'
                  : 'Generate 4 Persona Hypotheses'}
              </span>
            </button>
          </div>
        </form>

        {errorBanner && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-700 underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {statusNotice && (
          <div className="mt-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusNotice}</span>
            </div>
            {hypotheses.some((h) => h.registeredClaimId) && (
              <button
                type="button"
                onClick={onNavigateToClaimRegistry}
                className="text-emerald-800 font-semibold underline whitespace-nowrap"
              >
                View in Claim Registry
              </button>
            )}
          </div>
        )}
      </section>

      {/* Empty State Prompt if no tournament loaded yet */}
      {hypotheses.length === 0 ? (
        <section className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center">
          <Trophy className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900 mt-3">
            No Hypothesis Tournament Active
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-xl mx-auto">
            Click <strong>Load Worked Example &amp; Run Tournament</strong> to
            demonstrate the full 4-persona Elo tournament, HLRE worst-of grading,
            premise verification ledger, and P1 literature grounding with zero
            setup — or enter your own research goal above.
          </p>
          <button
            type="button"
            onClick={handleLoadWorkedExample}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Seeded Worked Example</span>
          </button>
        </section>
      ) : (
        <>
          {/* Tournament Controls Strip */}
          <section className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {completedMatchupsCount} / {matchups.length} Match-Ups Completed
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Mode:{' '}
                <strong className="text-slate-800">
                  {arenaState?.isWorkedExample
                    ? 'Seeded Worked Example (Deterministic UM-1 Rubric)'
                    : 'Live Gemini Multi-Agent Arena'}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRunNextMatch}
                disabled={pendingMatchups.length === 0 || isRunningTournament}
                data-testid="arena-run-next-match"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-md transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Next Match</span>
              </button>

              <button
                type="button"
                onClick={handleRunFullTournament}
                disabled={isRunningTournament}
                data-testid="arena-run-full-tournament"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>
                  {pendingMatchups.length === 0
                    ? 'Re-Run Full Tournament'
                    : 'Run Full Tournament'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleResetMatches}
                disabled={isRunningTournament}
                data-testid="arena-reset-matches"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Elo &amp; Matches</span>
              </button>
            </div>
          </section>

          {/* Live Elo Leaderboard */}
          <section
            data-testid="arena-leaderboard"
            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Live Tournament Leaderboard &amp; UM-1 Audit
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Worst-Of HLRE Grading (A–D) · Bradley-Terry MLE ± 95% CI
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {leaderboard.map((entry) => {
                const { rank, hypothesis: h, hlre, rankingExplanation } = entry;
                const isSelected = selectedEntry?.hypothesis.id === h.id;

                return (
                  <div
                    key={h.id}
                    data-testid={`arena-leaderboard-row-${h.id}`}
                    className={`p-5 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                      {/* Left: Rank, Persona, Title & Badges */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-900 text-white font-mono text-xs font-bold tabular-nums">
                            #{rank}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[11px] font-semibold border rounded ${
                              PERSONA_BADGE_STYLES[h.persona]
                            }`}
                          >
                            {h.persona}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[11px] font-mono font-bold border rounded ${
                              HLRE_GRADE_STYLES[hlre.hlreGradeLetter]
                            }`}
                          >
                            HLRE Grade {hlre.hlreGradeLetter} · {hlre.independence}
                          </span>

                          {hlre.isGrounded ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                              <BookOpen className="w-3 h-3" />
                              {hlre.hasConfirmedCitation
                                ? `UM-2.4b VERIFIED (${h.citations.filter((c) => c.verified).length}/${h.citations.length})`
                                : `GROUNDED (${h.citations.length} unconfirmed)`}
                            </span>
                          ) : (
                            <span
                              data-testid={`arena-ungrounded-badge-${h.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-300 rounded"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              UNGROUNDED · UNGROUNDED ASSERTION (Not a Finding)
                            </span>
                          )}

                          {hlre.hasUnverifiedPremises ? (
                            <span
                              data-testid={`arena-not-verified-badge-${h.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 rounded"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {hlre.unverifiedPremiseCount > 0
                                ? `${hlre.unverifiedPremiseCount} PREMISE NOT VERIFIED`
                                : 'PREMISES NOT VERIFIED'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              {hlre.verifiedPremiseCount}/{h.premises.length} PREMISES VERIFIED
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900">
                          {h.title}
                        </h3>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {rankingExplanation}
                        </p>
                      </div>

                      {/* Right: Bradley-Terry Elo + 95% CI, W-L-D & Actions */}
                      <div className="flex flex-row xl:flex-col items-center xl:items-end justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-[11px] font-mono uppercase text-slate-400">
                              BT Elo Rating
                            </div>
                            <div className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                              {h.elo}
                            </div>
                            {typeof h.eloCiLow === 'number' && typeof h.eloCiHigh === 'number' && (
                              <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                                95% CI [{h.eloCiLow}–{h.eloCiHigh}]
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-mono uppercase text-slate-400">
                              Record
                            </div>
                            <div className="text-sm font-mono font-semibold text-slate-700 tabular-nums">
                              {h.wins}W–{h.losses}L–{h.draws}D
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedHypothesisId(h.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? 'Inspecting Below' : 'Inspect Ledger & Sources'}
                          </button>

                          {h.registeredClaimId ? (
                            <button
                              type="button"
                              onClick={onNavigateToClaimRegistry}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Registered {h.registeredClaimId}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRegisterClaimClick(h)}
                              data-testid={`arena-register-claim-${h.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors whitespace-nowrap"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Register as UM-1 Claim</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Two-Column Inspector + Pairwise Match-Up Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Selected Contender Premise Ledger, Grounding & HLRE Breakdown */}
            {selectedEntry && (
              <section
                data-testid="arena-inspector"
                className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold border rounded ${
                          PERSONA_BADGE_STYLES[selectedEntry.hypothesis.persona]
                        }`}
                      >
                        {selectedEntry.hypothesis.persona}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {selectedEntry.hypothesis.domain} · Rung{' '}
                        {selectedEntry.hypothesis.verificationRung}
                        {selectedEntry.hlre.breakdown.rung4Kind
                          ? ` (${selectedEntry.hlre.breakdown.rung4Kind})`
                          : ''}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-1.5">
                      {selectedEntry.hypothesis.title}
                    </h2>
                  </div>

                  <div
                    className={`px-3 py-1.5 rounded-md border text-center ${
                      HLRE_GRADE_STYLES[selectedEntry.hlre.hlreGradeLetter]
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase">
                      HLRE Grade
                    </div>
                    <div className="text-base font-mono font-bold">
                      {selectedEntry.hlre.hlreGradeLetter} (
                      {selectedEntry.hlre.independence})
                    </div>
                  </div>
                </div>

                {/* Statement, Mechanism, Falsifiable Test & UM-4.1a Defeater */}
                <div className="space-y-3 text-xs text-slate-700">
                  <div>
                    <div className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
                      Hypothesis Statement
                    </div>
                    <p className="mt-1 leading-relaxed">
                      {selectedEntry.hypothesis.statement}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                      <div className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider">
                        Proposed Mechanism
                      </div>
                      <p className="mt-1 leading-relaxed">
                        {selectedEntry.hypothesis.mechanism}
                      </p>
                    </div>
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                      <div className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider">
                        Falsifiable Test &amp; Invariant-First Check
                      </div>
                      <p className="mt-1 leading-relaxed">
                        {selectedEntry.hypothesis.falsifiableTest}
                      </p>
                      <p className="mt-1.5 font-mono text-[11px] text-slate-600">
                        Invariant-First: {selectedEntry.hypothesis.invariantFirstCheck}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-amber-50/50 border border-amber-200">
                    <div className="font-semibold text-amber-950 text-[11px] uppercase tracking-wider">
                      UM-4.1a Explicit Defeater Condition
                    </div>
                    <p className="mt-1 leading-relaxed text-amber-950">
                      {selectedEntry.hypothesis.um41aDefeater ||
                        'No UM-4.1a defeater stated (penalized on defeater criterion).'}
                    </p>
                  </div>
                </div>

                {/* Premise Ledger */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-slate-600" />
                      <span>Premise Ledger (Each Assumption Audited)</span>
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      Any NOT VERIFIED premise caps HLRE at D
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedEntry.hypothesis.premises.map((p) => (
                      <div
                        key={p.id}
                        className={`p-3 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          p.verified
                            ? 'bg-white border-slate-200'
                            : 'bg-amber-50/70 border-amber-300'
                        }`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                                p.verified
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-100 text-amber-950 border-amber-400'
                              }`}
                            >
                              {p.verified ? 'VERIFIED' : 'NOT VERIFIED'}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {p.kind}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800">{p.statement}</p>
                          <p className="text-[11px] font-mono text-slate-500">
                            Source: {p.sourceCitation}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleTogglePremiseVerified(
                              selectedEntry.hypothesis.id,
                              p.id
                            )
                          }
                          className="px-2.5 py-1 text-[11px] font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded whitespace-nowrap shrink-0"
                        >
                          {p.verified ? 'Flag NOT VERIFIED' : 'Mark VERIFIED'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Literature Citations (P1 Grounding) */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                      <span>P1 Literature Grounding &amp; Citations</span>
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        handleGroundHypothesisWithSearch(selectedEntry.hypothesis)
                      }
                      disabled={
                        groundingHypothesisId === selectedEntry.hypothesis.id
                      }
                      data-testid="arena-ground-search"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors whitespace-nowrap"
                    >
                      {groundingHypothesisId === selectedEntry.hypothesis.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Search className="w-3 h-3" />
                      )}
                      <span>
                        {selectedEntry.hypothesis.citations.length === 0
                          ? 'Ground with Literature Search (P1)'
                          : 'Find Additional Sources (P1)'}
                      </span>
                    </button>
                  </div>

                  {selectedEntry.hypothesis.citations.length === 0 ? (
                    <div className="p-3.5 rounded-md bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-1">
                      <div className="font-mono font-bold flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-700" />
                        <span>
                          UNGROUNDED ASSERTION (Not a Finding)
                        </span>
                      </div>
                      <p>
                        This hypothesis currently cites zero external sources.
                        Under UM-1 P1, ungrounded assertions cannot advance
                        above HLRE Grade D until grounded with verifiable
                        literature links.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedEntry.hypothesis.citations.map((c, idx) => {
                        const confirmKey = `${selectedEntry.hypothesis.id}::${c.uri}`;
                        const isConfirming = confirmingCitationKey === confirmKey;
                        return (
                          <div
                            key={`${c.uri}-${idx}`}
                            className={`p-3 rounded-md border space-y-1.5 ${
                              c.verified
                                ? 'border-emerald-300 bg-emerald-50/40'
                                : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  {c.verified ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 rounded">
                                      VERIFIED (UM-2.4b · HTTP 200)
                                    </span>
                                  ) : c.confirmationStatus === 'FAILED' ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-300 rounded">
                                      FAILED · verified: false
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded">
                                      UNCONFIRMED · verified: false
                                    </span>
                                  )}
                                </div>
                                <a
                                  href={c.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 break-all"
                                >
                                  <span>{c.title}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              </div>

                              {!c.verified && (
                                <button
                                  type="button"
                                  disabled={Boolean(confirmingCitationKey)}
                                  onClick={() =>
                                    handleConfirmCitation(
                                      selectedEntry.hypothesis,
                                      c.uri,
                                      c.snippet
                                    )
                                  }
                                  className="px-2.5 py-1 text-[11px] font-mono font-semibold text-blue-800 bg-white hover:bg-blue-50 border border-blue-300 rounded whitespace-nowrap shrink-0"
                                >
                                  {isConfirming ? 'Checking HTTP 200...' : 'Confirm Source (HTTP 200)'}
                                </button>
                              )}
                            </div>

                            {c.snippet && (
                              <p className="text-[11px] text-slate-600">{c.snippet}</p>
                            )}

                            {c.um24bQuote && (
                              <div className="p-2 bg-white border border-emerald-200 rounded text-[11px] font-mono text-emerald-950 space-y-0.5">
                                <div>
                                  <strong>UM-2.4b Quote:</strong> &ldquo;{c.um24bQuote.verbatimPassage}&rdquo;
                                </div>
                                <div className="text-[10px] text-emerald-700">
                                  Retrieved: {c.um24bQuote.retrievedAt} · HTTP {c.um24bQuote.httpStatus}
                                </div>
                              </div>
                            )}

                            {!c.verified && c.confirmationReason && (
                              <p className="text-[11px] font-mono text-rose-700">
                                {c.confirmationReason}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Worst-Of HLRE Breakdown */}
                <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Award className="w-3.5 h-3.5 text-slate-700" />
                    <span>UM-1 Worst-Of HLRE Grade Breakdown</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                    <div className="p-2 bg-white border border-slate-200 rounded">
                      <div className="text-slate-400">Tier Cap</div>
                      <div className="font-bold text-slate-900">
                        {selectedEntry.hlre.breakdown.tierCap}
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded">
                      <div className="text-slate-400">Independence</div>
                      <div className="font-bold text-slate-900">
                        {selectedEntry.hlre.breakdown.independenceBound}
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded">
                      <div className="text-slate-400">Postulation</div>
                      <div className="font-bold text-slate-900">
                        {selectedEntry.hlre.breakdown.postulationCeiling}
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded">
                      <div className="text-slate-400">Tool Gate</div>
                      <div className="font-bold text-slate-900">
                        {selectedEntry.hlre.breakdown.parameterCap}
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded">
                      <div className="text-slate-400">Rung Cap</div>
                      <div className="font-bold text-slate-900">
                        {selectedEntry.hlre.breakdown.rungCap}
                      </div>
                    </div>
                  </div>
                  <ul className="list-disc pl-4 text-[11px] text-slate-600 space-y-0.5">
                    {selectedEntry.hlre.capReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Pairwise Match-Up Results */}
            <section
              data-testid="arena-matchups"
              className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Pairwise Match-Ups ({completedMatchupsCount}/{matchups.length})
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  5-Axis Rubric (50 pts · w/ Defeater)
                </span>
              </div>

              <div className="space-y-3 max-h-[820px] overflow-y-auto pr-1">
                {matchups.map((m) => {
                  const hypA = hypTitleMap.get(m.hypothesisAId);
                  const hypB = hypTitleMap.get(m.hypothesisBId);
                  if (!hypA || !hypB) return null;

                  const aWon = m.winnerId === hypA.id;
                  const bWon = m.winnerId === hypB.id;
                  const isDraw = m.winnerId === 'draw';

                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-md border border-slate-200 bg-slate-50/60 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-semibold text-slate-700">
                          {m.id} · Round {m.round}
                        </span>
                        {m.status === 'completed' ? (
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-semibold">
                            {isDraw
                              ? 'Draw'
                              : `Winner: ${aWon ? hypA.persona : hypB.persona}`}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div
                          className={`p-2 rounded border ${
                            aWon
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 truncate">
                            {hypA.persona}
                          </div>
                          {m.status === 'completed' && m.scoresA ? (
                            <div className="font-mono text-[11px] text-slate-700 tabular-nums mt-0.5">
                              {sumCriterionScores(m.scoresA)}/{getRubricMaxPoints(m.scoresA)} · BT{' '}
                              {m.eloAfterA} (
                              {(m.eloDeltaA || 0) >= 0
                                ? `+${m.eloDeltaA}`
                                : m.eloDeltaA}
                              )
                            </div>
                          ) : (
                            <div className="font-mono text-[11px] text-slate-400">
                              Awaiting match
                            </div>
                          )}
                        </div>

                        <div
                          className={`p-2 rounded border ${
                            bWon
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 truncate">
                            {hypB.persona}
                          </div>
                          {m.status === 'completed' && m.scoresB ? (
                            <div className="font-mono text-[11px] text-slate-700 tabular-nums mt-0.5">
                              {sumCriterionScores(m.scoresB)}/{getRubricMaxPoints(m.scoresB)} · BT{' '}
                              {m.eloAfterB} (
                              {(m.eloDeltaB || 0) >= 0
                                ? `+${m.eloDeltaB}`
                                : m.eloDeltaB}
                              )
                            </div>
                          ) : (
                            <div className="font-mono text-[11px] text-slate-400">
                              Awaiting match
                            </div>
                          )}
                        </div>
                      </div>

                      {m.status === 'completed' && m.scoresA && m.scoresB && (
                        <div className="grid grid-cols-5 gap-1.5 text-[10px] font-mono text-slate-600 tabular-nums">
                          <div className="bg-white border border-slate-200 rounded p-1.5 text-center">
                            <div className="text-slate-400">Nov</div>
                            <div className="font-bold text-slate-800">
                              {m.scoresA.novelty} v {m.scoresB.novelty}
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-1.5 text-center">
                            <div className="text-slate-400">Plaus</div>
                            <div className="font-bold text-slate-800">
                              {m.scoresA.plausibility} v {m.scoresB.plausibility}
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-1.5 text-center">
                            <div className="text-slate-400">Test</div>
                            <div className="font-bold text-slate-800">
                              {m.scoresA.testability} v {m.scoresB.testability}
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-1.5 text-center">
                            <div className="text-slate-400">Evid</div>
                            <div className="font-bold text-slate-800">
                              {m.scoresA.evidenceSupport} v{' '}
                              {m.scoresB.evidenceSupport}
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-1.5 text-center">
                            <div className="text-slate-400">Def</div>
                            <div className="font-bold text-slate-800">
                              {m.scoresA.defeater ?? 0} v {m.scoresB.defeater ?? 0}
                            </div>
                          </div>
                        </div>
                      )}

                      {m.judgeSummary && (
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {m.judgeSummary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
