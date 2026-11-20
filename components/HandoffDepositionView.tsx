'use client';

import React, { useState } from 'react';
import {
  generateResumeMarkdown,
  type ClaimExperimentRecord,
  type WithdrawalEntry,
  type ExternalVerificationLogEntry,
} from '@/lib/um1-engine';
import { Copy, Check, Play, Plus } from 'lucide-react';

interface HandoffDepositionViewProps {
  claims: ClaimExperimentRecord[];
  withdrawals: WithdrawalEntry[];
  externalLogs: ExternalVerificationLogEntry[];
  onExecuteExternalVerification: (
    claimId: string,
    agent: 'Manus' | 'Gemini 4 (Argon)' | 'Academia Co-Scientist',
    hlreSkillVersion: string,
    spendCapUsd: number,
    userApprovedOutwardDispatch: boolean
  ) => void;
  onToggleLocalAuditCheck: (logId: string, checkId: string) => void;
  onRequestNewClaim?: () => void;
  autoFilledProgrammeSlug?: string;
  autoFilledManuscriptExcerpt?: string;
}

const BANNED_MANUSCRIPT_TERMS = [
  'campaign',
  'verdict',
  'ledger',
  'dossier',
  'smoke gate',
  'session',
];

export default function HandoffDepositionView({
  claims,
  withdrawals,
  externalLogs,
  onExecuteExternalVerification,
  onToggleLocalAuditCheck,
  onRequestNewClaim,
  autoFilledProgrammeSlug = '',
  autoFilledManuscriptExcerpt = '',
}: HandoffDepositionViewProps) {
  const [programmeSlug, setProgrammeSlug] = useState(
    autoFilledProgrammeSlug || 'research-programme'
  );
  const [copiedResume, setCopiedResume] = useState(false);

  const [targetClaimId, setTargetClaimId] = useState<string>(claims[0]?.id || '');
  const [selectedAgent, setSelectedAgent] = useState<
    'Manus' | 'Gemini 4 (Argon)' | 'Academia Co-Scientist'
  >('Gemini 4 (Argon)');
  const [hlreSkillVersion, setHlreSkillVersion] = useState('UM-1 v3.1 (HLRE v5.1)');
  const [spendCapUsd, setSpendCapUsd] = useState<number>(35);
  const [userApprovedDispatch, setUserApprovedDispatch] = useState<boolean>(true);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);
  const [manuscriptDraft, setManuscriptDraft] = useState(autoFilledManuscriptExcerpt);

  if (claims.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-2xl mx-auto my-6">
        <h2 className="text-base font-semibold text-slate-900">
          External Verification (UM-4.3) &amp; RESUME.md Handoff
        </h2>
        <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto">
          Register a claim first to dispatch external verification via Manus, Gemini 4 (Argon), or
          Academia Co-Scientist and compile your RESUME.md handoff.
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

  const targetClaim = claims.find((c) => c.id === targetClaimId) || claims[0];
  const resumeMarkdown = generateResumeMarkdown(claims, withdrawals, programmeSlug);

  const detectedBannedWords = BANNED_MANUSCRIPT_TERMS.filter((term) =>
    manuscriptDraft.toLowerCase().includes(term.toLowerCase())
  );

  const handleRunExternalVerification = (e: React.FormEvent) => {
    e.preventDefault();
    onExecuteExternalVerification(
      targetClaim.id,
      selectedAgent,
      hlreSkillVersion,
      spendCapUsd,
      userApprovedDispatch
    );
    setDispatchNotice(
      `Dispatched ${selectedAgent} external audit for ${targetClaim.id} and logged claim-by-claim audit checks.`
    );
    setTimeout(() => setDispatchNotice(null), 2800);
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          External Verification Agents (UM-4.3) &amp; RESUME.md Handoff
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Dispatch external verification (Manus, Gemini 4 Argon, or Academia Co-Scientist), audit
          results locally claim-by-claim, and generate <code className="font-mono">RESUME.md</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 Cols: UM-4.3 External Verification Dispatcher */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2.5">
            UM-4.3 External Verification Dispatcher
          </h2>

          {dispatchNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 font-medium">
              {dispatchNotice}
            </div>
          )}

          <form onSubmit={handleRunExternalVerification} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="ext-claim-select"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Target Claim
                </label>
                <select
                  id="ext-claim-select"
                  value={targetClaim.id}
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

              <div>
                <label
                  htmlFor="ext-agent-select"
                  className="block text-xs font-semibold text-slate-700"
                >
                  External Verifier Agent
                </label>
                <select
                  id="ext-agent-select"
                  value={selectedAgent}
                  onChange={(e) =>
                    setSelectedAgent(
                      e.target.value as 'Manus' | 'Gemini 4 (Argon)' | 'Academia Co-Scientist'
                    )
                  }
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                >
                  <option value="Gemini 4 (Argon)">Gemini 4 (Argon)</option>
                  <option value="Manus">Manus</option>
                  <option value="Academia Co-Scientist">Academia Co-Scientist</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="ext-skill-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  HLRE Skill Version
                </label>
                <input
                  id="ext-skill-input"
                  type="text"
                  value={hlreSkillVersion}
                  onChange={(e) => setHlreSkillVersion(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label
                  htmlFor="ext-spend-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Spend Cap (Max $300 USD)
                </label>
                <input
                  id="ext-spend-input"
                  type="number"
                  min={1}
                  max={300}
                  value={spendCapUsd}
                  onChange={(e) => setSpendCapUsd(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={userApprovedDispatch}
                onChange={(e) => setUserApprovedDispatch(e.target.checked)}
              />
              <span>Confirm outward external verification dispatch</span>
            </label>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              <Play className="w-3.5 h-3.5" />
              Initiate External Verification &amp; Log Local Audit
            </button>
          </form>

          {/* Local Claim-by-Claim Audit Logs */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-900">
              Local Claim-by-Claim Audit Logs ({externalLogs.length})
            </div>
            {externalLogs.length === 0 ? (
              <p className="text-xs text-slate-500">
                No external verification runs logged yet. Initiate a run above to audit claim-by-claim
                findings.
              </p>
            ) : (
              externalLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-slate-900">
                      {log.claimId} · {log.verifierAgent}
                    </span>
                    <span className="text-blue-700 font-semibold">
                      Recommended: {log.recommendedGrade}
                    </span>
                  </div>
                  <p className="text-slate-600">{log.summaryVerdict}</p>
                  <div className="space-y-1">
                    {log.claimChecks.map((chk) => (
                      <label
                        key={chk.checkId}
                        className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={chk.localAuditVerified}
                          onChange={() => onToggleLocalAuditCheck(log.id, chk.checkId)}
                          className="mt-0.5"
                        />
                        <span>
                          <strong>{chk.aspect}:</strong> {chk.agentFinding}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 6 Cols: RESUME.md Handoff & Scientific Voice Linter */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                UM-5.4 RESUME.md Handoff Artifact
              </h2>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resumeMarkdown);
                  setCopiedResume(true);
                  setTimeout(() => setCopiedResume(false), 1800);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
              >
                {copiedResume ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedResume ? 'Copied' : 'Copy RESUME.md'}
              </button>
            </div>

            <div>
              <label
                htmlFor="programme-slug-input"
                className="block text-[11px] font-mono text-slate-500 mb-1"
              >
                Programme Directory Slug
              </label>
              <input
                id="programme-slug-input"
                type="text"
                value={programmeSlug}
                onChange={(e) => setProgrammeSlug(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>

            <pre className="p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-md overflow-x-auto max-h-60 leading-relaxed">
              {resumeMarkdown}
            </pre>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              UM-5.2 Scientific Voice Linter (Zero Process Jargon)
            </h2>
            <textarea
              rows={3}
              value={manuscriptDraft}
              onChange={(e) => setManuscriptDraft(e.target.value)}
              placeholder="Paste manuscript prose here (or auto-fill from an ingested paper/file) to check for prohibited process jargon..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
            />
            {manuscriptDraft.trim() && (
              <div className="text-xs font-mono">
                {detectedBannedWords.length === 0 ? (
                  <span className="text-emerald-700">
                    PASS: Zero internal process jargon detected.
                  </span>
                ) : (
                  <span className="text-rose-700">
                    FLAGGED TERMS: {detectedBannedWords.join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
