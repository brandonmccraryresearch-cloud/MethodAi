'use client';

import React, { useState } from 'react';
import {
  computeUM1Grade,
  findTransitiveDependents,
  ERROR_FAMILY_DESCRIPTIONS,
  type ClaimExperimentRecord,
  type WithdrawalEntry,
  type ErrorFamily,
  type ToolVerdictQuote,
} from '@/lib/um1-engine';
import {
  executionRunToToolVerdict,
  type ExecutionRunRecord,
} from '@/lib/frontier-discovery';
import { RotateCcw, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface WithdrawalLedgerViewProps {
  claims: ClaimExperimentRecord[];
  withdrawals: WithdrawalEntry[];
  executionRuns?: ExecutionRunRecord[];
  restoreStatusBanner?: { ok: boolean; message: string } | null;
  onExecuteRetraction: (
    targetClaimId: string,
    entry: Omit<WithdrawalEntry, 'id' | 'timestamp' | 'transitiveDependents' | 'demotionApplied'>
  ) => void;
  onRestoreClaim: (claimId: string, restoringVerdict?: ToolVerdictQuote) => void;
  onRequestNewClaim?: () => void;
}

export default function WithdrawalLedgerView({
  claims,
  withdrawals,
  executionRuns = [],
  restoreStatusBanner = null,
  onExecuteRetraction,
  onRestoreClaim,
  onRequestNewClaim,
}: WithdrawalLedgerViewProps) {
  const [targetClaimId, setTargetClaimId] = useState<string>(claims[0]?.id || '');
  const [verbatimStatement, setVerbatimStatement] = useState<string>('');
  const [errorFamily, setErrorFamily] = useState<ErrorFamily>('P');
  const [missedGate, setMissedGate] = useState<string>('');
  const [restorationCriteria, setRestorationCriteria] = useState<string>('');
  const [remediationPlan, setRemediationPlan] = useState<string>('');
  const [postMortemSummary, setPostMortemSummary] = useState<string>('');
  const [complianceSignOff, setComplianceSignOff] = useState<string>('');
  const [selectedRunIdForRestore, setSelectedRunIdForRestore] = useState<string>('');

  const eligibleRestoreRuns = executionRuns.filter(
    (r) => r.actuallyExecuted === true && !r.isNoOp && r.exitCode === 0
  );

  if (claims.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-2xl mx-auto my-6">
        <h2 className="text-base font-semibold text-slate-900">
          Withdrawal Ledger &amp; Mechanical Demotions (UM-4.5)
        </h2>
        <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto">
          No claims or withdrawals are currently logged. Register claims first to track dependency
          DAG exposure and execute auditable retractions.
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

  const effectiveTargetId = targetClaimId || claims[0].id;
  const previewDependents = findTransitiveDependents(effectiveTargetId, claims);

  const handleRetractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verbatimStatement.trim()) return;
    onExecuteRetraction(effectiveTargetId, {
      claimId: effectiveTargetId,
      verbatimStatement: verbatimStatement.trim(),
      errorFamily,
      missedGate: missedGate.trim() || 'P3 Premise Dependency Gate',
      restorationCriteria: restorationCriteria.trim() || 'Independent re-derivation required',
      remediationPlan: remediationPlan.trim() || 'Logged in withdrawal ledger',
      postMortemSummary: postMortemSummary.trim() || 'Recorded via UM-4.5 retraction protocol',
      complianceSignOff: complianceSignOff.trim() || 'R1 post-result sweep completed',
    });
    setVerbatimStatement('');
    setMissedGate('');
    setRestorationCriteria('');
    setRemediationPlan('');
    setPostMortemSummary('');
    setComplianceSignOff('');
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Withdrawal Ledger &amp; Mechanical Demotions (UM-4.5)
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Retracting a claim logs its verbatim statement and mechanically demotes all transitive
          dependents to <code className="font-mono">INCOMPLETE-EVIDENCE</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2.5">
            Execute UM-4.5 Retraction
          </h2>

          <form onSubmit={handleRetractSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="retract-claim-select"
                className="block text-xs font-semibold text-slate-700"
              >
                Target Claim to Retract
              </label>
              <select
                id="retract-claim-select"
                value={effectiveTargetId}
                onChange={(e) => setTargetClaimId(e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
              >
                {claims.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} · {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-600">
              Downstream Dependents Affected:{' '}
              {previewDependents.length > 0 ? previewDependents.join(', ') : 'None (0)'}
            </div>

            <div>
              <label
                htmlFor="retract-verbatim"
                className="block text-xs font-semibold text-slate-700"
              >
                Verbatim Retracted Statement (Required)
              </label>
              <textarea
                id="retract-verbatim"
                rows={2}
                value={verbatimStatement}
                onChange={(e) => setVerbatimStatement(e.target.value)}
                placeholder="Quote exact retracted statement..."
                className="mt-1 w-full p-2.5 text-xs border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label
                htmlFor="retract-family"
                className="block text-xs font-semibold text-slate-700"
              >
                Error Family (UM-4.5)
              </label>
              <select
                id="retract-family"
                value={errorFamily}
                onChange={(e) => setErrorFamily(e.target.value as ErrorFamily)}
                className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
              >
                {(Object.keys(ERROR_FAMILY_DESCRIPTIONS) as ErrorFamily[]).map((fam) => (
                  <option key={fam} value={fam}>
                    [{fam}] {ERROR_FAMILY_DESCRIPTIONS[fam]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="retract-restoration"
                className="block text-xs font-semibold text-slate-700"
              >
                Restoration Criteria
              </label>
              <input
                id="retract-restoration"
                type="text"
                value={restorationCriteria}
                onChange={(e) => setRestorationCriteria(e.target.value)}
                placeholder="Condition required to restore claim grade..."
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={!verbatimStatement.trim()}
              className="w-full px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-md"
            >
              Execute Retraction &amp; Demote Dependents
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700">
              <span>Active Dependency DAG Status ({claims.length})</span>
              <span className="font-mono text-[11px] font-normal text-slate-500">
                UM-4.5 Restoration requires a NEW executed verdict
              </span>
            </div>

            {restoreStatusBanner && (
              <div
                className={`mx-4 mt-3 p-2.5 rounded border text-xs flex items-start gap-2 ${
                  restoreStatusBanner.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {restoreStatusBanner.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <span>{restoreStatusBanner.message}</span>
              </div>
            )}

            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-2 text-xs">
              <label htmlFor="restore-verdict-select" className="font-semibold text-slate-700">
                Restoration Verdict (Execution Lab):
              </label>
              <select
                id="restore-verdict-select"
                value={selectedRunIdForRestore}
                onChange={(e) => setSelectedRunIdForRestore(e.target.value)}
                className="flex-1 min-w-[220px] px-2.5 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
              >
                <option value="">
                  {eligibleRestoreRuns.length === 0
                    ? 'No executed PASS runs available — run a new verification in Execution Lab first'
                    : '-- Select a newly executed PASS run (actuallyExecuted: true) --'}
                </option>
                {eligibleRestoreRuns.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.id} · {run.runtime.toUpperCase()} · {run.title} ({run.sha256Hash.slice(0, 10)})
                  </option>
                ))}
              </select>
            </div>

            <div className="divide-y divide-slate-200">
              {claims.map((c) => {
                const g = computeUM1Grade(c.gradingInput);
                const chosenRun = eligibleRestoreRuns.find(
                  (r) => r.id === selectedRunIdForRestore
                );
                const restoringVerdict = chosenRun ? executionRunToToolVerdict(chosenRun) : undefined;
                return (
                  <div key={c.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-900">
                        {c.id} · {c.title}
                      </div>
                      <div className="text-slate-500 font-mono mt-0.5">
                        Depends on:{' '}
                        {c.premiseDependencies.length > 0
                          ? c.premiseDependencies.join(', ')
                          : 'Root Claim'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-slate-800">
                        {g.finalGrade}
                      </span>
                      {(g.finalGrade === 'CONTRADICTED' ||
                        g.finalGrade === 'INCOMPLETE-EVIDENCE') && (
                        <button
                          type="button"
                          onClick={() => onRestoreClaim(c.id, restoringVerdict)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-blue-700 bg-blue-50 hover:bg-blue-100 rounded"
                        >
                          <RotateCcw className="w-3 h-3" /> Restore with Verdict
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-xs font-bold text-slate-900 mb-2">
              Logged Withdrawals ({withdrawals.length})
            </h3>
            {withdrawals.length === 0 ? (
              <p className="text-xs text-slate-500">No withdrawals recorded in this session.</p>
            ) : (
              <div className="space-y-2.5">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 bg-rose-50/40 border border-rose-200 rounded text-xs space-y-1"
                  >
                    <div className="font-mono font-bold text-rose-900">
                      {w.id} · Claim {w.claimId} · Error Family [{w.errorFamily}]
                    </div>
                    <p className="text-slate-800 italic">&ldquo;{w.verbatimStatement}&rdquo;</p>
                    <p className="font-mono text-[11px] text-slate-600">{w.demotionApplied}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
