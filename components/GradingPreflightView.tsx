'use client';

import React, { useState } from 'react';
import {
  computeUM1Grade,
  HLRE_PROTOCOL_VERSION,
  runAutomatedPreflightAudit,
  type ClaimExperimentRecord,
  type ClaimGradingInput,
  type PreflightChecklist,
  type PreflightAuditLogEntry,
  type TrackType,
  type TierType,
  type RecordLabel,
  type IndependenceLevel,
  type PostulationKind,
  type Rung4Kind,
  type VerificationRung,
} from '@/lib/um1-engine';
import { Play, CheckCircle2, Plus } from 'lucide-react';

interface GradingPreflightViewProps {
  claims: ClaimExperimentRecord[];
  selectedClaimId: string;
  preflightLogs: PreflightAuditLogEntry[];
  onSelectClaim: (id: string) => void;
  onUpdateClaimGradingAndPreflight: (
    claimId: string,
    gradingInput: ClaimGradingInput,
    preflight: PreflightChecklist
  ) => void;
  onLogPreflightRun: (entry: PreflightAuditLogEntry) => void;
  onRequestNewClaim?: () => void;
}

export default function GradingPreflightView({
  claims,
  selectedClaimId,
  preflightLogs,
  onSelectClaim,
  onUpdateClaimGradingAndPreflight,
  onLogPreflightRun,
  onRequestNewClaim,
}: GradingPreflightViewProps) {
  const activeClaim = claims.find((c) => c.id === selectedClaimId) || claims[0];
  const [grading, setGrading] = useState<ClaimGradingInput | null>(
    activeClaim ? activeClaim.gradingInput : null
  );
  const [preflight, setPreflight] = useState<PreflightChecklist | null>(
    activeClaim ? activeClaim.preflight : null
  );
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  if (!activeClaim) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-2xl mx-auto my-6">
        <h2 className="text-base font-semibold text-slate-900">
          Automated Preflight (P1–P7) &amp; Worst-Of Grading Matrix
        </h2>
        <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto">
          Register a claim or frozen EXP hypothesis first to run automated P1–P7 preflight checks
          and compute its worst-of HLRE v5.1 grade.
        </p>
        {onRequestNewClaim && (
          <button
            type="button"
            onClick={onRequestNewClaim}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            <Plus className="w-4 h-4" />
            Register Claim / EXP
          </button>
        )}
      </div>
    );
  }

  const effectiveGrading = grading || activeClaim.gradingInput;
  const effectivePreflight = preflight || activeClaim.preflight;

  const handleSwitchClaim = (newId: string) => {
    onSelectClaim(newId);
    const target = claims.find((c) => c.id === newId);
    if (target) {
      setGrading(target.gradingInput);
      setPreflight(target.preflight);
      setSavedBanner(null);
    }
  };

  const simulatedClaim: ClaimExperimentRecord = {
    ...activeClaim,
    gradingInput: effectiveGrading,
    preflight: effectivePreflight,
  };
  const breakdown = computeUM1Grade(effectiveGrading);
  const automatedPreflight = runAutomatedPreflightAudit(simulatedClaim, claims);

  const handleExecuteAutomatedPreflightAndLog = () => {
    onUpdateClaimGradingAndPreflight(activeClaim.id, effectiveGrading, effectivePreflight);
    const gateMap = {
      P1: automatedPreflight.diagnostics.find((d) => d.gateId === 'P1')?.passed ?? false,
      P2: automatedPreflight.diagnostics.find((d) => d.gateId === 'P2')?.passed ?? false,
      P3: automatedPreflight.diagnostics.find((d) => d.gateId === 'P3')?.passed ?? false,
      P4: automatedPreflight.diagnostics.find((d) => d.gateId === 'P4')?.passed ?? false,
      P5: automatedPreflight.diagnostics.find((d) => d.gateId === 'P5')?.passed ?? false,
      P6: automatedPreflight.diagnostics.find((d) => d.gateId === 'P6')?.passed ?? false,
      P7: automatedPreflight.diagnostics.find((d) => d.gateId === 'P7')?.passed ?? false,
    };
    const logEntry: PreflightAuditLogEntry = {
      id: `PFL-${activeClaim.id}-${preflightLogs.length + 1}`,
      claimId: activeClaim.id,
      expId: activeClaim.expId,
      timestamp: new Date().toISOString(),
      readyForCompute: automatedPreflight.readyForCompute,
      passedCount: automatedPreflight.passedCount,
      totalGates: 7,
      spendCapUsd: effectivePreflight.spendCapUsd,
      gateResults: gateMap,
      summaryNote: automatedPreflight.readyForCompute
        ? `Automated P1–P7 preflight passed (7/7); $${effectivePreflight.spendCapUsd} USD spend cap verified under $300 ceiling.`
        : `Automated P1–P7 preflight blocked (${automatedPreflight.passedCount}/7 passed).`,
    };
    onLogPreflightRun(logEntry);
    setSavedBanner(`Logged P1–P7 preflight run for ${activeClaim.id} (${automatedPreflight.passedCount}/7 passed).`);
    setTimeout(() => setSavedBanner(null), 2600);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Automated Preflight (P1–P7) &amp; Grading Matrix
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            UM-2.5 &amp; UM-3 · Verify P1–P7 preflight readiness and compute the worst-of{' '}
            {HLRE_PROTOCOL_VERSION} grade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeClaim.id}
            onChange={(e) => handleSwitchClaim(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExecuteAutomatedPreflightAndLog}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            <Play className="w-3.5 h-3.5" />
            Run &amp; Log P1–P7 Audit
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 font-medium">
          {savedBanner}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 Cols: Automated P1-P7 Checklist */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              UM-2.5 Preflight Gates (P1–P7)
            </h2>
            <span className="text-xs font-mono font-semibold text-slate-700">
              {automatedPreflight.passedCount}/7 Passed ·{' '}
              {automatedPreflight.readyForCompute ? 'READY' : 'HOLD'}
            </span>
          </div>

          <div className="space-y-2.5">
            {automatedPreflight.diagnostics.map((diag) => (
              <div
                key={diag.gateId}
                className={`p-3 rounded-md border text-xs ${
                  diag.passed
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-amber-50/60 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-slate-900">
                    {diag.gateId}: {diag.title}
                  </span>
                  <span className={diag.passed ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {diag.passed ? 'PASS' : 'BLOCKED'}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{diag.automatedFinding}</p>
              </div>
            ))}
          </div>

          {/* Toggle Controls for P1-P7 */}
          <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
            {(
              [
                ['P1_sourceComplete', 'P1 Source Complete'],
                ['P2_smokeTest', 'P2 Tooling Smoke Test'],
                ['P3_premiseDependenciesChecked', 'P3 Premise Ledger Checked'],
                ['P4_oneSidednessStated', 'P4 One-Sidedness Stated'],
                ['P5_invariantFirstChecked', 'P5 Invariant-First Checked'],
                ['P6_computeBudgetDeclared', 'P6 Compute Budget Declared'],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(effectivePreflight[field])}
                  onChange={(e) =>
                    setPreflight({
                      ...effectivePreflight,
                      [field]: e.target.checked,
                    })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Right 6 Cols: Computable Worst-Of Grading Matrix */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              {HLRE_PROTOCOL_VERSION} Computable Worst-Of Grade
            </h2>
            <span className="text-lg font-mono font-bold text-blue-700">
              Grade {breakdown.finalGrade}
              {breakdown.rung4Kind ? ` · Rung 4 (${breakdown.rung4Kind})` : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Track</label>
              <select
                value={effectiveGrading.track}
                onChange={(e) =>
                  setGrading({ ...effectiveGrading, track: e.target.value as TrackType })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="F">Track F (Deductive)</option>
                <option value="E">Track E (Empirical)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tier Ceiling</label>
              <select
                value={effectiveGrading.tier}
                onChange={(e) =>
                  setGrading({ ...effectiveGrading, tier: e.target.value as TierType })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="Lite">Lite (Max D)</option>
                <option value="Standard">Standard (Max B)</option>
                <option value="Full">Full (Max A / F1)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Independence</label>
              <select
                value={effectiveGrading.independence}
                onChange={(e) =>
                  setGrading({
                    ...effectiveGrading,
                    independence: e.target.value as IndependenceLevel,
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="I0">I0</option>
                <option value="I1">I1</option>
                <option value="I2">I2</option>
                <option value="I3">I3</option>
                <option value="I4">I4</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Verification Rung {breakdown.rung4Kind ? `(${breakdown.rung4Kind})` : ''}
              </label>
              <div className="flex gap-2">
                <select
                  value={effectiveGrading.verificationRung}
                  onChange={(e) =>
                    setGrading({
                      ...effectiveGrading,
                      verificationRung: Number(e.target.value) as VerificationRung,
                    })
                  }
                  className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  {[0, 1, 2, 3, 4, 5].map((r) => (
                    <option key={r} value={r}>
                      Rung {r}
                    </option>
                  ))}
                </select>
                {effectiveGrading.verificationRung >= 4 && (
                  <select
                    aria-label="Rung 4 Kind"
                    value={effectiveGrading.rung4Kind || breakdown.rung4Kind || '4D'}
                    onChange={(e) =>
                      setGrading({
                        ...effectiveGrading,
                        rung4Kind: e.target.value as Rung4Kind,
                      })
                    }
                    className="px-2 py-1.5 font-mono border border-slate-300 rounded bg-white"
                  >
                    <option value="4K">4K (Kernel)</option>
                    <option value="4D">4D (Closed Ledger)</option>
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Record Label</label>
              <select
                value={effectiveGrading.recordLabel}
                onChange={(e) =>
                  setGrading({
                    ...effectiveGrading,
                    recordLabel: e.target.value as RecordLabel,
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="[MV]">[MV] Machine-Verified (4K Kernel or 4D Closed Ledger)</option>
                <option value="[D]">[D] Derived</option>
                <option value="[C]">[C] Claimed</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Postulation Kind</label>
              <select
                value={effectiveGrading.postulationKind}
                onChange={(e) =>
                  setGrading({
                    ...effectiveGrading,
                    postulationKind: e.target.value as PostulationKind,
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="constraint-led">constraint-led</option>
                <option value="evidence-guided">evidence-guided</option>
                <option value="exploratory">exploratory</option>
                <option value="post-hoc">post-hoc</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-1.5">
            <div className="text-xs font-semibold text-slate-700">Active Grade Constraints</div>
            <ul className="space-y-1 text-xs font-mono text-slate-600">
              {breakdown.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
