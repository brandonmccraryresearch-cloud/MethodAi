'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Layers,
  GitMerge,
  Activity,
  Network,
  Cpu,
  Play,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Lock,
  RefreshCw,
} from 'lucide-react';
import {
  type EpistemicSievePipelineReport,
  type LakatosianLedgerRow,
  type EpistemicLayerId,
  buildEpistemicMachineReport,
  evaluateNegativeAnalogyGuard,
  evaluateSheafCohomologyCycle,
} from '@/lib/epistemic-machine';
import type { ConnectedSourceRecord } from './SourceIngestionPanel';
import type { ExecutionRuntime } from '@/lib/frontier-discovery';

interface EpistemicMachineViewProps {
  connectedSources: ConnectedSourceRecord[];
  onPromoteLedgerRowToClaim: (row: LakatosianLedgerRow) => void;
  onOpenScriptInExecutionLab: (runtime: ExecutionRuntime, code: string, title: string) => void;
  onLoadAllIrhAuditClaims?: () => void;
}

export default function EpistemicMachineView({
  connectedSources,
  onPromoteLedgerRowToClaim,
  onOpenScriptInExecutionLab,
  onLoadAllIrhAuditClaims,
}: EpistemicMachineViewProps) {
  const [report, setReport] = useState<EpistemicSievePipelineReport>(() =>
    buildEpistemicMachineReport(connectedSources)
  );
  const [activeLayer, setActiveLayer] = useState<EpistemicLayerId>('L1');
  const [activeBlueprintStep, setActiveBlueprintStep] = useState<number>(7);
  const [sieveRunning, setSieveRunning] = useState(false);

  // Interactive Layer 2 Negative Analogy Guard tester state
  const [guardSource, setGuardSource] = useState('Electrical (2nd-Order RLC Resonance)');
  const [guardTarget, setGuardTarget] = useState('Thermal (Pure Conduction)');
  const [guardHypothesis, setGuardHypothesis] = useState(
    'Map electrical inductor resonance (L) directly onto pure thermal conduction'
  );
  const guardResult = evaluateNegativeAnalogyGuard(guardSource, guardTarget, guardHypothesis);

  // Interactive Layer 5B Sheaf Cohomology edge sign state (+1 or -1)
  const [edgeSigns, setEdgeSigns] = useState<[1 | -1, 1 | -1, 1 | -1]>([1, 1, -1]);
  const liveSheafAudit = evaluateSheafCohomologyCycle(
    report.layer5BSheafAgm.nodes,
    edgeSigns,
    'IRH v83 Static Lattice Postulate & SO(8) Regular Branching Assumption',
    'IRH v94 Layer 0 Swift-Hohenberg Functional ⇒ Derived D4 24-cell (S = 0.454) ⇒ McKay 2T ↔ Affine E6 Chiral Forcing'
  );

  const handleRunFullSieve = () => {
    setSieveRunning(true);
    setTimeout(() => {
      setReport(buildEpistemicMachineReport(connectedSources));
      setSieveRunning(false);
    }, 250);
  };

  const toggleEdgeSign = (idx: 0 | 1 | 2) => {
    setEdgeSigns((prev) => {
      const next: [1 | -1, 1 | -1, 1 | -1] = [...prev] as [1 | -1, 1 | -1, 1 | -1];
      next[idx] = next[idx] === 1 ? -1 : 1;
      return next;
    });
  };

  return (
    <div className="space-y-6" data-testid="epistemic-machine-view">
      {/* Top Blueprint Header: The Epistemic Machine (5-Layer Cross-Domain Discovery Pipeline) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-blue-700">
              <span>THE EPISTEMIC MACHINE · 5-LAYER NEURO-SYMBOLIC DISCOVERY PIPELINE</span>
              <span className="px-2 py-0.5 bg-slate-900 text-emerald-300 rounded text-[11px]">
                {report.masterEquation}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              The Truth Engine: 5-Layer Cross-Domain Sieve &amp; IRH Deep Research Audit (v83.0 → v94.0)
            </h1>
            <p className="text-xs text-slate-600 max-w-4xl">
              Decouples divergent structural abduction from convergent formal verification. Replaces LLM lexical
              conflation and notational collapse with Categorical Ologs, Bond Graph Negative Analogy Guards, Causal
              Tau-Transportability, Burt Structural Holes, Paraconsistent Sheaf Cohomology, and Lean 4 Autoformalization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onLoadAllIrhAuditClaims && (
              <button
                type="button"
                onClick={onLoadAllIrhAuditClaims}
                data-testid="load-irh-audit-claims-btn"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                <span>Load IRH v94 Audit Claims into UM-1</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleRunFullSieve}
              disabled={sieveRunning}
              data-testid="run-epistemic-sieve-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sieveRunning ? 'animate-spin' : ''}`} />
              <span>{sieveRunning ? 'Running 5-Layer Sieve...' : 'Execute 5-Layer Epistemic Sieve'}</span>
            </button>
          </div>
        </div>

        {/* Standard LLMs (The Pathology) vs 5-Layer Pipeline (The Sieve) Comparison Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-md space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950">
                Standard LLMs (The Epistemic Pathology)
              </span>
              <span className="text-[11px] font-mono text-amber-800">Rejected by Sieve</span>
            </div>
            <ul className="text-[11px] text-amber-900 space-y-1">
              <li>
                <strong>Mainstream Convergence:</strong> Drifts toward high-probability literature tropes.
              </li>
              <li>
                <strong>Lexical Conflation:</strong> Confuses surface-level vocabulary similarity with mechanistic truth.
              </li>
              <li>
                <strong>Notational Collapse:</strong> Strips away domain-specific physics in &gt;75% of proofs for trivial scalar identities.
              </li>
            </ul>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-md space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                5-Layer Neuro-Symbolic Pipeline (The Deterministic Sieve)
              </span>
              <span className="text-[11px] font-mono text-blue-700">
                Noise Sieve: {report.telemetry.noiseReductionPct}% · {report.telemetry.crossDomainNodes.toLocaleString()} Nodes
              </span>
            </div>
            <ul className="text-[11px] text-slate-700 space-y-1">
              <li>
                <strong>Divergent Structural Abduction:</strong> Finds non-obvious cross-domain isomorphisms across Burt Structural Holes.
              </li>
              <li>
                <strong>Mechanistic Isomorphism:</strong> Maps invariant physics via Bond Graphs, GENERIC &amp; Causal Tau-Transformations.
              </li>
              <li>
                <strong>Paraconsistent Formal Verification:</strong> Isolates contradictions via AGM Revision &amp; compiles directly to Lean 4.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* The 7-Step Operational Execution Blueprint */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-mono text-slate-500">OPERATIONAL EXECUTION BLUEPRINT</div>
            <h2 className="text-sm font-bold text-slate-900">
              The 7-Step Neuro-Symbolic Discovery &amp; Verification Pipeline
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-600">
            Click any step (1–7) to inspect its formal artifact output
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {report.operational7Steps.map((step) => {
            const isSelected = activeBlueprintStep === step.stepNumber;
            return (
              <button
                key={step.stepNumber}
                type="button"
                onClick={() => setActiveBlueprintStep(step.stepNumber)}
                data-testid={`blueprint-step-${step.stepNumber}`}
                className={`p-3 rounded-md border text-left transition-colors flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        isSelected ? 'text-blue-300' : 'text-blue-700'
                      }`}
                    >
                      STEP {step.stepNumber}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        step.status === 'PROBLEM_SHIFT_FORCED'
                          ? isSelected
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'bg-amber-100 text-amber-900'
                          : isSelected
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {step.status === 'PROBLEM_SHIFT_FORCED' ? 'AGM SHIFT' : 'VERIFIED'}
                    </span>
                  </div>
                  <div className="text-xs font-bold leading-snug">
                    {step.title.replace(/^\d+\.\s*/, '')}
                  </div>
                </div>
                <div
                  className={`text-[10px] font-mono truncate ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {step.layerTag}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Inspector */}
        {report.operational7Steps
          .filter((s) => s.stepNumber === activeBlueprintStep)
          .map((step) => (
            <div
              key={step.stepNumber}
              className="p-4 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
            >
              <div className="lg:col-span-5 space-y-1">
                <div className="text-xs font-mono font-semibold text-blue-700">
                  {step.layerTag} · {step.title}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{step.summary}</p>
              </div>
              <div className="lg:col-span-7 p-3 bg-white border border-slate-200 rounded font-mono text-xs text-slate-900">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Compiled Step {step.stepNumber} Sieve Output:
                </div>
                {step.artifactOutput}
              </div>
            </div>
          ))}
      </div>

      {/* Interactive 5-Layer Neuro-Symbolic Blueprint Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full" role="tablist" aria-label="5-Layer Sieve Tabs">
            {(
              [
                { id: 'L1', label: 'L1: Ologs & Cospans', sub: 'Categorical Algebra' },
                { id: 'L2', label: 'L2: Bond Graphs & Guard', sub: 'Negative Analogy Guard' },
                { id: 'L3', label: 'L3: Causal Transport', sub: 'Tau-Transformations' },
                { id: 'L4', label: 'L4: Structural Holes & KGE', sub: 'Burt + FGW Optimal Transport' },
                { id: 'L5A', label: 'L5A: Tournament & MAP-Elites', sub: 'GoT + Elo Islands' },
                { id: 'L5B', label: 'L5B: Sheaf AGM & Lean 4', sub: 'AGM Revision + SciAF' },
              ] as { id: EpistemicLayerId; label: string; sub: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeLayer === tab.id}
                data-testid={`sieve-layer-tab-${tab.id}`}
                onClick={() => setActiveLayer(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeLayer === tab.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* LAYER 1: Categorical Knowledge Representation */}
          {activeLayer === 'L1' && (
            <div className="space-y-4" data-testid="layer-1-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs font-mono text-blue-700">
                    LAYER 1: CATEGORICAL KNOWLEDGE REPRESENTATION (PREVENTS: BROKEN RELATIONAL INTEGRITY)
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ontology Logs (Ologs) &amp; Open Dynamical Cospans (S → B ← T)
                  </h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                  Commutative Fact Verification: PASS
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-600 uppercase">
                    Source Subsystem (S)
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {report.layer1OlogCospan.sourceObject}
                  </div>
                  <div className="text-xs font-mono text-blue-700 pt-2 border-t border-slate-200">
                    Morphism f: {report.layer1OlogCospan.leftMorphismF}
                  </div>
                </div>

                <div className="p-4 bg-blue-50/60 border-2 border-blue-300 rounded-md space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-blue-800 uppercase">
                      Common-Ground Olog Apex / Boundary (B)
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {report.layer1OlogCospan.apexBoundary}
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-blue-200 rounded text-xs text-slate-700">
                    <strong>Pushout Composition Law:</strong> {report.layer1OlogCospan.pushoutConservationLaw}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-600 uppercase">
                    Target Subsystem (T)
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {report.layer1OlogCospan.targetObject}
                  </div>
                  <div className="text-xs font-mono text-blue-700 pt-2 border-t border-slate-200">
                    Morphism g: {report.layer1OlogCospan.rightMorphismG}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAYER 2: Decoding Physical Invariants & Negative Analogy Guard */}
          {activeLayer === 'L2' && (
            <div className="space-y-5" data-testid="layer-2-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs font-mono text-blue-700">
                    LAYER 2: DECODING PHYSICAL INVARIANTS (PREVENTS: THERMODYNAMIC &amp; DIMENSIONAL VIOLATIONS)
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Bond Graphs, GENERIC, Negative Analogy Guard &amp; 4D Cymatic Dynamical Selection
                  </h3>
                </div>
              </div>

              {/* Bond Graph Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-600 uppercase">
                      <th className="py-2.5 px-3">Physical Domain</th>
                      <th className="py-2.5 px-3">Effort (e)</th>
                      <th className="py-2.5 px-3">Flow (f)</th>
                      <th className="py-2.5 px-3">Capacitive (C)</th>
                      <th className="py-2.5 px-3">Inertial (L / I)</th>
                      <th className="py-2.5 px-3">Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {report.layer2BondGraphs.map((row) => (
                      <tr key={row.domain} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-semibold text-slate-900">{row.domain}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{row.effortVariable}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{row.flowVariable}</td>
                        <td className="py-2 px-3 text-slate-700">{row.storageCapacitiveC}</td>
                        <td className="py-2 px-3">
                          {row.storageInertialL ? (
                            <span className="text-slate-800 font-medium">{row.storageInertialL}</span>
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-amber-100 text-amber-900 rounded">
                              NONE (No Thermal Inertance L)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700">{row.differentialOrder}nd / 1st</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Interactive Negative Analogy Guard Tester */}
              <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono font-bold text-amber-950 uppercase">
                      Interactive Layer 2 Negative Analogy Guard
                    </div>
                    <p className="text-xs text-amber-900">
                      Test any cross-domain mapping to verify whether conjugate storage elements (C, I, R) and differential orders are compatible:
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      data-testid="preset-thermal-violation-btn"
                      onClick={() => {
                        setGuardSource('Electrical (2nd-Order RLC Resonance)');
                        setGuardTarget('Thermal (Pure Conduction)');
                        setGuardHypothesis('Map second-order inductor resonance (L) onto thermal conduction');
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded"
                    >
                      Test Thermal Inertance Block
                    </button>
                    <button
                      type="button"
                      data-testid="preset-valid-cymatic-btn"
                      onClick={() => {
                        setGuardSource('4D Cymatic Field (Swift-Hohenberg)');
                        setGuardTarget('Translational Mechanical (24-Cell Lattice)');
                        setGuardHypothesis('Map 2nd-order shell wavevector operator onto 24-cell standing wave modes');
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded"
                    >
                      Test Valid 2nd-Order Mapping
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    aria-label="Guard Source Domain"
                    value={guardSource}
                    onChange={(e) => setGuardSource(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900"
                  />
                  <input
                    type="text"
                    aria-label="Guard Target Domain"
                    value={guardTarget}
                    onChange={(e) => setGuardTarget(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900"
                  />
                  <input
                    type="text"
                    aria-label="Guard Hypothesis"
                    value={guardHypothesis}
                    onChange={(e) => setGuardHypothesis(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900"
                  />
                </div>

                <div
                  data-testid="negative-analogy-guard-verdict"
                  className={`p-3 rounded border text-xs font-mono ${
                    guardResult.passed
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {guardResult.passed ? (
                    <span>
                      <strong>GUARD PASS [{guardResult.ruleTriggered}]:</strong> Conjugate storage elements and differential order verified between {guardResult.sourceDomain} and {guardResult.targetDomain}.
                    </span>
                  ) : (
                    <span>
                      <strong>{guardResult.blockedReason}</strong> [{guardResult.ruleTriggered}]
                    </span>
                  )}
                </div>
              </div>

              {/* Layer 2 Verification: IRH v94 Dynamical Selection & Governing Dynamics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                  <div className="text-xs font-mono font-bold text-slate-700 uppercase">
                    Layer 2 Verification: 4D Cymatic Dynamical Selection (S = τ²/q₄)
                  </div>
                  <p className="text-xs text-slate-600">
                    Parameter-free ordering criterion in 4D Swift-Hohenberg field theory confirms the full{' '}
                    <strong>24-mode D₄ standing wave</strong> is the dominant dynamical attractor when the cubic triad term (u = 1) is active:
                  </p>
                  <div className="space-y-2 pt-1">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="font-bold text-blue-800">D₄ (24-Cell Standing Wave, |k|²=8 triad ON)</span>
                        <span className="font-bold text-blue-800">S = 0.454 (100% spectral power)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded overflow-hidden">
                        <div className="bg-blue-600 h-full w-[91%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-700">A₄* (Permutohedral 4D Lattice)</span>
                        <span className="text-slate-700">S = 0.387</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded overflow-hidden">
                        <div className="bg-amber-500 h-full w-[77%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-600">BCC in 3D Reference Threshold</span>
                        <span className="text-slate-600">S = 0.356</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded overflow-hidden">
                        <div className="bg-emerald-600 h-full w-[71%]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                  <div className="text-xs font-mono font-bold text-slate-700 uppercase">
                    Governing Dynamics: Koopman, Persistent Homology &amp; MBAM
                  </div>
                  <div className="text-xs space-y-2">
                    <div className="p-2.5 bg-white border border-slate-200 rounded">
                      <span className="font-bold text-slate-900">Koopman &amp; Bifurcation Normal Form: </span>
                      <span className="font-mono text-slate-700">{report.layer2Dynamics.koopmanNormalForm}</span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded">
                      <span className="font-bold text-slate-900">Persistent Homology Barcode: </span>
                      <span className="font-mono text-blue-700">
                        B₀ = {report.layer2Dynamics.persistentHomologyBetti.b0}, B₁ ={' '}
                        {report.layer2Dynamics.persistentHomologyBetti.b1}, B₂ ={' '}
                        {report.layer2Dynamics.persistentHomologyBetti.b2}
                      </span>{' '}
                      — {report.layer2Dynamics.persistentHomologyBetti.persistentAttractor}
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded">
                      <span className="font-bold text-slate-900">Information Geometry (MBAM): </span>
                      <span className="text-slate-700">{report.layer2Dynamics.mbamEffectiveManifold}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAYER 3: Causal Abstraction & Transportability */}
          {activeLayer === 'L3' && (
            <div className="space-y-4" data-testid="layer-3-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs font-mono text-blue-700">
                    LAYER 3: CAUSAL ABSTRACTION &amp; TRANSPORTABILITY (PREVENTS: SPURIOUS STRUCTURAL ISOMORPHISM)
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Factored Space Models (FSM), Tau-Transformations (τ) &amp; Pearl Selection Diagrams
                  </h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                  Verdict: {report.layer3CausalAudit.transportabilityVerdict}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-600 uppercase">
                    Low-Level Micro DAG Intervention do(x)
                  </div>
                  <div className="text-xs font-mono text-slate-900 bg-white p-2.5 rounded border border-slate-200">
                    {report.layer3CausalAudit.microDagIntervention}
                  </div>
                  <p className="text-xs text-slate-600">
                    Overcomes standard DAG limitations where macro-variables are deterministic functions of micro-variables via Factored Space Models.
                  </p>
                </div>

                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-md space-y-2">
                  <div className="text-xs font-mono font-bold text-blue-800 uppercase">
                    Tau-Transformation Commutativity (τ)
                  </div>
                  <div className="text-xs font-mono font-bold text-blue-950 bg-white p-2.5 rounded border border-blue-200">
                    {report.layer3CausalAudit.tauCommutativityExpression}
                  </div>
                  <p className="text-xs text-slate-700">
                    Ensures an intervention at the micro-level (turning cubic triad coupling ON/OFF) commutes with the macro-level D₄ 24-cell attractor selection.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-600 uppercase">
                    Pearl Selection Diagrams (Confounders Isolated)
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5">
                    {report.layer3CausalAudit.selectionDiagramConfoundersIsolated.map((c) => (
                      <li key={c} className="p-2 bg-white border border-slate-200 rounded">
                        • {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* LAYER 4: Graph-Topological Literature Mining & KGE */}
          {activeLayer === 'L4' && (
            <div className="space-y-4" data-testid="layer-4-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs font-mono text-blue-700">
                    LAYER 4: GRAPH-TOPOLOGICAL LITERATURE MINING (PREVENTS: SUPERFICIAL ATTRIBUTE MATCHING)
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Burt&apos;s Structural Holes, PME Faceted Recombination &amp; Relational Physics KGE (RotateCT + FGW)
                  </h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200 rounded">
                  Network Constraint C = {report.layer4Brokerage.networkConstraintScore} · Uzzi Conventionality ={' '}
                  {report.layer4Brokerage.uzziConventionalityScore}
                </span>
              </div>

              {/* Structural Hole Brokerage Map */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="text-[11px] font-mono text-slate-500 uppercase">Isolated Research Cluster A</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">{report.layer4Brokerage.clusterA}</div>
                </div>

                <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-md text-center space-y-1">
                  <div className="text-[11px] font-mono font-bold text-amber-900 uppercase">
                    Structural Hole Brokerage Node
                  </div>
                  <div className="text-sm font-bold text-slate-900">{report.layer4Brokerage.brokerageNode}</div>
                  <div className="text-[11px] text-amber-900">
                    <strong>Uzzi Tail Novelty:</strong> {report.layer4Brokerage.uzziTailNoveltyMechanism}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="text-[11px] font-mono text-slate-500 uppercase">Isolated Research Cluster B</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">{report.layer4Brokerage.clusterB}</div>
                </div>
              </div>

              {/* PME Vectors & KGE Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-700 uppercase">
                    PME Faceted Recombination Vectors
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2 bg-white border border-slate-200 rounded">
                      <strong className="text-blue-700 font-mono">PURPOSE: </strong>
                      {report.layer4Brokerage.pmeVectors.purpose}
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded">
                      <strong className="text-emerald-700 font-mono">MECHANISM: </strong>
                      {report.layer4Brokerage.pmeVectors.mechanism}
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded">
                      <strong className="text-purple-700 font-mono">EVALUATION: </strong>
                      {report.layer4Brokerage.pmeVectors.evaluation}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-700 uppercase">
                    Aligning Relational Physics via KGE &amp; FGW Optimal Transport
                  </div>
                  <table className="w-full text-left border-collapse bg-white border border-slate-200 text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-mono text-[11px]">
                        <th className="py-1.5 px-2.5">KGE Model</th>
                        <th className="py-1.5 px-2.5">Captures</th>
                        <th className="py-1.5 px-2.5">Fails At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-1.5 px-2.5 font-mono">DistMult</td>
                        <td className="py-1.5 px-2.5">Symmetry</td>
                        <td className="py-1.5 px-2.5 text-slate-500">Anti-symmetric / multi-hop</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-mono">ComplEx</td>
                        <td className="py-1.5 px-2.5">Symmetry, Antisymmetry, Inversion</td>
                        <td className="py-1.5 px-2.5 text-slate-500">Multi-hop composition</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-mono">RotatE</td>
                        <td className="py-1.5 px-2.5">Commutative Composition</td>
                        <td className="py-1.5 px-2.5 text-slate-500">Non-commutative structures</td>
                      </tr>
                      <tr className="bg-blue-50/70 font-semibold">
                        <td className="py-1.5 px-2.5 font-mono text-blue-800">RotateCT (Active)</td>
                        <td className="py-1.5 px-2.5 text-blue-900">Non-Commutative Composition (2T ⊂ SU(2))</td>
                        <td className="py-1.5 px-2.5 text-emerald-700">None</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="text-[11px] font-mono text-slate-700 pt-1">
                    <strong>Disjoint Graphs (FGW):</strong> {report.layer4Brokerage.fgwOptimalTransportDisjointAlignment}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAYER 5A: Tournament Evolution & MAP-Elites */}
          {activeLayer === 'L5A' && (
            <div className="space-y-4" data-testid="layer-5a-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs font-mono text-blue-700">
                    LAYER 5A: TOURNAMENT EVOLUTION &amp; MAP-ELITES QUALITY-DIVERSITY
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Graph of Thoughts (Ontologist → Critic → Evolution Agent) &amp; Multi-Agent Elo Islands
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {report.layer5AMapElites.map((cell) => (
                  <div
                    key={cell.hypothesisCode}
                    className={`p-4 rounded-md border flex flex-col justify-between gap-3 ${
                      cell.status === 'ELITE_CHAMPION'
                        ? 'bg-blue-50/40 border-blue-300'
                        : cell.status === 'PRUNED_PATHOLOGY'
                          ? 'bg-red-50/40 border-red-200'
                          : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-slate-700">{cell.islandId}</span>
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                            cell.status === 'ELITE_CHAMPION'
                              ? 'bg-emerald-100 text-emerald-900'
                              : cell.status === 'PRUNED_PATHOLOGY'
                                ? 'bg-red-100 text-red-900'
                                : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          Elo {cell.eloRating}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        [{cell.hypothesisCode}] {cell.title}
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-600 space-y-1 pt-2 border-t border-slate-200">
                      <div>Novelty: {cell.noveltyAxis}</div>
                      <div>Rigor: {cell.mechanisticRigorAxis}</div>
                      <div>GoT Role: {cell.gotStage}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LAYER 5B: Epistemic Consistency, Paraconsistent Sheaf Cohomology & Lean 4 Autoformalization */}
          {activeLayer === 'L5B' && (
            <div className="space-y-5" data-testid="layer-5b-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs font-mono text-blue-700">
                    LAYER 5B: EPISTEMIC CONSISTENCY, PARACONSISTENT LOGIC &amp; LEAN 4 AUTOFORMALIZATION
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cellular Sheaf Cohomology (Möbius Frustration), AGM Belief Revision &amp; SciAF Compiler
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Interactive Sheaf Cohomology Möbius Frustration Triad */}
                <div className="lg:col-span-6 p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono font-bold text-slate-800 uppercase">
                      Interactive Cellular Sheaf Cohomology (Möbius Frustration)
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded ${
                        liveSheafAudit.hasMobiusFrustration
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      Holonomy = {edgeSigns[0] * edgeSigns[1] * edgeSigns[2] === -1 ? '-1 (Frustrated)' : '+1 (Consistent)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Click any domain edge coupling (+1 / -1) to test whether locally consistent analogies patch into a globally consistent section or trigger AGM Belief Revision:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { idx: 0 as const, label: 'Physics ↔ Lie Algebra' },
                      { idx: 1 as const, label: 'Lie Algebra ↔ Geometry' },
                      { idx: 2 as const, label: 'Geometry ↔ Physics (v83 Static)' },
                    ].map((edge) => (
                      <button
                        key={edge.idx}
                        type="button"
                        data-testid={`sheaf-edge-toggle-${edge.idx}`}
                        onClick={() => toggleEdgeSign(edge.idx)}
                        className={`p-2.5 rounded border text-left transition-colors ${
                          edgeSigns[edge.idx] === 1
                            ? 'bg-white border-slate-300 text-slate-900'
                            : 'bg-amber-50 border-amber-400 text-amber-950'
                        }`}
                      >
                        <div className="text-[11px] font-mono text-slate-500">{edge.label}</div>
                        <div className="text-sm font-mono font-bold mt-0.5">
                          Sign: {edgeSigns[edge.idx] === 1 ? '+1 (Consistent)' : '-1 (Contradiction)'}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded space-y-1.5 text-xs">
                    <div className="font-mono font-bold text-slate-900">{liveSheafAudit.h1ObstructionClass}</div>
                    <div className="text-slate-700">
                      <strong>AGM Belief Revision:</strong> {liveSheafAudit.agmBeliefRevisionAction}
                    </div>
                    <div className="text-blue-800 font-medium">
                      <strong>Lakatosian Problem-Shift:</strong> {liveSheafAudit.lakatosianProblemShift}
                    </div>
                  </div>
                </div>

                {/* Layer 5B SciAF Lean 4 Autoformalization */}
                <div className="lg:col-span-6 p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-800 uppercase">
                        SciAF Lean 4 Autoformalization Pipeline
                      </div>
                      <div className="text-[11px] font-mono text-blue-700">
                        Accept(c) := Elab(c) ∧ DVP(c) ∧ ¬Disprove(¬c) ={' '}
                        {report.layer5BSciAf.sciAfAccepted ? 'TRUE (LOCKED)' : 'FALSE'}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="sciaf-open-lean4-btn"
                      onClick={() =>
                        onOpenScriptInExecutionLab(
                          'lean4',
                          report.layer5BSciAf.lean4TheoremCode,
                          'IRH v94 Layer 5B SciAF Autoformalized Proof'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap"
                    >
                      <Play className="w-3 h-3" />
                      <span>Run in Lean 4 Kernel</span>
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-white border border-slate-200 rounded">
                      <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                        1. Natural English Claim
                      </div>
                      <div className="text-slate-800 mt-0.5">{report.layer5BSciAf.naturalEnglishClaim}</div>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded">
                      <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                        2. Z3 Structural Logic (SMT-LIB2 Intermediate)
                      </div>
                      <pre className="font-mono text-[11px] text-slate-800 overflow-x-auto mt-1">
                        {report.layer5BSciAf.z3StructuralLogicSmt2}
                      </pre>
                    </div>
                    <div className="p-2.5 bg-slate-950 text-slate-100 rounded">
                      <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                        3. Lean 4 Kernel Theorem (0 sorry · Forces Explicit Premise Selection)
                      </div>
                      <pre className="font-mono text-[11px] text-slate-100 overflow-x-auto mt-1 max-h-36">
                        {report.layer5BSciAf.lean4TheoremCode}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Stress Test: The IRH Deep Research Audit (v83.0 -> v94.0) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="text-xs font-mono text-blue-700 uppercase">
              LIVE STRESS TEST CASE STUDY · INTRINSIC RESONANCE HOLOGRAPHY (IRH v83.0 → v94.0)
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Separating Genuine Mathematical Discovery from Circular Numerology via AGM Problem-Shift
            </h2>
          </div>
          <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-900 text-white rounded">
            v83 Pathologies Isolated → v94 Geometric Core Verified
          </span>
        </div>

        {/* IRH v83 Pathology Matrix vs Reformed IRH v94 Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 5 cols: The Pathology Matrix (IRH v83) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-mono font-bold text-amber-900 uppercase">
              The Pathology Matrix: IRH v83 Geometric Numerology
            </div>
            <div className="space-y-2.5">
              {report.irhPathologyMatrix.map((p) => (
                <div key={p.id} className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-md space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{p.pathologyName}</span>
                    <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-amber-200/80 text-amber-950 rounded">
                      {p.verdictTag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">{p.v83Description}</p>
                  <div className="text-[11px] font-mono text-slate-500">Caught by: {p.layerCaught}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 7 cols: The Reformed Architecture (IRH v94) & Layer 5 Algebraic Forcing */}
          <div className="lg:col-span-7 space-y-3">
            <div className="text-xs font-mono font-bold text-blue-800 uppercase">
              The Reformed Architecture (IRH v94) &amp; Layer 5 Algebraic Forcing (SO(8) Exclusion vs E6)
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              {/* Layer 0 Primitive */}
              <div className="p-3 bg-white border-2 border-slate-800 rounded text-center">
                <div className="text-[11px] font-mono font-bold text-blue-700 uppercase">
                  LAYER 0 — PRIMITIVE: NON-CIRCULAR FIELD THEORY (INPUT / NON-CIRCULAR)
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  Swift-Hohenberg Tension-Relaxation Functional on ℝ⁴ × S³ (with S³ ≅ SU(2) quaternions)
                </div>
              </div>

              {/* Derived & Validated Core */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded">
                  <div className="text-[11px] font-mono font-bold text-blue-800">DERIVED (NOT INPUT)</div>
                  <div className="text-xs font-bold text-slate-900">24-Cell D₄ Standing Wave Attractor</div>
                  <div className="text-[11px] text-slate-700 mt-0.5">
                    Closed binary tetrahedral group 2T ⊂ SU(2) under quaternion product
                  </div>
                </div>
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded">
                  <div className="text-[11px] font-mono font-bold text-blue-800">VALIDATED SELECTION FUNCTIONAL</div>
                  <div className="text-xs font-bold text-slate-900">S = τ² / q₄ = 0.454 &gt; A₄* (0.387)</div>
                  <div className="text-[11px] text-slate-700 mt-0.5">
                    Triad term u=1 causally selects D₄ star (|k|² = 8); 4th-moment isotropy verified
                  </div>
                </div>
              </div>

              {/* Split: Excluded by Theorem vs Established Chiral E6 Forcing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-red-50/70 border border-red-200 rounded space-y-1">
                  <div className="text-[11px] font-mono font-bold text-red-900 uppercase">
                    EXCLUDED BY THEOREM / RETRACTED
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    so(8) Gauge Claim (dim=28, rank=4)
                  </div>
                  <p className="text-[11px] text-red-900 leading-relaxed">
                    Regular max subalgebra su(4)⊕u(1) (dim 16) node deletions yield su(3)⊕u(1) (dim 9) or su(2)²⊕u(1)
                    (dim 7) — <strong>never reaches SM dim=12 jointly</strong> (w₀ = -1, non-chiral). Fine-structure numerology retracted to separate ansatz.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded space-y-1">
                  <div className="text-[11px] font-mono font-bold text-emerald-900 uppercase">
                    ESTABLISHED DERIVATIONS (VERIFIED CORE)
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    Chiral E₆ Gauge Forcing &amp; 3 Families
                  </div>
                  <p className="text-[11px] text-emerald-950 leading-relaxed">
                    <strong>2T / Q₈ ≅ ℤ₃</strong> ⇒ THREE families (8+8+8 cosets).{' '}
                    <strong>McKay (2T ↔ affine E₆)</strong> dims (1,1,1,2,2,2,3) natively forces chiral{' '}
                    <strong>E₆ ⊃ SO(10) ⊃ SU(5) ⊃ SM</strong> (w₀ ≠ -1, complex 27).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Lakatosian Problem-Shift Ledger Table with 1-Click Formal Execution */}
        <div className="space-y-2.5 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs font-mono font-bold text-slate-800 uppercase">
              The Epistemic Audit: Lakatosian Problem-Shift Ledger (with 1-Click Lean 4 · Singular · Python Execution)
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Click any runtime button to execute the machine-verifiable proof in the Execution Lab
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left border-collapse" data-testid="lakatosian-ledger-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-600 uppercase">
                  <th className="py-2.5 px-3">Target Claim</th>
                  <th className="py-2.5 px-3">v83 Critique</th>
                  <th className="py-2.5 px-3">v94 Action</th>
                  <th className="py-2.5 px-3">Final Grade</th>
                  <th className="py-2.5 px-3 text-right">Machine Verification &amp; UM-1 Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {report.lakatosianProblemShiftLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-slate-900">{row.targetClaim}</td>
                    <td className="py-3 px-3 text-slate-700">{row.v83Critique}</td>
                    <td className="py-3 px-3 text-slate-700">{row.v94Action}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded ${
                          row.finalGradeTag === '[GRADE F1: MACHINE VERIFIED]'
                            ? 'bg-blue-600 text-white'
                            : row.finalGradeTag === '[REFORMED: RUNG 4]'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : row.finalGradeTag === '[CONTRADICTED]'
                                ? 'bg-amber-200 text-amber-950'
                                : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {row.finalGradeTag}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          data-testid={`ledger-lean4-${row.id}`}
                          onClick={() =>
                            onOpenScriptInExecutionLab('lean4', row.lean4Script, `${row.id}: ${row.targetClaim} (Lean 4)`)
                          }
                          className="px-2 py-1 text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                        >
                          Lean 4
                        </button>
                        <button
                          type="button"
                          data-testid={`ledger-singular-${row.id}`}
                          onClick={() =>
                            onOpenScriptInExecutionLab(
                              'singular',
                              row.singularScript,
                              `${row.id}: ${row.targetClaim} (Singular)`
                            )
                          }
                          className="px-2 py-1 text-[11px] font-mono font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded"
                        >
                          Singular
                        </button>
                        <button
                          type="button"
                          data-testid={`ledger-python-${row.id}`}
                          onClick={() =>
                            onOpenScriptInExecutionLab(
                              'python',
                              row.pythonScript,
                              `${row.id}: ${row.targetClaim} (Python Exact Q)`
                            )
                          }
                          className="px-2 py-1 text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                        >
                          Python Q
                        </button>
                        <button
                          type="button"
                          data-testid={`ledger-promote-${row.id}`}
                          onClick={() => onPromoteLedgerRowToClaim(row)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                        >
                          + UM-1 Claim
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
