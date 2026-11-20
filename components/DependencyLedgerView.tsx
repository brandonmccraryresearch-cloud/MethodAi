'use client';

import React, { useState } from 'react';
import {
  auditDependencyLedger,
  computeUM1Grade,
  type ClaimExperimentRecord,
  type PremiseDependencyItem,
  type DependencyNodeKind,
  type PremiseLedgerStatus,
} from '@/lib/um1-engine';
import { Plus, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface DependencyLedgerViewProps {
  claims: ClaimExperimentRecord[];
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  onUpdateDependencyLedger: (
    claimId: string,
    updatedItems: PremiseDependencyItem[],
    updatedParentClaimIds: string[],
    p3Checked: boolean
  ) => void;
  onRequestNewClaim?: () => void;
}

export default function DependencyLedgerView({
  claims,
  selectedClaimId,
  onSelectClaim,
  onUpdateDependencyLedger,
  onRequestNewClaim,
}: DependencyLedgerViewProps) {
  const activeClaim = claims.find((c) => c.id === selectedClaimId) || claims[0];

  const [newKind, setNewKind] = useState<DependencyNodeKind>('observation');
  const [newStatement, setNewStatement] = useState('');
  const [newCitation, setNewCitation] = useState('');
  const [newHasVerdict, setNewHasVerdict] = useState(true);
  const [newRederived, setNewRederived] = useState(true);
  const [newIsLeafTranscription, setNewIsLeafTranscription] = useState(false);

  if (!activeClaim) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-2xl mx-auto my-6">
        <h2 className="text-base font-semibold text-slate-900">
          Premise &amp; Dependency Ledger (UM-4.4 &amp; P3)
        </h2>
        <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto">
          Register a claim first to link observations, choices, assumptions, and primary
          transcriptions and verify independent re-derivation.
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

  const ledgerAudit = auditDependencyLedger(activeClaim, claims);
  const computedGrade = computeUM1Grade(activeClaim.gradingInput);

  const computeP3FromItems = (nextItems: PremiseDependencyItem[]) => {
    const anyUnrederivedLeaf = nextItems.some(
      (i) => i.isLeafTranscription && !i.independentlyRederived
    );
    const anyCitedElsewhere = nextItems.some(
      (i) =>
        i.status === 'CITED-ELSEWHERE' ||
        (!i.independentlyRederived && /\bcited[- ]elsewhere\b/i.test(i.sourceCitation))
    );
    const allHaveVerdicts = nextItems.every(
      (i) => i.hasSupportingVerdict && i.status !== 'CITED-ELSEWHERE'
    );
    return !anyUnrederivedLeaf && !anyCitedElsewhere && allHaveVerdicts;
  };

  const handleToggleItemProperty = (
    itemId: string,
    field: 'independentlyRederived' | 'isLeafTranscription' | 'hasSupportingVerdict'
  ) => {
    const nextItems = activeClaim.dependencyLedgerItems.map((item) =>
      item.id === itemId ? { ...item, [field]: !item[field] } : item
    );
    onUpdateDependencyLedger(
      activeClaim.id,
      nextItems,
      activeClaim.premiseDependencies,
      computeP3FromItems(nextItems)
    );
  };

  const handleCycleItemStatus = (itemId: string) => {
    const order: PremiseLedgerStatus[] = ['VERIFIED', 'UNVERIFIED', 'CITED-ELSEWHERE'];
    const nextItems = activeClaim.dependencyLedgerItems.map((item) => {
      if (item.id !== itemId) return item;
      const cur: PremiseLedgerStatus =
        item.status || (item.hasSupportingVerdict && item.independentlyRederived ? 'VERIFIED' : 'UNVERIFIED');
      const nextStatus = order[(order.indexOf(cur) + 1) % order.length];
      return {
        ...item,
        status: nextStatus,
        independentlyRederived: nextStatus === 'VERIFIED',
        hasSupportingVerdict: nextStatus === 'VERIFIED',
      };
    });
    onUpdateDependencyLedger(
      activeClaim.id,
      nextItems,
      activeClaim.premiseDependencies,
      computeP3FromItems(nextItems)
    );
  };

  const handleAddDependencyItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatement.trim()) return;
    const nextItem: PremiseDependencyItem = {
      id: `DEP-${activeClaim.id}-${activeClaim.dependencyLedgerItems.length + 1}`,
      kind: newKind,
      statement: newStatement.trim(),
      sourceCitation: newCitation.trim() || 'Recorded in programme dependency ledger',
      hasSupportingVerdict: newHasVerdict,
      independentlyRederived: newRederived,
      isLeafTranscription: newIsLeafTranscription,
    };
    const nextItems = [...activeClaim.dependencyLedgerItems, nextItem];
    const anyUnrederivedLeaf = nextItems.some(
      (i) => i.isLeafTranscription && !i.independentlyRederived
    );
    const allHaveVerdicts = nextItems.every((i) => i.hasSupportingVerdict);

    onUpdateDependencyLedger(
      activeClaim.id,
      nextItems,
      activeClaim.premiseDependencies,
      !anyUnrederivedLeaf && allHaveVerdicts
    );
    setNewStatement('');
    setNewCitation('');
  };

  const handleToggleParentClaim = (parentId: string) => {
    if (parentId === activeClaim.id) return;
    const exists = activeClaim.premiseDependencies.includes(parentId);
    const nextParents = exists
      ? activeClaim.premiseDependencies.filter((id) => id !== parentId)
      : [...activeClaim.premiseDependencies, parentId];
    onUpdateDependencyLedger(
      activeClaim.id,
      activeClaim.dependencyLedgerItems,
      nextParents,
      activeClaim.preflight.P3_premiseDependenciesChecked
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Dependency Ledger &amp; P3 Premise Validator
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            UM-4.4 · Any dependency ledger ending in an un-re-derived transcription is flagged as{' '}
            <code className="font-mono">INCOMPLETE-EVIDENCE</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="dep-claim-select" className="text-xs font-medium text-slate-600">
            Claim:
          </label>
          <select
            id="dep-claim-select"
            value={activeClaim.id}
            onChange={(e) => onSelectClaim(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">UM-4.4 Ledger Status</div>
          <div className="mt-1 flex items-center gap-2">
            {!ledgerAudit.endsInUnrederivedTranscription && !ledgerAudit.hasCitedElsewhere ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-mono font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> CLOSED LEDGER (4D Ready)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-mono font-bold text-rose-700">
                <ShieldAlert className="w-4 h-4" /> INCOMPLETE-EVIDENCE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Computed Claim Grade: <strong className="font-mono">{computedGrade.finalGrade}</strong>
            {ledgerAudit.hasCitedElsewhere ? ' · CITED-ELSEWHERE detected' : ''}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Preflight Check P3</div>
          <div className="mt-1 flex items-center gap-2">
            {ledgerAudit.p3GatePassed ? (
              <span className="text-sm font-mono font-bold text-emerald-700">P3 READY</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-mono font-bold text-amber-700">
                <AlertTriangle className="w-4 h-4" /> P3 BLOCKED
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Un-re-derived leaves: {ledgerAudit.unrederivedTranscriptionItems.length} · Unverified
            premises: {ledgerAudit.premisesWithoutVerdicts.length}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs text-slate-500">Certify P3 Gate</div>
          <button
            type="button"
            onClick={() =>
              onUpdateDependencyLedger(
                activeClaim.id,
                activeClaim.dependencyLedgerItems,
                activeClaim.premiseDependencies,
                ledgerAudit.p3GatePassed
              )
            }
            className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
          >
            Validate &amp; Sync P3 Status ({ledgerAudit.p3GatePassed ? 'PASS' : 'HOLD'})
          </button>
        </div>
      </div>

      {/* Main Split: Add Premise (Left) + Premise Items Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2.5">
            Add Premise Dependency Node
          </h2>

          <form onSubmit={handleAddDependencyItem} className="space-y-3">
            <div>
              <label htmlFor="dep-kind" className="block text-xs font-semibold text-slate-700">
                Dependency Node Kind
              </label>
              <select
                id="dep-kind"
                value={newKind}
                onChange={(e) => {
                  const val = e.target.value as DependencyNodeKind;
                  setNewKind(val);
                  if (val === 'primary_transcription') {
                    setNewIsLeafTranscription(true);
                  }
                }}
                className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
              >
                <option value="observation">Observation</option>
                <option value="choice">Methodological / Gauge Choice</option>
                <option value="assumption">Domain Assumption</option>
                <option value="primary_transcription">Primary Source Transcription (Leaf)</option>
              </select>
            </div>

            <div>
              <label htmlFor="dep-statement" className="block text-xs font-semibold text-slate-700">
                Premise Statement
              </label>
              <input
                id="dep-statement"
                type="text"
                value={newStatement}
                onChange={(e) => setNewStatement(e.target.value)}
                placeholder="Enter exact observation, assumption, or transcribed equation..."
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="dep-citation" className="block text-xs font-semibold text-slate-700">
                Source Citation / Provenance
              </label>
              <input
                id="dep-citation"
                type="text"
                value={newCitation}
                onChange={(e) => setNewCitation(e.target.value)}
                placeholder="e.g., Theorem 2.1 or experimental calibration log"
                className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>

            <div className="space-y-2 pt-1 text-xs text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newRederived}
                  onChange={(e) => setNewRederived(e.target.checked)}
                />
                <span>Independently re-derived (UM-4.4)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newIsLeafTranscription}
                  onChange={(e) => setNewIsLeafTranscription(e.target.checked)}
                />
                <span>Is leaf transcription from external source</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newHasVerdict}
                  onChange={(e) => setNewHasVerdict(e.target.checked)}
                />
                <span>Has supporting verdict (UM-1.4b)</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              <Plus className="w-4 h-4" />
              Add Premise to Ledger
            </button>
          </form>

          {claims.length > 1 && (
            <div className="pt-3 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                Upstream Claim Dependencies
              </div>
              <div className="flex flex-wrap gap-1.5">
                {claims
                  .filter((c) => c.id !== activeClaim.id)
                  .map((c) => {
                    const linked = activeClaim.premiseDependencies.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleParentClaim(c.id)}
                        className={`px-2.5 py-1 text-xs font-mono rounded border ${
                          linked
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        {c.id}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Premise Nodes for {activeClaim.id} ({activeClaim.dependencyLedgerItems.length})
            </span>
          </div>

          {activeClaim.dependencyLedgerItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No premise nodes recorded yet for {activeClaim.id}. Use the form on the left to add
              observations, choices, assumptions, or transcriptions.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {activeClaim.dependencyLedgerItems.map((item) => {
                const isCitedElsewhere =
                  item.status === 'CITED-ELSEWHERE' ||
                  (!item.independentlyRederived && /\bcited[- ]elsewhere\b/i.test(item.sourceCitation));
                const isBlocked =
                  (item.isLeafTranscription && !item.independentlyRederived) || isCitedElsewhere;
                const displayStatus: PremiseLedgerStatus = isCitedElsewhere
                  ? 'CITED-ELSEWHERE'
                  : item.status || (item.hasSupportingVerdict && item.independentlyRederived ? 'VERIFIED' : 'UNVERIFIED');
                return (
                  <div
                    key={item.id}
                    className={`p-4 space-y-2 ${isBlocked ? 'bg-rose-50/50' : ''}`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-slate-900">
                        {item.id} · {item.kind}
                      </span>
                      <span className={isBlocked ? 'text-rose-700 font-bold' : 'text-emerald-700'}>
                        {isCitedElsewhere
                          ? 'CITED-ELSEWHERE (BLOCKS GRADE)'
                          : isBlocked
                            ? 'UN-RE-DERIVED LEAF (BLOCKS GRADE)'
                            : displayStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-900">{item.statement}</p>
                    <p className="text-[11px] text-slate-500">Source: {item.sourceCitation}</p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCycleItemStatus(item.id)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded border ${
                          displayStatus === 'CITED-ELSEWHERE'
                            ? 'bg-rose-50 text-rose-800 border-rose-300 font-semibold'
                            : displayStatus === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        Ledger Status: {displayStatus}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleItemProperty(item.id, 'independentlyRederived')
                        }
                        className={`px-2.5 py-1 text-[11px] font-mono rounded border ${
                          item.independentlyRederived
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        Re-derived: {item.independentlyRederived ? 'Yes' : 'No (Click to Verify)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleItemProperty(item.id, 'isLeafTranscription')}
                        className="px-2.5 py-1 text-[11px] font-mono rounded border bg-slate-50 text-slate-700 border-slate-300"
                      >
                        Leaf Transcription: {item.isLeafTranscription ? 'Yes' : 'No'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleItemProperty(item.id, 'hasSupportingVerdict')}
                        className="px-2.5 py-1 text-[11px] font-mono rounded border bg-slate-50 text-slate-700 border-slate-300"
                      >
                        Verdict: {item.hasSupportingVerdict ? 'Supported' : 'Hypothesis Only'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
