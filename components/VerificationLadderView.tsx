'use client';

import React, { useState } from 'react';
import {
  VERIFICATION_LADDER_SPECS,
  computeUM1Grade,
  type ClaimExperimentRecord,
  type VerificationRung,
  type RungStageAudit,
} from '@/lib/um1-engine';
import { ArrowUpRight, CheckCircle2, HelpCircle, Plus } from 'lucide-react';

interface VerificationLadderViewProps {
  claims: ClaimExperimentRecord[];
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  onUpdateRungAndAudit: (
    claimId: string,
    newRung: VerificationRung,
    updatedAudits: RungStageAudit[],
    globalHowWrong: string
  ) => void;
  onRequestNewClaim?: () => void;
}

export default function VerificationLadderView({
  claims,
  selectedClaimId,
  onSelectClaim,
  onUpdateRungAndAudit,
  onRequestNewClaim,
}: VerificationLadderViewProps) {
  const activeClaim = claims.find((c) => c.id === selectedClaimId) || claims[0];
  const currentRung: VerificationRung = activeClaim ? activeClaim.gradingInput.verificationRung : 0;
  const [selectedStageRung, setSelectedStageRung] = useState<VerificationRung>(currentRung);
  const [stageHowWrongText, setStageHowWrongText] = useState<string>(
    activeClaim?.rungAudits.find((a) => a.rung === currentRung)?.howCouldThisBeWrongAtStage ||
      activeClaim?.howCouldThisBeWrong ||
      ''
  );
  const [stageEvidenceText, setStageEvidenceText] = useState<string>(
    activeClaim?.rungAudits.find((a) => a.rung === currentRung)?.evidenceArtifactSummary || ''
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (!activeClaim) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-2xl mx-auto my-6">
        <h2 className="text-base font-semibold text-slate-900">
          Verification Ladder (Rung 0–5)
        </h2>
        <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto">
          Register a claim or frozen EXP hypothesis first to track its progression from Rung 0
          (Statement) through Rung 5 (External Verification).
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

  const currentSpec =
    VERIFICATION_LADDER_SPECS.find((s) => s.rung === currentRung) || VERIFICATION_LADDER_SPECS[0];
  const nextSpec =
    currentRung < 5
      ? VERIFICATION_LADDER_SPECS.find((s) => s.rung === ((currentRung + 1) as VerificationRung))
      : null;
  const inspectedSpec =
    VERIFICATION_LADDER_SPECS.find((s) => s.rung === selectedStageRung) ||
    VERIFICATION_LADDER_SPECS[0];

  const computedGrade = computeUM1Grade(activeClaim.gradingInput);

  const handleSelectClaim = (id: string) => {
    onSelectClaim(id);
    const found = claims.find((c) => c.id === id);
    if (found) {
      const r = found.gradingInput.verificationRung;
      setSelectedStageRung(r);
      const stageAudit = found.rungAudits.find((a) => a.rung === r);
      setStageHowWrongText(stageAudit?.howCouldThisBeWrongAtStage || found.howCouldThisBeWrong);
      setStageEvidenceText(stageAudit?.evidenceArtifactSummary || '');
    }
  };

  const handleInspectRung = (rung: VerificationRung) => {
    setSelectedStageRung(rung);
    const stageAudit = activeClaim.rungAudits.find((a) => a.rung === rung);
    setStageHowWrongText(
      stageAudit?.howCouldThisBeWrongAtStage || activeClaim.howCouldThisBeWrong
    );
    setStageEvidenceText(stageAudit?.evidenceArtifactSummary || '');
  };

  const handleSaveStageAudit = (promoteToThisRung: boolean) => {
    const targetRung = promoteToThisRung ? selectedStageRung : currentRung;
    const updatedAudits: RungStageAudit[] = [0, 1, 2, 3, 4, 5].map((r) => {
      const existing = activeClaim.rungAudits.find((a) => a.rung === r);
      if (r === selectedStageRung) {
        return {
          rung: r as VerificationRung,
          completed: r <= targetRung,
          howCouldThisBeWrongAtStage: stageHowWrongText.trim(),
          evidenceArtifactSummary: stageEvidenceText.trim() || `Verified stage Rung ${r}`,
          updatedAt: new Date().toISOString(),
        };
      }
      return (
        existing || {
          rung: r as VerificationRung,
          completed: r <= targetRung,
          howCouldThisBeWrongAtStage: activeClaim.howCouldThisBeWrong,
          evidenceArtifactSummary: '',
          updatedAt: new Date().toISOString(),
        }
      );
    });

    onUpdateRungAndAudit(
      activeClaim.id,
      targetRung,
      updatedAudits,
      stageHowWrongText.trim() || activeClaim.howCouldThisBeWrong
    );
    setSavedNotice(
      promoteToThisRung
        ? `Advanced ${activeClaim.id} to Rung ${targetRung} (${inspectedSpec.shortLabel}) and recorded stage analysis.`
        : `Updated Rung ${selectedStageRung} ("How could this be wrong?") analysis for ${activeClaim.id}.`
    );
    setTimeout(() => setSavedNotice(null), 2600);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Verification Ladder Tracker (Rung 0–5)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            UM-4.1 · Track rung progression, grade ceilings, advancement requirements, and stage
            &ldquo;How could this be wrong?&rdquo; analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="ladder-claim-select" className="text-xs font-medium text-slate-600">
            Claim:
          </label>
          <select
            id="ladder-claim-select"
            value={activeClaim.id}
            onChange={(e) => handleSelectClaim(e.target.value)}
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

      {/* Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Current Rung Achieved</div>
          <div className="text-lg font-mono font-bold text-slate-900 mt-1">
            {currentSpec.name}
            {computedGrade.rung4Kind ? ` · ${computedGrade.rung4Kind}` : ''}
          </div>
          <p className="text-xs text-slate-600 mt-1">{currentSpec.description}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Associated Maximum Grade</div>
          <div className="text-lg font-mono font-bold text-blue-700 mt-1">
            {activeClaim.gradingInput.track === 'F'
              ? currentSpec.maxGradeTrackF
              : currentSpec.maxGradeTrackE}{' '}
            <span className="text-xs font-normal text-slate-500">
              (Computed: {computedGrade.finalGrade})
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Track {activeClaim.gradingInput.track} · Tier {activeClaim.gradingInput.tier} ·{' '}
            {activeClaim.gradingInput.independence}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Next Rung Requirements</div>
          {nextSpec ? (
            <>
              <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                Advance to {nextSpec.name}
              </div>
              <ul className="mt-1.5 space-y-1">
                {nextSpec.requirementsToAdvance.map((req, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-xs text-emerald-700 font-medium mt-2">
              Maximum Rung 5 (External Verification) achieved.
            </div>
          )}
        </div>
      </div>

      {/* Rung 0–5 Stepper & Stage Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {VERIFICATION_LADDER_SPECS.map((spec) => {
            const isAchieved = spec.rung <= currentRung;
            const isInspected = spec.rung === selectedStageRung;
            return (
              <button
                key={spec.rung}
                type="button"
                onClick={() => handleInspectRung(spec.rung)}
                className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-3 ${
                  isInspected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {spec.name}
                      {spec.rung === 4 && computedGrade.rung4Kind ? ` (${computedGrade.rung4Kind})` : ''}
                    </span>
                    {isAchieved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{spec.description}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-500 shrink-0">
                  {activeClaim.gradingInput.track === 'F'
                    ? spec.maxGradeTrackF
                    : spec.maxGradeTrackE}
                </span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Stage {inspectedSpec.name} · &ldquo;How Could This Be Wrong?&rdquo; Analysis
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {inspectedSpec.validationLadderRoute}
            </span>
          </div>

          {savedNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 font-medium">
              {savedNotice}
            </div>
          )}

          <div>
            <label
              htmlFor="stage-how-wrong"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Adversarial Failure Modes &amp; Boundary Risks at {inspectedSpec.shortLabel}
            </label>
            <textarea
              id="stage-how-wrong"
              rows={3}
              value={stageHowWrongText}
              onChange={(e) => setStageHowWrongText(e.target.value)}
              placeholder="Document specific ways the statement, transcription, numerical precision, or assumption could fail at this stage..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="stage-evidence"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Verification Artifact / Tool Output Summary
            </label>
            <input
              id="stage-evidence"
              type="text"
              value={stageEvidenceText}
              onChange={(e) => setStageEvidenceText(e.target.value)}
              placeholder="e.g., SHA-256 hash, exit_code=0 log, or Lean 4 kernel theorem name"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
            <span className="text-[11px] font-mono text-slate-500">
              Note: Manual rung selection never grants 4K/kernel verification without executed verdicts.
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSaveStageAudit(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Save Stage Analysis
              </button>
              <button
                type="button"
                onClick={() => handleSaveStageAudit(true)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Set Active Rung to Rung {selectedStageRung}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
