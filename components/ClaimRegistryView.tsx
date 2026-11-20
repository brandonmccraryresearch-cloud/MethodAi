'use client';

import React, { useState } from 'react';
import {
  computeUM1Grade,
  evaluatePreflightGates,
  validateTierTransition,
  generateA1HypothesisMarkdown,
  generateA2VerdictMarkdown,
  PROBLEM_LIFECYCLE_ORDER,
  RESEARCH_LENSES,
  type ClaimExperimentRecord,
  type ProblemLifecycleState,
  type TrackType,
  type TierType,
  type IndependenceLevel,
  type RecordLabel,
  type PostulationKind,
  type NoveltyBudget,
  type PredictionClass,
  type VerificationRung,
} from '@/lib/um1-engine';
import type { AutoFillExtractionPayload } from '@/app/api/coscientist/ingest/route';
import SourceIngestionPanel, { type ConnectedSourceRecord } from './SourceIngestionPanel';
import { Plus, Check, Copy, FilePlus2, Sparkles } from 'lucide-react';

interface ClaimRegistryViewProps {
  claims: ClaimExperimentRecord[];
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  onAddClaim: (newClaim: ClaimExperimentRecord) => void;
  onUpdateLifecycle: (claimId: string, nextState: ProblemLifecycleState) => void;
  onChangeTier: (claimId: string, newTier: TierType, justification: string) => void;
  defaultOpenModal?: boolean;
  prefillExtraction?: AutoFillExtractionPayload | null;
  connectedSources?: ConnectedSourceRecord[];
  onSourceIngested?: (
    record: ConnectedSourceRecord,
    mode: 'auto-register-all' | 'prefill-form-only'
  ) => void;
}

