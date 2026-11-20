'use client';

import React, { useState } from 'react';
import SourceIngestionPanel, { type ConnectedSourceRecord } from './SourceIngestionPanel';
import {
  buildCorpusSynthesisAndDiscoveries,
  type CorpusSynthesisReport,
  type CrossDomainPatternBridge,
  type ExecutionRuntime,
} from '@/lib/frontier-discovery';
import {
  BookOpen,
  Compass,
  FileCode2,
  FolderGit2,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';

interface CorpusDiscoveryViewProps {
  connectedSources: ConnectedSourceRecord[];
  researchGoal: string;
  synthesisReport: CorpusSynthesisReport | null;
  onUpdateSynthesisReport: (report: CorpusSynthesisReport) => void;
  onSourceIngested: (
    record: ConnectedSourceRecord,
    mode: 'auto-register-all' | 'prefill-form-only'
  ) => void;
  onLoadPresetCorpus: () => void;
  onPromoteBridgeToClaim: (bridge: CrossDomainPatternBridge) => void;
  onOpenBridgeInExecutionLab: (
    bridge: CrossDomainPatternBridge,
    runtime: ExecutionRuntime
  ) => void;
}

export default function CorpusDiscoveryView({
  connectedSources,
  researchGoal,
  synthesisReport,
  onUpdateSynthesisReport,
  onSourceIngested,
  onLoadPresetCorpus,
  onPromoteBridgeToClaim,
  onOpenBridgeInExecutionLab,
}: CorpusDiscoveryViewProps) {
  const [crossDomainTarget, setCrossDomainTarget] = useState<string>(
    'Commutative Algebra (Singular Ideals) ↔ Arithmetic Geometry (Selmer Parity) ↔ Spectral Operators (Lean 4)'
  );
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [showAddSourceDrawer, setShowAddSourceDrawer] = useState(false);
  const [promotedNotice, setPromotedNotice] = useState<string | null>(null);

  const activeReport =
    synthesisReport ||
    (connectedSources.length > 0
      ? buildCorpusSynthesisAndDiscoveries(
          connectedSources.map((s) => ({
            id: s.id,
            sourceType: s.sourceType,
            identifier: s.identifier,
            title: s.title,
            domain: s.extraction.claimDraft.domain,
            excerpt: s.extraction.manuscriptExcerpt,
          })),
          researchGoal
        )
      : null);

  const handleRunCorpusDiscovery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSynthesizing(true);
    setPromotedNotice(null);
    try {
      const res = await fetch('/api/coscientist/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: connectedSources.map((s) => ({
            id: s.id,
            sourceType: s.sourceType,
            identifier: s.identifier,
            title: s.title,
            domain: s.extraction.claimDraft.domain,
            excerpt: s.extraction.manuscriptExcerpt,
          })),
          researchGoal,
          crossDomainTarget,
        }),
      });
      const data = await res.json();
      if (data.report) {
        onUpdateSynthesisReport(data.report);
      }
    } catch {
      const fallback = buildCorpusSynthesisAndDiscoveries(
        connectedSources.map((s) => ({
          id: s.id,
          sourceType: s.sourceType,
          identifier: s.identifier,
          title: s.title,
          domain: s.extraction.claimDraft.domain,
          excerpt: s.extraction.manuscriptExcerpt,
        })),
        researchGoal
      );
      onUpdateSynthesisReport(fallback);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Agentic Synthesis Trigger Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-blue-700">
              Literature Synthesis &amp; Cross-Domain Isomorphism Engine (UM-2.6 Lenses L3 · L4 · L6)
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">
              Study Corpus Synthesis &amp; Cross-Domain Pattern Discovery
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Synthesizes ingested papers, GitHub repositories, PDFs, and LaTeX/Lean/Singular files to
              extract shared mathematical invariants, open obstructions, and structural reformulation
              dictionaries across scientific domains.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAddSourceDrawer((prev) => !prev)}
              data-testid="toggle-add-corpus-source-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddSourceDrawer ? 'Hide Source Ingest' : 'Add Paper / Repo / File'}</span>
            </button>

            {connectedSources.length === 0 && (
              <button
                type="button"
                onClick={onLoadPresetCorpus}
                data-testid="load-frontier-corpus-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Load Frontier 3-Domain Study Corpus</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleRunCorpusDiscovery()}
              disabled={isSynthesizing}
              data-testid="run-corpus-discovery-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
            >
              {isSynthesizing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>
                {isSynthesizing
                  ? 'Synthesizing Corpus & Patterns...'
                  : 'Run Literature Synthesis & Pattern Discovery'}
              </span>
            </button>
          </div>
        </div>

        {/* Cross-Domain Lens Query Input */}
        <form onSubmit={handleRunCorpusDiscovery} className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={crossDomainTarget}
              onChange={(e) => setCrossDomainTarget(e.target.value)}
              aria-label="Cross-Domain Discovery Target"
              placeholder="Specify domains to bridge (e.g., Commutative Algebra Ideals <-> Spectral Graph Theory <-> Number Theory)"
              className="w-full text-xs font-mono bg-transparent text-slate-900 focus:outline-none"
            />
          </div>
          <span className="text-xs font-mono text-slate-500 self-center whitespace-nowrap">
            Study Corpus: {connectedSources.length} source(s)
          </span>
        </form>

        {showAddSourceDrawer && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <SourceIngestionPanel
              connectedSources={connectedSources}
              onSourceIngested={(rec, mode) => {
                onSourceIngested(rec, mode);
                setShowAddSourceDrawer(false);
              }}
            />
          </div>
        )}
      </div>

      {promotedNotice && (
        <div
          data-testid="bridge-promoted-toast"
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-center gap-2 font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{promotedNotice}</span>
        </div>
      )}

      {/* Study Corpus Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold text-slate-900">
            Active Study Corpus ({connectedSources.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            GitHub · arXiv · PDF · LaTeX (.tex) · Lean 4 (.lean) · Singular (.sing) · Python (.py)
          </span>
        </div>

        {connectedSources.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-md text-center space-y-2">
            <p className="text-xs text-slate-600">
              Your Study Corpus is currently empty. Connect a GitHub repository, arXiv paper link,
              PDF, or `.tex`/`.lean`/`.sing` file—or load the 3-domain frontier corpus to synthesize
              cross-domain invariants immediately.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={onLoadPresetCorpus}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
              >
                Load Frontier 3-Domain Study Corpus
              </button>
              <button
                type="button"
                onClick={() => setShowAddSourceDrawer(true)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors"
              >
                Ingest Custom Source
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {connectedSources.map((src) => (
              <div
                key={src.id}
                data-testid={`corpus-source-card-${src.id}`}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-md flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      {src.sourceType === 'github' ? (
                        <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
                      ) : src.sourceType === 'arxiv' ? (
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <FileCode2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      {src.sourceType.toUpperCase()} · {src.identifier}
                    </span>
                    <span>Track {src.extraction.claimDraft.track}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                    {src.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {src.extraction.manuscriptExcerpt}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="truncate">{src.extraction.claimDraft.domain}</span>
                  <button
                    type="button"
                    onClick={() => onSourceIngested(src, 'prefill-form-only')}
                    className="text-blue-700 hover:underline shrink-0 ml-2"
                  >
                    Inspect Slots →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Synthesis Matrix & Cross-Domain Pattern Recognition Results */}
      {activeReport && (
        <div data-testid="corpus-synthesis-results" className="space-y-6">
          {/* Literature Synthesis Matrix */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <div className="text-[11px] font-mono text-blue-700">
                  {activeReport.agentModel} · Synthesized {activeReport.corpusCount} Corpus Source(s)
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Corpus Literature Synthesis &amp; Shared Invariant Matrix
                </h2>
              </div>
              <div className="text-xs font-mono text-slate-500">
                {activeReport.domainsCovered.slice(0, 3).join(' · ')}
              </div>
            </div>

            <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 border border-slate-200 rounded-md p-3.5">
              {activeReport.executiveSynthesis}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Column 1: Consensus Foundations */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>01. Consensus Foundations</span>
                  <span className="font-mono text-[11px] text-emerald-700">P1 Verified</span>
                </div>
                <div className="space-y-2.5">
                  {activeReport.consensusFoundations.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded text-xs space-y-1">
                      <p className="text-slate-900">{item.statement}</p>
                      <div className="text-[11px] font-mono text-slate-500">
                        Sources: {item.supportingSources.join(', ')} · {item.verificationStatus}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Shared Mathematical Invariants */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>02. Shared Mathematical Invariants</span>
                  <span className="font-mono text-[11px] text-blue-700">Lens L3 (P5)</span>
                </div>
                <div className="space-y-2.5">
                  {activeReport.sharedInvariants.map((inv, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded text-xs space-y-1">
                      <div className="font-semibold text-slate-900">{inv.invariantName}</div>
                      <div className="font-mono text-[11px] text-blue-800 bg-blue-50/60 px-2 py-1 rounded">
                        {inv.mathematicalForm}
                      </div>
                      <p className="text-slate-600 text-[11px]">{inv.occurrencesAcrossCorpus}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3: Open Obstructions & Gaps */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>03. Open Obstructions &amp; Gaps</span>
                  <span className="font-mono text-[11px] text-amber-700">L0 Spine</span>
                </div>
                <div className="space-y-2.5">
                  {activeReport.openObstructions.map((obs, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded text-xs space-y-1">
                      <p className="text-slate-900 font-medium">{obs.obstruction}</p>
                      <p className="text-slate-600 text-[11px]">
                        <strong className="text-slate-800">Resolution Route:</strong>{' '}
                        {obs.proposedResolutionRoute}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cross-Domain Pattern Recognition & Isomorphism Bridges */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Cross-Domain Pattern Recognition &amp; Structural Isomorphisms ({activeReport.crossDomainBridges.length})
                </h2>
                <p className="text-xs text-slate-600">
                  Each discovered bridge maps concepts across distinct domains via a preserved
                  mathematical invariant and generates executable Lean 4, Singular, and Python
                  verification scripts.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {activeReport.crossDomainBridges.map((bridge) => (
                <div
                  key={bridge.id}
                  data-testid={`cross-domain-bridge-${bridge.id}`}
                  className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <div className="text-xs font-mono text-blue-700">
                        {bridge.sourceDomain} ↔ {bridge.targetDomain} · {bridge.um1LensApplied}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{bridge.title}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onPromoteBridgeToClaim(bridge);
                          setPromotedNotice(
                            `Promoted cross-domain bridge "${bridge.title}" to a registered UM-1 Claim & EXP.`
                          );
                        }}
                        data-testid={`promote-bridge-btn-${bridge.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Promote to UM-1 Claim</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenBridgeInExecutionLab(bridge, 'lean4')}
                        data-testid={`bridge-run-lean4-${bridge.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Play className="w-3 h-3" />
                        <span>Lean 4 Proof</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenBridgeInExecutionLab(bridge, 'singular')}
                        data-testid={`bridge-run-singular-${bridge.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Play className="w-3 h-3" />
                        <span>Singular Ideal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenBridgeInExecutionLab(bridge, 'python')}
                        data-testid={`bridge-run-python-${bridge.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Play className="w-3 h-3" />
                        <span>Python Exact Q</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="font-mono text-[11px] text-slate-500">
                          Structural Isomorphism:
                        </span>
                        <p className="text-slate-900 mt-0.5">{bridge.structuralIsomorphism}</p>
                      </div>
                      <div>
                        <span className="font-mono text-[11px] text-slate-500">
                          Shared Invariant (UM-1.4d):
                        </span>
                        <p className="font-mono text-blue-800 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 mt-0.5">
                          {bridge.sharedInvariant}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                      <div className="font-mono text-[11px] font-semibold text-slate-700">
                        Falsifiable Cross-Domain Conjecture &amp; One-Sidedness (UM-1.4a)
                      </div>
                      <p className="text-slate-900 font-medium">{bridge.falsifiableConjecture}</p>
                      <div className="pt-1 space-y-1 text-[11px]">
                        <p className="text-slate-700">
                          <strong className="text-emerald-700">PASS Proves:</strong>{' '}
                          {bridge.oneSidednessPass}
                        </p>
                        <p className="text-slate-700">
                          <strong className="text-rose-700">FAIL Proves:</strong>{' '}
                          {bridge.oneSidednessFail}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reformulation Dictionary Table (UM-2.6 Lens 6) */}
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-600">
                          <th className="py-2 px-3">Source Domain Concept ({bridge.sourceDomain})</th>
                          <th className="py-2 px-3">Target Domain Concept ({bridge.targetDomain})</th>
                          <th className="py-2 px-3">Preserved Invariant Across Dictionary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {bridge.dictionaryMapping.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {entry.domainAConcept}
                            </td>
                            <td className="py-2 px-3 text-slate-800">{entry.domainBConcept}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-blue-700">
                              {entry.invariantPreserved}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