export default function ClaimRegistryView({
  claims,
  selectedClaimId,
  onSelectClaim,
  onAddClaim,
  onUpdateLifecycle,
  onChangeTier,
  defaultOpenModal = false,
  prefillExtraction = null,
  connectedSources = [],
  onSourceIngested,
}: ClaimRegistryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'E' | 'F'>('ALL');
  const [artifactTab, setArtifactTab] = useState<'overview' | 'a1' | 'a2'>('overview');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(defaultOpenModal);

  // Tier Management State (UM-1.1)
  const [targetTier, setTargetTier] = useState<TierType>('Standard');
  const [tierJustification, setTierJustification] = useState('');
  const [tierMessage, setTierMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const d = prefillExtraction?.claimDraft;

  // New Claim Form State (Initializes from prefillExtraction if provided, otherwise clean empty defaults)
  const [formClaimId, setFormClaimId] = useState(`CLM-${101 + claims.length}`);
  const [formExpId, setFormExpId] = useState(`EXP-${String(1 + claims.length).padStart(3, '0')}`);
  const [formTitle, setFormTitle] = useState(d?.title || '');
  const [formDomain, setFormDomain] = useState(d?.domain || '');
  const [formTrack, setFormTrack] = useState<TrackType>(d?.track || 'F');
  const [formTier, setFormTier] = useState<TierType>(d?.tier || 'Standard');
  const [formLabel, setFormLabel] = useState<RecordLabel>(d?.recordLabel || '[C]');
  const [formIndependence, setFormIndependence] = useState<IndependenceLevel>(
    d?.independence || 'I1'
  );
  const [formIndependenceBoundary, setFormIndependenceBoundary] = useState(
    d?.independenceBoundary || ''
  );
  const [formPostulation, setFormPostulation] = useState<PostulationKind>('constraint-led');
  const [formNovelty, setFormNovelty] = useState<NoveltyBudget>(
    d?.noveltyBudget || 'independently_motivated'
  );
  const [formPredictionClass, setFormPredictionClass] = useState<PredictionClass>(
    d?.predictionClass || 'prediction'
  );
  const [formRung, setFormRung] = useState<VerificationRung>(d?.verificationRung ?? 0);
  const [formTarget, setFormTarget] = useState(d?.target || '');
  const [formSource, setFormSource] = useState(d?.source || '');
  const [formUncertainty, setFormUncertainty] = useState(d?.uncertainty || '');
  const [formPriorLiterature, setFormPriorLiterature] = useState(d?.priorLiterature || '');
  const [formDataSplits, setFormDataSplits] = useState(d?.dataSplits || '');
  const [formReplicationPlan, setFormReplicationPlan] = useState(d?.replicationPlan || '');
  const [formQuestion, setFormQuestion] = useState(d?.question || '');
  const [formMotivation, setFormMotivation] = useState(d?.motivation || '');
  const [formFalsifiablePrediction, setFormFalsifiablePrediction] = useState(
    d?.falsifiablePrediction || ''
  );
  const [formMethod, setFormMethod] = useState(d?.method || '');
  const [formSuccessFailureCriteria, setFormSuccessFailureCriteria] = useState(
    d?.successFailureCriteria || ''
  );
  const [formPassProves, setFormPassProves] = useState(d?.oneSidednessPass || '');
  const [formFailProves, setFormFailProves] = useState(d?.oneSidednessFail || '');
  const [formComputeBudget, setFormComputeBudget] = useState(d?.computeBudget || '');
  const [formKillCriterion, setFormKillCriterion] = useState(d?.killCriterion || '');
  const [formInvariantNote, setFormInvariantNote] = useState(d?.invariantFirstNote || '');
  const [formSpendCap, setFormSpendCap] = useState<number>(d?.spendCapUsd ?? 50);
  const [formPremises, setFormPremises] = useState<string[]>([]);
  const [formLenses, setFormLenses] = useState<string[]>(['L0-spine', 'L1', 'L2']);
  const [formHowWrong, setFormHowWrong] = useState(d?.howCouldThisBeWrong || '');
  const [pendingExtraction, setPendingExtraction] = useState<AutoFillExtractionPayload | null>(
    prefillExtraction
  );
  const [formError, setFormError] = useState<string | null>(null);

  const applyExtractionToForm = (ext: AutoFillExtractionPayload) => {
    const cd = ext.claimDraft;
    setFormTitle(cd.title);
    setFormDomain(cd.domain);
    setFormTrack(cd.track);
    setFormTier(cd.tier);
    setFormLabel(cd.recordLabel);
    setFormIndependence(cd.independence);
    setFormIndependenceBoundary(cd.independenceBoundary);
    setFormNovelty(cd.noveltyBudget);
    setFormPredictionClass(cd.predictionClass);
    setFormRung(cd.verificationRung);
    setFormTarget(cd.target);
    setFormSource(cd.source);
    setFormUncertainty(cd.uncertainty);
    setFormPriorLiterature(cd.priorLiterature);
    setFormDataSplits(cd.dataSplits);
    setFormReplicationPlan(cd.replicationPlan);
    setFormQuestion(cd.question);
    setFormMotivation(cd.motivation);
    setFormFalsifiablePrediction(cd.falsifiablePrediction);
    setFormMethod(cd.method);
    setFormSuccessFailureCriteria(cd.successFailureCriteria);
    setFormPassProves(cd.oneSidednessPass);
    setFormFailProves(cd.oneSidednessFail);
    setFormComputeBudget(cd.computeBudget);
    setFormKillCriterion(cd.killCriterion);
    setFormInvariantNote(cd.invariantFirstNote);
    setFormSpendCap(cd.spendCapUsd);
    setFormHowWrong(cd.howCouldThisBeWrong);
    setPendingExtraction(ext);
    setFormError(null);
  };

  const filteredClaims = claims.filter((c) => {
    const matchesTrack = trackFilter === 'ALL' || c.gradingInput.track === trackFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.id.toLowerCase().includes(q) ||
      (c.expId && c.expId.toLowerCase().includes(q)) ||
      c.title.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q) ||
      c.target.toLowerCase().includes(q);
    return matchesTrack && matchesQuery;
  });

  const selectedClaim = claims.find((c) => c.id === selectedClaimId) || claims[0];
  const selectedGrade = selectedClaim ? computeUM1Grade(selectedClaim.gradingInput) : null;
  const selectedPreflight = selectedClaim ? evaluatePreflightGates(selectedClaim.preflight) : null;

  const handleSelectClaimInternal = (id: string) => {
    onSelectClaim(id);
    const found = claims.find((c) => c.id === id);
    if (found) {
      setTargetTier(found.gradingInput.tier);
      setTierJustification('');
      setTierMessage(null);
    }
  };

  const handleTierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    const check = validateTierTransition(
      selectedClaim.gradingInput.tier,
      targetTier,
      tierJustification
    );
    if (!check.valid) {
      setTierMessage({ type: 'error', text: check.error || 'Invalid tier transition.' });
      return;
    }
    if (check.direction === 'unchanged') {
      setTierMessage({
        type: 'error',
        text: `Tier is already set to ${targetTier}. Select a different tier to update.`,
      });
      return;
    }
    onChangeTier(
      selectedClaim.id,
      targetTier,
      tierJustification.trim() ||
        `Raised tier from ${selectedClaim.gradingInput.tier} to ${targetTier} (UM-1.1).`
    );
    setTierJustification('');
    setTierMessage({
      type: 'success',
      text: `Tier ${check.direction} from ${selectedClaim.gradingInput.tier} to ${targetTier} and logged in claim record.`,
    });
  };

  const handleCopy = (text: string, tag: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1800);
  };

  const handleToggleLens = (lensId: string) => {
    if (lensId === 'L0-spine') return;
    setFormLenses((prev) =>
      prev.includes(lensId) ? prev.filter((l) => l !== lensId) : [...prev, lensId]
    );
  };

  const handleTogglePremise = (id: string) => {
    setFormPremises((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const openNewClaimModal = () => {
    setFormClaimId(`CLM-${101 + claims.length}`);
    setFormExpId(`EXP-${String(1 + claims.length).padStart(3, '0')}`);
    setFormError(null);
    setShowNewModal(true);
  };

  const handleCreateClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formClaimId.trim() ||
      !formTitle.trim() ||
      !formTarget.trim() ||
      !formSource.trim() ||
      !formQuestion.trim() ||
      !formMotivation.trim() ||
      !formFalsifiablePrediction.trim() ||
      !formMethod.trim() ||
      !formSuccessFailureCriteria.trim()
    ) {
      setFormError(
        'UM-1.1 / UM-1.2 Incomplete Record: Claim ID, Title, Target, Source, Hypothesis Question, Motivation, Falsifiable Prediction, Method, and Success/Failure Criteria are all required.'
      );
      return;
    }
    if (!formPassProves.trim() || !formFailProves.trim()) {
      setFormError(
        'UM-1.4(a) violation: You must state one-sidedness (both what PASS proves and what FAIL proves).'
      );
      return;
    }
    if (!formComputeBudget.trim() || !formKillCriterion.trim()) {
      setFormError(
        'UM-1.4(c) violation: Compute budget and explicit kill criterion are required.'
      );
      return;
    }
    if (!formInvariantNote.trim()) {
      setFormError(
        'UM-1.4(d) violation: You must include an invariant-first note before compute.'
      );
      return;
    }
    if (formSpendCap <= 0 || formSpendCap > 300) {
      setFormError(
        'UM-2.5(P7) violation: Spend cap must be between $1 and $300/service/month.'
      );
      return;
    }
    if (formLenses.length < 3) {
      setFormError(
        'UM-2.6 violation: Declare the Exclusion/Obstruction spine plus at least 2 research lenses.'
      );
      return;
    }

    const extractedPremises =
      pendingExtraction?.premiseItems.map((p, idx) => ({
        id: `DEP-${formClaimId.trim()}-${idx + 1}`,
        kind: p.kind,
        statement: p.statement,
        sourceCitation: p.sourceCitation,
        hasSupportingVerdict: p.hasSupportingVerdict,
        independentlyRederived: p.independentlyRederived,
        isLeafTranscription: p.isLeafTranscription,
      })) || [];

    const endsInUnrederived = extractedPremises.some(
      (p) => p.isLeafTranscription && !p.independentlyRederived
    );

    const newClaim: ClaimExperimentRecord = {
      id: formClaimId.trim(),
      expId: formExpId.trim() || undefined,
      title: formTitle.trim(),
      domain: formDomain.trim() || 'General Research',
      lifecycleState: 'scoped',
      target: formTarget.trim(),
      source: formSource.trim(),
      uncertainty: formUncertainty.trim() || 'Declared in measurement specification',
      priorLiterature: formPriorLiterature.trim() || formSource.trim(),
      dataSplits: formDataSplits.trim() || 'Declared in method specification',
      replicationPlan: formReplicationPlan.trim() || formMethod.trim(),
      independenceBoundary:
        formIndependenceBoundary.trim() || `Independence level ${formIndependence}`,
      noveltyBudget: formNovelty,
      predictionClass: formPredictionClass,
      question: formQuestion.trim(),
      motivation: formMotivation.trim(),
      falsifiablePrediction: formFalsifiablePrediction.trim(),
      method: formMethod.trim(),
      successFailureCriteria: formSuccessFailureCriteria.trim(),
      oneSidednessPass: formPassProves.trim(),
      oneSidednessFail: formFailProves.trim(),
      premiseDependencies: formPremises,
      dependencyLedgerItems: extractedPremises,
      computeBudget: formComputeBudget.trim(),
      killCriterion: formKillCriterion.trim(),
      computeBudgetAndKill: `${formComputeBudget.trim()}; ${formKillCriterion.trim()}`,
      invariantFirstNote: formInvariantNote.trim(),
      lensesDeclared: formLenses,
      verdictOutcome: 'inconclusive',
      howCouldThisBeWrong:
        formHowWrong.trim() ||
        'Initial registration; stage-specific failure modes tracked along Rung 0–5.',
      rungAudits: [0, 1, 2, 3, 4, 5].map((r) => ({
        rung: r as VerificationRung,
        completed: r <= formRung,
        howCouldThisBeWrongAtStage:
          r === 0
            ? pendingExtraction?.rungStageNotes.rung0Statement || formHowWrong.trim()
            : r === 1
              ? pendingExtraction?.rungStageNotes.rung1Source || ''
              : r === 2
                ? pendingExtraction?.rungStageNotes.rung2Machine || ''
                : '',
        evidenceArtifactSummary: r <= formRung ? `Registered at Rung ${r}` : '',
        updatedAt: new Date().toISOString(),
      })),
      tierHistory: [
        {
          id: `TLOG-${formClaimId.trim()}-INIT`,
          claimId: formClaimId.trim(),
          previousTier: formTier,
          newTier: formTier,
          direction: 'raised',
          justification: `Initial tier registration at ${formTier} (UM-1.1).`,
          timestamp: new Date().toISOString(),
        },
      ],
      sha256Manifest: 'pending-artifact-manifest',
      preflight: {
        P1_sourceComplete: Boolean(formSource.trim()),
        P2_smokeTest: false,
        P3_premiseDependenciesChecked: !endsInUnrederived,
        P4_oneSidednessStated: true,
        P5_invariantFirstChecked: true,
        P6_computeBudgetDeclared: true,
        P7_spendCapNamed: true,
        spendCapUsd: formSpendCap,
      },
      gradingInput: {
        track: formTrack,
        tier: formTier,
        recordLabel: formLabel,
        independence: formIndependence,
        hasDiscriminatingComparison: false,
        postulationKind: formPostulation,
        postulationValidatedByNewIndependentTests: false,
        unreportedParameterSelection: false,
        ledgerEndsInUnrederivedTranscription: endsInUnrederived,
        overrideStatus: 'NONE',
        supportInRecord: 'C',
        verificationRung: formRung,
        independentRoutesCount: 1,
        kernelCheckedOrClosedLedger: false,
        exactArithmeticCertified: false,
        toolVerdicts: [],
        externalVerification: {
          executed: false,
          verifierAgent: 'None',
          auditedLocallyClaimByClaim: false,
          supportedGrade: 'D',
          auditNotes: '',
        },
      },
      createdAt: new Date().toISOString(),
    };

    onAddClaim(newClaim);
    setShowNewModal(false);
    setFormError(null);
    setPendingExtraction(null);
  };

  const getGradeTextStyle = (grade: string) => {
    if (grade === 'A' || grade === 'F1') return 'text-emerald-700 font-semibold';
    if (grade === 'B' || grade === 'F2') return 'text-blue-700 font-semibold';
    if (grade === 'C' || grade === 'F3') return 'text-amber-700 font-semibold';
    if (grade === 'CONTRADICTED' || grade === 'INCOMPLETE-EVIDENCE')
      return 'text-rose-700 font-semibold';
    return 'text-slate-700 font-semibold';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Claims &amp; Frozen EXP-NNN Hypotheses
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            UM-1 Skill v3.1 · Register Track F (deductive) or Track E (empirical) claims and manage
            tier ceilings.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewClaimModal}
          data-testid="open-register-claim-modal"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Claim / EXP Hypothesis
        </button>
      </div>

      {/* Empty State when no claims exist */}
      {claims.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-2xl mx-auto my-6">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <FilePlus2 className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            No Claims or EXP Hypotheses Registered Yet
          </h2>
          <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
            Register your first deductive (Track F) or empirical (Track E) claim record manually, or
            auto-fill it from a GitHub repository, arXiv paper link, PDF, or text/LaTeX file.
          </p>
          <button
            type="button"
            onClick={openNewClaimModal}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register First Claim / EXP
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Claims List */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Registered Claims ({filteredClaims.length})
                </span>
                <div className="flex items-center gap-1">
                  {(['ALL', 'F', 'E'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTrackFilter(t)}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded ${
                        trackFilter === t
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      {t === 'ALL' ? 'All' : `Track ${t}`}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter claims..."
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="divide-y divide-slate-200">
              {filteredClaims.map((claim) => {
                const gradeObj = computeUM1Grade(claim.gradingInput);
                const isSelected = claim.id === selectedClaim?.id;
                return (
                  <button
                    key={claim.id}
                    type="button"
                    onClick={() => handleSelectClaimInternal(claim.id)}
                    className={`w-full text-left p-3.5 transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-900">
                        {claim.id} · {claim.expId || `Track ${claim.gradingInput.track}`}
                      </span>
                      <span
                        className={`text-xs font-mono ${getGradeTextStyle(gradeObj.finalGrade)}`}
                      >
                        {gradeObj.finalGrade}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 mt-1 line-clamp-1">
                      {claim.title}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-500 mt-1.5">
                      Rung {claim.gradingInput.verificationRung}
                      {gradeObj.rung4Kind ? ` (${gradeObj.rung4Kind})` : ''} ·{' '}
                      {claim.gradingInput.independence} · Tier {claim.gradingInput.tier}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Claim Details */}
          {selectedClaim && selectedGrade && selectedPreflight && (
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-mono text-slate-600">
                    <span className="font-bold text-slate-900">{selectedClaim.id}</span> ·{' '}
                    <span>{selectedClaim.expId || 'Deductive Claim'}</span> ·{' '}
                    <span>{selectedClaim.gradingInput.recordLabel}</span> ·{' '}
                    <span>{selectedClaim.domain}</span>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
                    {(
                      [
                        { id: 'overview', label: 'Overview' },
                        { id: 'a1', label: 'A1 hypothesis.md' },
                        { id: 'a2', label: 'A2 verdict.md' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setArtifactTab(tab.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                          artifactTab === tab.id
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900 mt-2">{selectedClaim.title}</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-slate-200">
                  <div>
                    <div className="text-[11px] text-slate-500">Computable Grade</div>
                    <div
                      className={`text-lg font-mono font-bold mt-0.5 ${getGradeTextStyle(
                        selectedGrade.finalGrade
                      )}`}
                    >
                      {selectedGrade.finalGrade}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Verification Rung</div>
                    <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                      Rung {selectedClaim.gradingInput.verificationRung}
                      {selectedGrade.rung4Kind ? ` (${selectedGrade.rung4Kind})` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Independence &amp; Tier</div>
                    <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                      {selectedClaim.gradingInput.independence} · {selectedClaim.gradingInput.tier}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Preflight &amp; Spend Cap</div>
                    <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                      {selectedPreflight.passedCount}/7 · ${selectedClaim.preflight.spendCapUsd}
                    </div>
                  </div>
                </div>
              </div>

              {artifactTab === 'overview' && (
                <div className="p-5 space-y-5">
                  {/* UM-1.1 Tier Governance */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">
                          UM-1.1 Tier Governance (Lite max D · Standard max B · Full max A/F1)
                        </h3>
                        <p className="text-xs text-slate-600">
                          Raise tier freely; lowering a tier requires a logged justification.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-800">
                        Active: {selectedClaim.gradingInput.tier}
                      </span>
                    </div>

                    <form
                      onSubmit={handleTierSubmit}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                    >
                      <div className="sm:col-span-3">
                        <label
                          htmlFor="tier-select-control"
                          className="block text-[11px] font-medium text-slate-700"
                        >
                          Target Tier
                        </label>
                        <select
                          id="tier-select-control"
                          value={targetTier}
                          onChange={(e) => setTargetTier(e.target.value as TierType)}
                          className="mt-1 w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                        >
                          <option value="Lite">Lite (Max D)</option>
                          <option value="Standard">Standard (Max B)</option>
                          <option value="Full">Full (Max A / F1)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-6">
                        <label
                          htmlFor="tier-justification-input"
                          className="block text-[11px] font-medium text-slate-700"
                        >
                          Justification (Required when lowering)
                        </label>
                        <input
                          id="tier-justification-input"
                          type="text"
                          value={tierJustification}
                          onChange={(e) => setTierJustification(e.target.value)}
                          placeholder="Enter reason for tier change..."
                          className="mt-1 w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <button
                          type="submit"
                          className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                        >
                          Update Tier
                        </button>
                      </div>
                    </form>

                    {tierMessage && (
                      <div
                        className={`p-2 rounded text-xs font-medium ${
                          tierMessage.type === 'error'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {tierMessage.text}
                      </div>
                    )}

                    {selectedClaim.tierHistory.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        {selectedClaim.tierHistory.map((th) => (
                          <div key={th.id} className="text-[11px] text-slate-600 font-mono">
                            [{th.direction.toUpperCase()}] {th.previousTier} &rarr; {th.newTier} ·{' '}
                            {th.justification}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lifecycle Stepper */}
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1.5">
                      UM-1.5 Problem Lifecycle State
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PROBLEM_LIFECYCLE_ORDER.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => onUpdateLifecycle(selectedClaim.id, st)}
                          className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                            selectedClaim.lifecycleState === st
                              ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Core Specification Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
                    <div>
                      <div className="font-semibold text-slate-500">Target &amp; Primary Source</div>
                      <p className="text-slate-900 mt-1">{selectedClaim.target}</p>
                      <p className="text-slate-600 mt-1">Source: {selectedClaim.source}</p>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-500">
                        Hypothesis &amp; Falsifiable Prediction
                      </div>
                      <p className="text-slate-900 mt-1">{selectedClaim.question}</p>
                      <p className="text-slate-600 mt-1">
                        Prediction: {selectedClaim.falsifiablePrediction}
                      </p>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-500">UM-1.4(a) One-Sidedness</div>
                      <p className="text-slate-800 mt-1">
                        <strong className="text-emerald-700">PASS:</strong>{' '}
                        {selectedClaim.oneSidednessPass}
                      </p>
                      <p className="text-slate-800 mt-1">
                        <strong className="text-rose-700">FAIL:</strong>{' '}
                        {selectedClaim.oneSidednessFail}
                      </p>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-500">
                        Invariant-First &amp; Compute Kill Gate
                      </div>
                      <p className="text-slate-800 mt-1">{selectedClaim.invariantFirstNote}</p>
                      <p className="font-mono text-slate-600 mt-1">
                        Budget: {selectedClaim.computeBudget} · Kill: {selectedClaim.killCriterion}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {artifactTab === 'a1' && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-slate-600">
                      experiments/{selectedClaim.expId || selectedClaim.id}/hypothesis.md
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(generateA1HypothesisMarkdown(selectedClaim), 'a1')
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                    >
                      {copiedTag === 'a1' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedTag === 'a1' ? 'Copied' : 'Copy Markdown'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-md overflow-x-auto leading-relaxed">
                    {generateA1HypothesisMarkdown(selectedClaim)}
                  </pre>
                </div>
              )}

              {artifactTab === 'a2' && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-slate-600">
                      experiments/{selectedClaim.expId || selectedClaim.id}/verdict.md
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(generateA2VerdictMarkdown(selectedClaim), 'a2')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                    >
                      {copiedTag === 'a2' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedTag === 'a2' ? 'Copied' : 'Copy Markdown'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-md overflow-x-auto leading-relaxed">
                    {generateA2VerdictMarkdown(selectedClaim)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Register New Claim / Freeze EXP-NNN Hypothesis */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-claim-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full p-6 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 id="register-claim-modal-title" className="text-base font-bold text-slate-900">
                Register UM-1.1 Claim Record &amp; Freeze UM-1.2 EXP-NNN Hypothesis
              </h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            {/* Embedded Compact Source Connector & Auto-Fill Bar */}
            <div className="mt-4 p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Auto-Fill Slots from GitHub Repo, arXiv Paper, PDF, or Text File (.txt, .md, .tex)</span>
              </div>
              <SourceIngestionPanel
                compact
                connectedSources={connectedSources}
                onSourceIngested={(rec, mode) => {
                  applyExtractionToForm(rec.extraction);
                  onSourceIngested?.(rec, mode);
                }}
              />
            </div>

            <form onSubmit={handleCreateClaim} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label
                    htmlFor="new-claim-id"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Claim ID
                  </label>
                  <input
                    id="new-claim-id"
                    type="text"
                    value={formClaimId}
                    onChange={(e) => setFormClaimId(e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-claim-expid"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Frozen EXP ID
                  </label>
                  <input
                    id="new-claim-expid"
                    type="text"
                    value={formExpId}
                    onChange={(e) => setFormExpId(e.target.value)}
                    placeholder="EXP-001"
                    className="mt-1 w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="new-claim-title"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Claim / Experiment Title
                  </label>
                  <input
                    id="new-claim-title"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Enter concise claim or hypothesis title"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label
                    htmlFor="new-claim-track"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Track
                  </label>
                  <select
                    id="new-claim-track"
                    value={formTrack}
                    onChange={(e) => setFormTrack(e.target.value as TrackType)}
                    className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value="F">Track F (Deductive)</option>
                    <option value="E">Track E (Empirical)</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="new-claim-tier"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Tier Ceiling
                  </label>
                  <select
                    id="new-claim-tier"
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value as TierType)}
                    className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Lite">Lite (Max D)</option>
                    <option value="Standard">Standard (Max B)</option>
                    <option value="Full">Full (Max A / F1)</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="new-claim-novelty"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Novelty Budget
                  </label>
                  <select
                    id="new-claim-novelty"
                    value={formNovelty}
                    onChange={(e) => setFormNovelty(e.target.value as NoveltyBudget)}
                    className="mt-1 w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  >
                    <option value="independently_motivated">independently_motivated</option>
                    <option value="weakly_motivated">weakly_motivated</option>
                    <option value="introduced_to_fit">introduced_to_fit</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="new-claim-ind"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Independence
                  </label>
                  <select
                    id="new-claim-ind"
                    value={formIndependence}
                    onChange={(e) => setFormIndependence(e.target.value as IndependenceLevel)}
                    className="mt-1 w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  >
                    <option value="I0">I0 (Same data)</option>
                    <option value="I1">I1 (Shared pipeline)</option>
                    <option value="I2">I2 (Frozen held-out)</option>
                    <option value="I3">I3 (Independent route)</option>
                    <option value="I4">I4 (Full replication)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-claim-target"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Target Measurement &amp; Units
                  </label>
                  <input
                    id="new-claim-target"
                    type="text"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    placeholder="Observable or mathematical target with units/domain"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-claim-source"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Primary Source Citation
                  </label>
                  <input
                    id="new-claim-source"
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    placeholder="Paper DOI, arXiv link, GitHub repo, or formal library"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="new-claim-question"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Hypothesis Text / Question
                  </label>
                  <input
                    id="new-claim-question"
                    type="text"
                    value={formQuestion}
                    onChange={(e) => setFormQuestion(e.target.value)}
                    placeholder="Core research question"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-claim-motivation"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Motivation
                  </label>
                  <input
                    id="new-claim-motivation"
                    type="text"
                    value={formMotivation}
                    onChange={(e) => setFormMotivation(e.target.value)}
                    placeholder="Why this test is required now"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-claim-prediction"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Falsifiable Prediction
                  </label>
                  <input
                    id="new-claim-prediction"
                    type="text"
                    value={formFalsifiablePrediction}
                    onChange={(e) => setFormFalsifiablePrediction(e.target.value)}
                    placeholder="Quantitative or formal predicted outcome"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-claim-method"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Method Specification
                  </label>
                  <input
                    id="new-claim-method"
                    type="text"
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    placeholder="Experimental or formal proof protocol"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-claim-criteria"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Success / Failure Criteria
                  </label>
                  <input
                    id="new-claim-criteria"
                    type="text"
                    value={formSuccessFailureCriteria}
                    onChange={(e) => setFormSuccessFailureCriteria(e.target.value)}
                    placeholder="Exact threshold separating PASS from FAIL"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-claim-pass"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    One-Sidedness: What PASS Proves
                  </label>
                  <input
                    id="new-claim-pass"
                    type="text"
                    value={formPassProves}
                    onChange={(e) => setFormPassProves(e.target.value)}
                    placeholder="What survival of the test establishes"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-claim-fail"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    One-Sidedness: What FAIL Proves
                  </label>
                  <input
                    id="new-claim-fail"
                    type="text"
                    value={formFailProves}
                    onChange={(e) => setFormFailProves(e.target.value)}
                    placeholder="What falsification refutes"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label
                    htmlFor="new-claim-budget"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Compute Budget
                  </label>
                  <input
                    id="new-claim-budget"
                    type="text"
                    value={formComputeBudget}
                    onChange={(e) => setFormComputeBudget(e.target.value)}
                    placeholder="e.g., 2 GPU hours max"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-claim-kill"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Kill Criterion
                  </label>
                  <input
                    id="new-claim-kill"
                    type="text"
                    value={formKillCriterion}
                    onChange={(e) => setFormKillCriterion(e.target.value)}
                    placeholder="When to abort run"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-claim-invariant"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Invariant-First Note
                  </label>
                  <input
                    id="new-claim-invariant"
                    type="text"
                    value={formInvariantNote}
                    onChange={(e) => setFormInvariantNote(e.target.value)}
                    placeholder="Cheap single invariant checked first"
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-claim-spend"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Spend Cap (Max $300)
                  </label>
                  <input
                    id="new-claim-spend"
                    type="number"
                    min={1}
                    max={300}
                    value={formSpendCap}
                    onChange={(e) => setFormSpendCap(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {claims.length > 0 && (
                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1">
                    Premise Dependencies (Optional parent claims)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {claims.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleTogglePremise(c.id)}
                        className={`px-2.5 py-1 text-xs font-mono rounded border ${
                          formPremises.includes(c.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        {c.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1">
                  Research Lenses (Spine + &ge;2 Lenses)
                </span>
                <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded">
                  {RESEARCH_LENSES.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleToggleLens(l.id)}
                      className={`px-2 py-0.5 text-xs rounded border ${
                        formLenses.includes(l.id)
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {l.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-register-claim-btn"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Register Claim &amp; Freeze EXP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
