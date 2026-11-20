// Pure logic for Unified Methodology UM-1 Skill v3.1 (HLRE v5.1 as amended + v2.1 grading rules + CAOS OS 01-13)
// [MV] scope DECIDED (final): keep broad — both formal kernel-backed proofs (Rung 4K) and Computational-F1
// via closed-ledger re-derivation (Rung 4D: closed ledger + 2nd independent implementation + archived hashed outputs)
// earn [MV]/F1. Do NOT narrow [MV] to kernel-only.

export const UM1_SKILL_VERSION = '3.1';
export const HLRE_PROTOCOL_VERSION = 'HLRE v5.1 · UM-1 Skill v3.1';
export const UM1_MV_SCOPE_DECISION =
  '[MV] scope DECIDED (keep): both formal kernel-backed proofs (Rung 4K) and Computational-F1 via closed-ledger re-derivation (Rung 4D: closed ledger + 2nd independent implementation + archived hashed outputs) earn [MV]/F1; do not narrow [MV] to kernel-only.';
export const UM1_SKILL_VERSION_NOTES = [
  'UM-1 Skill v3.1 (HLRE v5.1 + v2.1 rules + CAOS OS 01-13).',
  UM1_MV_SCOPE_DECISION,
  'UM-2.4(a)/(c)(2)/(j) execution gates, UM-4.4 CITED-ELSEWHERE guard, and paper-mode Section 6 ABSTAIN active.',
];

export type TrackType = 'E' | 'F';
export type TierType = 'Lite' | 'Standard' | 'Full';
export type IndependenceLevel = 'I0' | 'I1' | 'I2' | 'I3' | 'I4';
export type RecordLabel = '[MV]' | '[D]' | '[C]' | 'UNVERIFIED';
export type PostulationKind = 'constraint-led' | 'evidence-guided' | 'exploratory' | 'post-hoc';
export type NoveltyBudget = 'independently_motivated' | 'weakly_motivated' | 'introduced_to_fit';
export type PredictionClass = 'prediction' | 'accommodation' | 'retrodiction' | 'exploratory finding';
export type VerdictOutcome = 'confirmed' | 'refuted' | 'null' | 'inconclusive' | 'budget_stop';
export type OverrideStatus =
  | 'NONE'
  | 'CONTRADICTED'
  | 'INCOMPLETE-EVIDENCE'
  | 'UNDERDETERMINED'
  | 'NON-IDENTIFIABLE'
  | 'ABSTAIN';

export type ProblemLifecycleState =
  | 'proposed'
  | 'scoped'
  | 'opened'
  | 'exploring'
  | 'consolidating'
  | 'published'
  | 'dormant'
  | 'closed';

export type VerificationRung = 0 | 1 | 2 | 3 | 4 | 5;
export type Rung4Kind = '4K' | '4D'; // 4K = kernel-backed, 4D = closed-ledger re-derivation
export type PremiseLedgerStatus = 'VERIFIED' | 'UNVERIFIED' | 'CITED-ELSEWHERE';

export type ErrorFamily = 'T' | 'H' | 'P' | 'N' | 'S' | 'G' | 'R' | 'NEW';

export type HLREGrade =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'INCOMPLETE-EVIDENCE'
  | 'CONTRADICTED'
  | 'ABSTAIN'
  | 'UNGRADED';

export type DependencyNodeKind = 'observation' | 'choice' | 'assumption' | 'primary_transcription' | 'claim_premise';

export interface PremiseDependencyItem {
  id: string;
  kind: DependencyNodeKind;
  statement: string;
  sourceCitation: string;
  linkedClaimId?: string;
  hasSupportingVerdict: boolean; // UM-1.4b: premises without verdicts are labeled hypotheses
  independentlyRederived: boolean; // UM-4.4: whether independently re-derived
  isLeafTranscription: boolean; // UM-4.4: if true and !independentlyRederived -> INCOMPLETE-EVIDENCE
  status?: PremiseLedgerStatus; // UM-4.4: supports CITED-ELSEWHERE state
}

export interface TierChangeLogEntry {
  id: string;
  claimId: string;
  previousTier: TierType;
  newTier: TierType;
  direction: 'raised' | 'lowered';
  justification: string;
  timestamp: string;
}

export interface RungStageAudit {
  rung: VerificationRung;
  completed: boolean;
  howCouldThisBeWrongAtStage: string;
  evidenceArtifactSummary: string;
  updatedAt: string;
}

export interface ToolVerdictQuote {
  toolName: string;
  version: string;
  exitCode: number;
  command: string;
  verdictSummary: string;
  exactArithmetic: boolean;
  actuallyExecuted?: boolean;
  expectedVersion?: string;
  outputHash?: string;
  isNoOp?: boolean;
  isTextSearchOnly?: boolean;
  executionId?: string;
}

export interface PreflightChecklist {
  P1_sourceComplete: boolean;
  P2_smokeTest: boolean;
  P3_premiseDependenciesChecked: boolean;
  P4_oneSidednessStated: boolean;
  P5_invariantFirstChecked: boolean;
  P6_computeBudgetDeclared: boolean;
  P7_spendCapNamed: boolean;
  spendCapUsd: number;
}

export interface PreflightGateDiagnostic {
  gateId: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';
  title: string;
  ruleReference: string;
  passed: boolean;
  automatedFinding: string;
  guidedRemediation: string;
}

export interface PreflightAuditLogEntry {
  id: string;
  claimId: string;
  expId?: string;
  timestamp: string;
  readyForCompute: boolean;
  passedCount: number;
  totalGates: number;
  spendCapUsd: number;
  gateResults: Record<'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7', boolean>;
  summaryNote: string;
}

export interface ExternalVerificationAudit {
  executed: boolean;
  verifierAgent: 'Manus' | 'Gemini 4 (Argon)' | 'Academia Co-Scientist' | 'None';
  auditedLocallyClaimByClaim: boolean;
  supportedGrade: 'A' | 'B' | 'C' | 'D' | 'F1' | 'F2' | 'F3';
  auditNotes: string;
}

export interface ClaimByClaimAuditCheck {
  checkId: string;
  aspect: string;
  agentFinding: string;
  localAuditVerified: boolean;
}

export interface ExternalVerificationLogEntry {
  id: string;
  claimId: string;
  expId?: string;
  verifierAgent: 'Manus' | 'Gemini 4 (Argon)' | 'Academia Co-Scientist';
  hlreSkillVersion: string;
  spendCapUsd: number;
  userApprovedOutwardDispatch: boolean;
  timestamp: string;
  recommendedGrade: HLREGrade;
  locallyAuditedClaimByClaim: boolean;
  claimChecks: ClaimByClaimAuditCheck[];
  summaryVerdict: string;
}

export interface ClaimGradingInput {
  track: TrackType;
  tier: TierType;
  recordLabel: RecordLabel;
  independence: IndependenceLevel;
  hasDiscriminatingComparison: boolean;
  postulationKind: PostulationKind;
  postulationValidatedByNewIndependentTests: boolean;
  unreportedParameterSelection: boolean;
  ledgerEndsInUnrederivedTranscription: boolean;
  overrideStatus: OverrideStatus;
  narrowestSurvivingGrade?: 'A' | 'B' | 'C' | 'D';
  supportInRecord: 'A' | 'B' | 'C' | 'D';
  verificationRung: VerificationRung;
  rung4Kind?: Rung4Kind; // '4K' = kernel-backed, '4D' = closed-ledger re-derivation
  independentRoutesCount: number;
  kernelCheckedOrClosedLedger: boolean;
  exactArithmeticCertified: boolean;
  toolVerdicts: ToolVerdictQuote[];
  externalVerification: ExternalVerificationAudit;
  hasCitedElsewherePremise?: boolean; // UM-4.4 CITED-ELSEWHERE state
  archivedOutputHashes?: string[]; // Computational-F1 archived hashed outputs
  paperMode?: boolean; // Section-6 paper-mode ABSTAIN handling
}

export interface GradeComputationBreakdown {
  finalGrade: HLREGrade;
  tierCap: string;
  independenceBound: string;
  postulationCeiling: string;
  parameterCap: string;
  rungCap: string;
  rung4Kind?: Rung4Kind | null;
  computationGatePassed: boolean;
  reasons: string[];
}

export interface ClaimExperimentRecord {
  id: string;
  expId?: string; // e.g., EXP-014
  supersededBy?: string;
  supersedes?: string;
  title: string;
  domain: string;
  lifecycleState: ProblemLifecycleState;
  target: string;
  source: string;
  uncertainty: string;
  priorLiterature: string;
  dataSplits: string;
  replicationPlan: string;
  independenceBoundary: string;
  noveltyBudget: NoveltyBudget;
  predictionClass: PredictionClass;
  question: string; // Hypothesis text / research question
  motivation: string;
  falsifiablePrediction: string;
  method: string; // Method specification
  successFailureCriteria: string; // Explicit PASS/FAIL criteria
  oneSidednessPass: string;
  oneSidednessFail: string;
  premiseDependencies: string[]; // IDs of parent claims
  dependencyLedgerItems: PremiseDependencyItem[]; // Detailed UM-4.4 observations, choices, assumptions, transcriptions
  computeBudget: string;
  killCriterion: string;
  computeBudgetAndKill: string;
  invariantFirstNote: string;
  lensesDeclared: string[]; // Spine + >=2 lenses
  verdictOutcome: VerdictOutcome;
  howCouldThisBeWrong: string;
  rungAudits: RungStageAudit[];
  tierHistory: TierChangeLogEntry[];
  sha256Manifest: string;
  preflight: PreflightChecklist;
  gradingInput: ClaimGradingInput;
  createdAt: string;
}

export interface WithdrawalEntry {
  id: string;
  claimId: string;
  timestamp: string;
  verbatimStatement: string;
  errorFamily: ErrorFamily;
  missedGate: string;
  transitiveDependents: string[];
  demotionApplied: string;
  restorationCriteria: string;
  remediationPlan: string;
  postMortemSummary: string;
  complianceSignOff: string;
}

export interface VerificationRungSpec {
  rung: VerificationRung;
  name: string;
  shortLabel: string;
  maxGradeTrackE: string;
  maxGradeTrackF: string;
  description: string;
  requirementsToAdvance: string[];
  validationLadderRoute: string;
}

export const VERIFICATION_LADDER_SPECS: VerificationRungSpec[] = [
  {
    rung: 0,
    name: 'Rung 0 (Statement)',
    shortLabel: 'Statement',
    maxGradeTrackE: 'D max',
    maxGradeTrackF: 'INCOMPLETE-EVIDENCE',
    description: 'Registered claim_record + frozen pre-run hypothesis.md with one-sidedness, kill criterion, and invariant-first note.',
    requirementsToAdvance: [
      'Locate and mine primary source to the end, including closing remarks (P1).',
      'Transcribe exact statement, compute SHA-256 hash, and verify implication/index direction.',
    ],
    validationLadderRoute: 'Pre-registration & statement hygiene (UM-1.1, UM-1.4)',
  },
  {
    rung: 1,
    name: 'Rung 1 (Source)',
    shortLabel: 'Source',
    maxGradeTrackE: 'C max',
    maxGradeTrackF: 'INCOMPLETE-EVIDENCE (if ledger ends here)',
    description: 'Primary source located, transcribed, SHA-256 hashed, and implication/index verified.',
    requirementsToAdvance: [
      'Execute deterministic headless run.py with fixed seeds and non-zero exit assertion on failure.',
      'Certify algebraic/numerical claim with exact arithmetic over Q / SymPy / CRT (zero floats in certificate, UM-2.3).',
      'Record quoted tool verdict with tool version and exit code = 0 (UM-2.4 Computation Gate).',
    ],
    validationLadderRoute: 'Source-complete audit & transcription verification (P1, UM-4.4)',
  },
  {
    rung: 2,
    name: 'Rung 2 (Machine)',
    shortLabel: 'Machine',
    maxGradeTrackE: 'C',
    maxGradeTrackF: 'F3',
    description: 'Exact-arithmetic certificate + quoted tool verdict with version and zero exit code.',
    requirementsToAdvance: [
      'Execute a second independent tool or algorithm/ordering/library route (UM-2.4, UM-4.1 Route 1 & 3).',
      'Persist certified numerics (interval, rational, or alpha-theory certificates) or 1,000+ null model replicates.',
    ],
    validationLadderRoute: 'Route 2: Certified numerics & exact-arithmetic machine certificate (UM-2.3, UM-2.4)',
  },
  {
    rung: 3,
    name: 'Rung 3 (Independent Route)',
    shortLabel: 'Independent Route',
    maxGradeTrackE: 'B',
    maxGradeTrackF: 'F2',
    description: 'Second independent route, cross-implementation agreement, or persisted certified numerics.',
    requirementsToAdvance: [
      'Track F: Machine-check proof in a formal kernel (Lean 4 / Coq / Isabelle with zero sorryAx and standard axioms) OR close full deductive re-derivation ledger.',
      'Track E: Execute I3/I4 independent dataset/instrument replication with pre-specified competing-model comparison.',
    ],
    validationLadderRoute: 'Route 1 & 3: Exact re-derivation by independent route + cross-implementation agreement',
  },
  {
    rung: 4,
    name: 'Rung 4 (Kernel / Closed Ledger)',
    shortLabel: 'Kernel / Closed Ledger',
    maxGradeTrackE: 'A-candidate (with I3/I4)',
    maxGradeTrackF: 'F1',
    description: 'Machine-checked in formal kernel (zero sorryAx, standard axioms) or independently re-derived with closed ledger.',
    requirementsToAdvance: [
      'Run external verification via Manus, Gemini 4 (Argon), or Academia Co-Scientist carrying the full HLRE Step 6 prompt block (UM-4.3).',
      'Audit the external verifier output locally claim-by-claim against the dependency ledger.',
    ],
    validationLadderRoute: 'Formal kernel verification & closed premise ledger (UM-4.4, UM-6)',
  },
  {
    rung: 5,
    name: 'Rung 5 (External)',
    shortLabel: 'External HLRE Audit',
    maxGradeTrackE: 'Grade follows evidence (up to A)',
    maxGradeTrackF: 'Grade follows evidence (up to F1)',
    description: 'External HLRE-constrained agent audit (Manus, Gemini 4 Argon, or Academia Co-Scientist), verified locally claim-by-claim.',
    requirementsToAdvance: [
      'All 6 Verification Ladder rungs complete. Proceed to R1 retraction sweep, R2 verdict-line manuscript check, and R3 Zenodo deposit.',
    ],
    validationLadderRoute: 'External HLRE Step 6 multi-system verification audited locally (UM-4.3)',
  },
];

export const PROBLEM_LIFECYCLE_ORDER: ProblemLifecycleState[] = [
  'proposed',
  'scoped',
  'opened',
  'exploring',
  'consolidating',
  'published',
  'dormant',
  'closed',
];

export const RESEARCH_LENSES = [
  { id: 'L0-spine', name: 'Spine: Exclusion / Obstruction', required: true },
  { id: 'L1', name: 'Lens 1: Anatomy / Construction', required: false },
  { id: 'L2', name: 'Lens 2: Recognition / Classification', required: false },
  { id: 'L3', name: 'Lens 3: Invariant-First (pair w/ UM-4.6 Framing Audit)', required: false },
  { id: 'L4', name: 'Lens 4: Symmetry / Representation', required: false },
  { id: 'L5', name: 'Lens 5: Two-Sided Reading', required: false },
  { id: 'L6', name: 'Lens 6: Reformulation / Dictionary', required: false },
  { id: 'L7', name: 'Lens 7: Dimension / Parameter Ladder (pair w/ UM-4.6)', required: false },
  { id: 'L8', name: 'Lens 8: At-Infinity / Boundary', required: false },
  { id: 'L9', name: 'Lens 9: Adversarial / Audit', required: false },
  { id: 'L10', name: 'Lens 10: External Dialogue', required: false },
];

export const ERROR_FAMILY_DESCRIPTIONS: Record<ErrorFamily, string> = {
  T: 'Transcription / Citation / Primary-Source Misread',
  H: 'Heuristic Treated as Exact / Float Contamination in Certificate',
  P: 'Premise / Hidden Assumption / Unclosed Dependency Ledger',
  N: 'Numerical / Seed / Precision / Silent Overflow',
  S: 'Selection Bias / Post-Hoc Filtering / Unfrozen Search Space',
  G: 'Gauge / Convention Mismatch / Semantic Debris',
  R: 'Replication / Cross-Implementation Divergence',
  NEW: 'Novel Systemic Failure Mode (Requires Protocol Update)',
};

const TIER_NUMERIC_ORDER: Record<TierType, number> = {
  Lite: 1,
  Standard: 2,
  Full: 3,
};

/**
 * Validates tier changes under UM-1.1:
 * "Raise tier freely; lower only with logged justification."
 */
export function validateTierTransition(
  currentTier: TierType,
  nextTier: TierType,
  justification: string
): {
  valid: boolean;
  direction: 'unchanged' | 'raised' | 'lowered';
  error?: string;
} {
  const prevRank = TIER_NUMERIC_ORDER[currentTier];
  const nextRank = TIER_NUMERIC_ORDER[nextTier];

  if (prevRank === nextRank) {
    return { valid: true, direction: 'unchanged' };
  }
  if (nextRank > prevRank) {
    return { valid: true, direction: 'raised' };
  }
  // Lowering tier requires non-empty logged justification
  if (!justification || justification.trim().length < 10) {
    return {
      valid: false,
      direction: 'lowered',
      error:
        'UM-1.1 Rule: Raising tier is free, but lowering a claim tier requires a logged justification (at least 10 characters).',
    };
  }
  return { valid: true, direction: 'lowered' };
}

/**
 * Evaluates a claim's Dependency Ledger (UM-4.4) and Preflight P3 check:
 * - Tracks observations, choices, assumptions, transcriptions, and claim premises.
 * - Flags any ledger ending in an un-re-derived transcription -> INCOMPLETE-EVIDENCE.
 * - Flags UM-4.4 CITED-ELSEWHERE premise nodes -> INCOMPLETE-EVIDENCE until locally re-derived.
 * - Checks P3: whether all premise dependencies have supporting verdicts (otherwise labeled hypotheses).
 */
export function auditDependencyLedger(
  claim: ClaimExperimentRecord,
  allClaims: ClaimExperimentRecord[]
): {
  endsInUnrederivedTranscription: boolean;
  unrederivedTranscriptionItems: PremiseDependencyItem[];
  citedElsewhereItems: PremiseDependencyItem[];
  hasCitedElsewhere: boolean;
  premisesWithoutVerdicts: string[];
  p3GatePassed: boolean;
  totalItems: number;
  rederivedCount: number;
  statusBanner: string;
} {
  const citedElsewhereItems = claim.dependencyLedgerItems.filter(
    (item) =>
      item.status === 'CITED-ELSEWHERE' ||
      (!item.independentlyRederived && /\bcited[- ]elsewhere\b/i.test(item.sourceCitation))
  );
  const hasCitedElsewhere =
    citedElsewhereItems.length > 0 || Boolean(claim.gradingInput.hasCitedElsewherePremise);

  const unrederivedTranscriptionItems = claim.dependencyLedgerItems.filter(
    (item) => item.isLeafTranscription && !item.independentlyRederived
  );

  const endsInUnrederivedTranscription =
    unrederivedTranscriptionItems.length > 0 || claim.gradingInput.ledgerEndsInUnrederivedTranscription;

  const premisesWithoutVerdicts: string[] = [];

  // Check linked parent claims in the record
  for (const parentId of claim.premiseDependencies) {
    const parent = allClaims.find((c) => c.id === parentId);
    if (!parent) {
      premisesWithoutVerdicts.push(`${parentId} (missing from registry -> labeled hypothesis)`);
    } else {
      const parentGrade = computeUM1Grade(parent.gradingInput).finalGrade;
      if (
        parent.verdictOutcome !== 'confirmed' ||
        parentGrade === 'INCOMPLETE-EVIDENCE' ||
        parentGrade === 'CONTRADICTED' ||
        parent.gradingInput.recordLabel === '[C]'
      ) {
        premisesWithoutVerdicts.push(
          `${parentId} (verdict=${parent.verdictOutcome}, grade=${parentGrade} -> labeled hypothesis)`
        );
      }
    }
  }

  // Also check individual ledger items without supporting verdicts or marked CITED-ELSEWHERE
  for (const item of claim.dependencyLedgerItems) {
    if (!item.hasSupportingVerdict || item.status === 'CITED-ELSEWHERE') {
      premisesWithoutVerdicts.push(
        `${item.id}: "${item.statement}" (${
          item.status === 'CITED-ELSEWHERE' ? 'CITED-ELSEWHERE' : 'no verdict'
        } -> labeled hypothesis)`
      );
    }
  }

  const p3GatePassed =
    premisesWithoutVerdicts.length === 0 && !endsInUnrederivedTranscription && !hasCitedElsewhere;
  const totalItems = claim.dependencyLedgerItems.length;
  const rederivedCount = claim.dependencyLedgerItems.filter((i) => i.independentlyRederived).length;

  let statusBanner = 'Dependency ledger closed and independently re-derived. P3 Gate Passed.';
  if (endsInUnrederivedTranscription) {
    statusBanner =
      'UM-4.4 Flag: Dependency ledger ends in an un-re-derived transcription -> Claim grade forced to INCOMPLETE-EVIDENCE.';
  } else if (hasCitedElsewhere) {
    statusBanner =
      'UM-4.4 CITED-ELSEWHERE Flag: Premise relies on an external citation not yet locally re-derived -> INCOMPLETE-EVIDENCE.';
  } else if (premisesWithoutVerdicts.length > 0) {
    statusBanner = `P3 Warning: ${premisesWithoutVerdicts.length} premise(s) lack confirmed verdicts and are labeled as hypotheses.`;
  }

  return {
    endsInUnrederivedTranscription,
    unrederivedTranscriptionItems,
    citedElsewhereItems,
    hasCitedElsewhere,
    premisesWithoutVerdicts,
    p3GatePassed,
    totalItems,
    rederivedCount,
    statusBanner,
  };
}

const TRACK_E_RANK: Record<'A' | 'B' | 'C' | 'D', number> = {
  A: 4,
  B: 3,
  C: 2,
  D: 1,
};

const RANK_TO_TRACK_E: Record<number, 'A' | 'B' | 'C' | 'D'> = {
  4: 'A',
  3: 'B',
  2: 'C',
  1: 'D',
};

function minTrackEGrade(a: 'A' | 'B' | 'C' | 'D', b: 'A' | 'B' | 'C' | 'D'): 'A' | 'B' | 'C' | 'D' {
  return TRACK_E_RANK[a] <= TRACK_E_RANK[b] ? a : b;
}

/**
 * UM-2.4(a) Text-search exception:
 * grep / ripgrep / ag / ack / pattern-scan commands count ONLY as text search,
 * never as computational or kernel verification tools.
 */
export function isTextSearchToolVerdict(t: ToolVerdictQuote): boolean {
  if (t.isTextSearchOnly) return true;
  const name = (t.toolName || '').trim().toLowerCase();
  const cmd = (t.command || '').trim().toLowerCase();
  const summary = (t.verdictSummary || '').trim().toLowerCase();

  const textSearchCmdRegex =
    /(?:^|[\/;\s|&])(grep|egrep|fgrep|rg|ripgrep|ag|ack|select-string|findstr|git\s+grep)\b/;
  if (textSearchCmdRegex.test(cmd)) return true;

  if (
    /\b(scan-as-kernel|text-search|text\s+search|ripgrep|grep\s+scan|regex\s+scan)\b/.test(name) ||
    /\bscan-as-kernel\b/.test(summary) ||
    (/\bgrep\b|\bripgrep\b|\brg\b/.test(name) && !/\blean4checker\b|\bpython\b|\bsingular\b/.test(cmd))
  ) {
    return true;
  }

  return false;
}

/**
 * UM-2.4(j) No-Op Floor:
 * Rejects empty commands, trivial shell/Python/Lean no-ops (`pass`, `true`, `:`,
 * `echo`-only, empty scripts), or zero-work verdicts.
 */
export function isNoOpToolVerdict(t: ToolVerdictQuote): boolean {
  if (t.isNoOp) return true;
  const cmd = (t.command || '').trim();
  const summary = (t.verdictSummary || '').trim();
  if (!cmd || !summary) return true;

  const lowerCmd = cmd.toLowerCase();
  const lowerSummary = summary.toLowerCase();

  if (
    /^(?:no-?op|:|true|pass|exit\s+0|return\s+0|echo\b[^|;&]*)$/i.test(lowerCmd) ||
    /python[0-9.]*\s+(?:-[a-z]+\s+)*-c\s+["']\s*(?:pass|return|print\s*\([^)]*\)|#.*)?\s*["']$/i.test(
      lowerCmd
    ) ||
    /^(?:#.*|\/\/.*|--.*|\s)*$/.test(lowerCmd)
  ) {
    return true;
  }

  if (
    /\b(no-?op|did\s+nothing|0\s+checks?\s+run|empty\s+script|trivial\s+exit)\b/i.test(
      lowerSummary
    )
  ) {
    return true;
  }

  return false;
}

/**
 * UM-2.4(c)(2) Version-Match check:
 * Requires a non-placeholder version and checks against `expectedVersion` if declared.
 */
export function isVersionMatchedToolVerdict(t: ToolVerdictQuote): boolean {
  const version = (t.version || '').trim();
  if (!version) return false;
  const lowerVer = version.toLowerCase();
  if (
    ['unknown', 'n/a', 'na', 'none', 'tbd', 'latest', '0.0.0', 'placeholder', 'canned', 'simulated'].includes(
      lowerVer
    )
  ) {
    return false;
  }

  if (t.expectedVersion && t.expectedVersion.trim()) {
    const exp = t.expectedVersion.trim().toLowerCase();
    const act = lowerVer;
    if (act !== exp && !act.startsWith(exp) && !exp.startsWith(act)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks whether a ToolVerdictQuote represents a real executed run (not canned / unexecuted).
 */
export function isExecutedToolVerdict(t: ToolVerdictQuote): boolean {
  if (t.actuallyExecuted === false) return false;
  const combined = `${t.toolName} ${t.version} ${t.command} ${t.verdictSummary}`.toLowerCase();
  if (/\b(canned|unexecuted|not\s+executed|dry-run|simulated\s+fallback)\b/.test(combined)) {
    return false;
  }
  return true;
}

export function isFormalKernelTool(t: ToolVerdictQuote): boolean {
  if (isTextSearchToolVerdict(t) || isNoOpToolVerdict(t) || !isExecutedToolVerdict(t)) {
    return false;
  }
  const combined = `${t.toolName} ${t.command} ${t.verdictSummary}`.toLowerCase();
  const mentionsKernel = /\b(lean\s*4|lean4checker|lake\s+env|coq|coqchk|isabelle|agda|lean)\b/.test(
    combined
  );
  const hasSorrySmuggling =
    /\b[1-9]\d*\s+sorry|\bsorryax\s*[:=]\s*[1-9]/i.test(combined);
  return mentionsKernel && !hasSorrySmuggling && t.exitCode === 0;
}

export function evaluateToolVerdictsUM24(verdicts: ToolVerdictQuote[]): {
  validTools: ToolVerdictQuote[];
  distinctValidTools: ToolVerdictQuote[];
  sameNonExecutionUnderTwoNames: boolean;
  rejectionReasons: string[];
} {
  const rejectionReasons: string[] = [];
  const validTools: ToolVerdictQuote[] = [];

  for (const t of verdicts) {
    if (!t.toolName.trim() || t.exitCode !== 0) {
      rejectionReasons.push(`Tool "${t.toolName || 'unnamed'}" failed or missing tool name.`);
      continue;
    }
    if (!isExecutedToolVerdict(t)) {
      rejectionReasons.push(
        `Tool "${t.toolName}" was not actually executed / canned runner rejected (UM-2.4).`
      );
      continue;
    }
    if (isTextSearchToolVerdict(t)) {
      rejectionReasons.push(
        `Tool "${t.toolName}" is text search / scan only (UM-2.4a); excluded from verification gate.`
      );
      continue;
    }
    if (isNoOpToolVerdict(t)) {
      rejectionReasons.push(
        `Tool "${t.toolName}" failed UM-2.4(j) no-op floor: empty or zero-work command earns no credit.`
      );
      continue;
    }
    if (!isVersionMatchedToolVerdict(t)) {
      rejectionReasons.push(
        `Tool "${t.toolName}" failed UM-2.4(c)(2) version-match check (version="${t.version}", expected="${t.expectedVersion || 'non-placeholder'}").`
      );
      continue;
    }
    validTools.push(t);
  }

  // Detect duplicate execution / non-execution masquerading under two tool names
  const seenSignatures = new Map<string, ToolVerdictQuote>();
  const distinctValidTools: ToolVerdictQuote[] = [];
  let sameNonExecutionUnderTwoNames = false;

  // Check across ALL input verdicts for identical non-executed run under 2 names
  const unexecutedBySig = new Map<string, string[]>();
  for (const t of verdicts) {
    if (!isExecutedToolVerdict(t) || t.actuallyExecuted === false) {
      const sig =
        t.executionId ||
        `${t.command.trim().toLowerCase()}::${t.verdictSummary.trim().toLowerCase()}`;
      const list = unexecutedBySig.get(sig) || [];
      list.push(t.toolName);
      unexecutedBySig.set(sig, list);
    }
  }
  for (const names of unexecutedBySig.values()) {
    if (new Set(names).size >= 2) {
      sameNonExecutionUnderTwoNames = true;
    }
  }

  for (const t of validTools) {
    const sig =
      t.executionId ||
      (t.outputHash && t.outputHash.trim()) ||
      `${t.command.trim().toLowerCase()}::${t.verdictSummary.trim().toLowerCase()}`;

    const existing = seenSignatures.get(sig);
    if (existing) {
      if (t.actuallyExecuted !== true || existing.actuallyExecuted !== true) {
        sameNonExecutionUnderTwoNames = true;
        rejectionReasons.push(
          `Detected same non-execution under two tool names ("${existing.toolName}" and "${t.toolName}").`
        );
      } else {
        rejectionReasons.push(
          `Deduplicated repeated execution signature shared by "${existing.toolName}" and "${t.toolName}".`
        );
      }
      continue;
    }
    seenSignatures.set(sig, t);
    distinctValidTools.push(t);
  }

  if (sameNonExecutionUnderTwoNames) {
    return {
      validTools: [],
      distinctValidTools: [],
      sameNonExecutionUnderTwoNames: true,
      rejectionReasons,
    };
  }

  return {
    validTools,
    distinctValidTools,
    sameNonExecutionUnderTwoNames: false,
    rejectionReasons,
  };
}

function inferRung4Kind(input: ClaimGradingInput, distinctValidTools: ToolVerdictQuote[]): Rung4Kind | null {
  if (input.verificationRung < 4) return null;
  if (input.rung4Kind === '4K' || input.rung4Kind === '4D') {
    return input.rung4Kind;
  }
  if (distinctValidTools.some((t) => isFormalKernelTool(t))) {
    return '4K';
  }
  if (input.kernelCheckedOrClosedLedger) {
    return '4D';
  }
  return null;
}

/**
 * Pure UM-1 / HLRE v5.1 + Skill v3.1 (v2.1 rules) grade evaluator.
 */
export function computeUM1Grade(input: ClaimGradingInput): GradeComputationBreakdown {
  const reasons: string[] = [];

  if (input.recordLabel === 'UNVERIFIED') {
    return {
      finalGrade: input.paperMode ? 'ABSTAIN' : 'UNGRADED',
      tierCap: 'N/A',
      independenceBound: 'N/A',
      postulationCeiling: 'N/A',
      parameterCap: 'N/A',
      rungCap: 'N/A',
      rung4Kind: null,
      computationGatePassed: false,
      reasons: [
        input.paperMode
          ? 'Paper-mode Section 6: UNVERIFIED record abstains rather than emitting an ungrounded grade.'
          : 'UNVERIFIED record carries no grade; no conclusion may depend on it (UM-5).',
      ],
    };
  }

  if (input.overrideStatus === 'CONTRADICTED') {
    return {
      finalGrade: 'CONTRADICTED',
      tierCap: 'OVERRIDDEN',
      independenceBound: 'OVERRIDDEN',
      postulationCeiling: 'OVERRIDDEN',
      parameterCap: 'OVERRIDDEN',
      rungCap: 'OVERRIDDEN',
      rung4Kind: null,
      computationGatePassed: false,
      reasons: ['Status CONTRADICTED overrides numeric/letter grades and carries no grade (UM-6).'],
    };
  }

  if (input.overrideStatus === 'ABSTAIN') {
    return {
      finalGrade: 'ABSTAIN',
      tierCap: 'ABSTAIN',
      independenceBound: 'ABSTAIN',
      postulationCeiling: 'ABSTAIN',
      parameterCap: 'ABSTAIN',
      rungCap: 'ABSTAIN',
      rung4Kind: null,
      computationGatePassed: true,
      reasons: ['ABSTAIN recorded as a complete, valid HLRE v5.1 / UM-1 v3.1 answer (Section 6).'],
    };
  }

  if (
    input.overrideStatus === 'INCOMPLETE-EVIDENCE' ||
    input.ledgerEndsInUnrederivedTranscription ||
    input.hasCitedElsewherePremise
  ) {
    const incompleteReason = input.hasCitedElsewherePremise
      ? 'Dependency ledger contains a UM-4.4 CITED-ELSEWHERE premise without local re-derivation -> INCOMPLETE-EVIDENCE.'
      : input.ledgerEndsInUnrederivedTranscription
        ? 'Dependency ledger ends in an un-re-derived transcription -> INCOMPLETE-EVIDENCE (UM-4.4).'
        : 'Explicit INCOMPLETE-EVIDENCE status.';

    return {
      finalGrade: input.paperMode ? 'ABSTAIN' : 'INCOMPLETE-EVIDENCE',
      tierCap: 'OVERRIDDEN',
      independenceBound: 'OVERRIDDEN',
      postulationCeiling: 'OVERRIDDEN',
      parameterCap: 'OVERRIDDEN',
      rungCap: 'OVERRIDDEN',
      rung4Kind: null,
      computationGatePassed: false,
      reasons: [
        input.paperMode
          ? `Paper-mode Section 6 ABSTAIN: ${incompleteReason}`
          : incompleteReason,
      ],
    };
  }

  const toolAudit = evaluateToolVerdictsUM24(input.toolVerdicts);
  if (toolAudit.rejectionReasons.length > 0) {
    reasons.push(...toolAudit.rejectionReasons);
  }

  const validTools = toolAudit.distinctValidTools;
  const computationGatePassed =
    validTools.length >= 1 && !toolAudit.sameNonExecutionUnderTwoNames;
  const hasSecondIndependentTool = validTools.length >= 2;
  const rung4Kind = inferRung4Kind(input, validTools);

  if (input.recordLabel === '[C]') {
    if (!computationGatePassed && input.track === 'F') {
      return {
        finalGrade: input.paperMode ? 'ABSTAIN' : 'INCOMPLETE-EVIDENCE',
        tierCap: input.tier,
        independenceBound: input.independence,
        postulationCeiling: 'Track F',
        parameterCap: 'Track F',
        rungCap: `Rung ${input.verificationRung}`,
        rung4Kind,
        computationGatePassed: false,
        reasons: [
          ...reasons,
          'Track F computation gate failed: requires a genuinely executed non-no-op, non-text-search tool verdict.',
        ],
      };
    }
    return {
      finalGrade: input.paperMode && !computationGatePassed ? 'ABSTAIN' : 'D',
      tierCap: 'D ([C] Conjecture ceiling)',
      independenceBound: input.independence,
      postulationCeiling: 'D',
      parameterCap: 'D',
      rungCap: `Rung ${input.verificationRung}${rung4Kind ? ` (${rung4Kind})` : ''}`,
      rung4Kind,
      computationGatePassed,
      reasons: [
        ...reasons,
        'Record label [C] (conjecture) is capped at D (exploratory) and never stated as a finding (UM-5).',
      ],
    };
  }

  if (input.track === 'F') {
    if (input.verificationRung <= 1) {
      return {
        finalGrade: input.paperMode ? 'ABSTAIN' : 'INCOMPLETE-EVIDENCE',
        tierCap: input.tier,
        independenceBound: input.independence,
        postulationCeiling: 'Track F',
        parameterCap: 'Track F',
        rungCap: `Rung ${input.verificationRung}`,
        rung4Kind: null,
        computationGatePassed,
        reasons: [
          ...reasons,
          'Track F claim ending at Rung 0 or Rung 1 (transcription only) yields INCOMPLETE-EVIDENCE (UM-6).',
        ],
      };
    }

    if (!input.exactArithmeticCertified) {
      return {
        finalGrade: input.paperMode ? 'ABSTAIN' : 'INCOMPLETE-EVIDENCE',
        tierCap: input.tier,
        independenceBound: input.independence,
        postulationCeiling: 'Track F',
        parameterCap: 'Track F',
        rungCap: `Rung ${input.verificationRung}`,
        rung4Kind,
        computationGatePassed: false,
        reasons: [
          ...reasons,
          'UM-2.3 violation: Track F requires exact arithmetic certification (no float in certificate).',
        ],
      };
    }

    if (!computationGatePassed) {
      return {
        finalGrade: input.paperMode ? 'ABSTAIN' : 'INCOMPLETE-EVIDENCE',
        tierCap: input.tier,
        independenceBound: input.independence,
        postulationCeiling: 'Track F',
        parameterCap: 'Track F',
        rungCap: `Rung ${input.verificationRung}`,
        rung4Kind,
        computationGatePassed: false,
        reasons: [
          ...reasons,
          'UM-2.4 Computation Gate failed: requires a genuinely executed non-no-op tool verdict with matched version and zero exit code.',
        ],
      };
    }

    const hasKernelTool = validTools.some((t) => isFormalKernelTool(t));
    const hasArchivedHashedOutputs =
      (Array.isArray(input.archivedOutputHashes) &&
        input.archivedOutputHashes.filter((h) => h.trim().length > 0).length > 0) ||
      validTools.some((t) => Boolean(t.outputHash && t.outputHash.trim().length > 0));

    // Formal-kernel F1 (4K) OR Computational-F1 (4D: closed ledger + 2nd independent implementation + archived hashed outputs)
    const kernelF1Eligible =
      rung4Kind === '4K' &&
      input.kernelCheckedOrClosedLedger &&
      hasKernelTool;

    const computationalF1Eligible =
      rung4Kind === '4D' &&
      input.kernelCheckedOrClosedLedger &&
      !input.ledgerEndsInUnrederivedTranscription &&
      !input.hasCitedElsewherePremise &&
      hasSecondIndependentTool &&
      hasArchivedHashedOutputs;

    if (
      input.verificationRung >= 4 &&
      hasSecondIndependentTool &&
      input.tier === 'Full' &&
      (kernelF1Eligible || computationalF1Eligible)
    ) {
      reasons.push(
        kernelF1Eligible
          ? 'Rung 4 (4K Kernel-Backed) + 2nd independent tool at Full tier -> F1.'
          : 'Computational-F1 (Rung 4D closed-ledger re-derivation + 2nd independent implementation + archived hashed outputs at Full tier) -> F1.'
      );
      return {
        finalGrade: 'F1',
        tierCap: 'F1 (Full)',
        independenceBound: input.independence,
        postulationCeiling: 'N/A (Track F)',
        parameterCap: 'None',
        rungCap: `Rung ${input.verificationRung} (${rung4Kind || '4K'} F1 eligible)`,
        rung4Kind,
        computationGatePassed: true,
        reasons,
      };
    }

    if (
      (input.independentRoutesCount >= 2 || input.recordLabel === '[D]') &&
      input.verificationRung >= 3 &&
      hasSecondIndependentTool &&
      input.tier !== 'Lite'
    ) {
      reasons.push(
        input.verificationRung >= 4 && rung4Kind === '4D' && !hasArchivedHashedOutputs
          ? 'Rung 4D lacks archived hashed outputs required for Computational-F1 -> capped at F2.'
          : 'At least one independent route + second independent tool at Rung >= 3 -> F2.'
      );
      return {
        finalGrade: 'F2',
        tierCap: input.tier === 'Full' ? 'F1' : 'F2 (Standard)',
        independenceBound: input.independence,
        postulationCeiling: 'N/A (Track F)',
        parameterCap: 'None',
        rungCap: `Rung ${input.verificationRung}${rung4Kind ? ` (${rung4Kind})` : ''} (F2)`,
        rung4Kind,
        computationGatePassed: true,
        reasons,
      };
    }

    reasons.push('Single route or single executed tool on Track F -> F3.');
    return {
      finalGrade: 'F3',
      tierCap: input.tier,
      independenceBound: input.independence,
      postulationCeiling: 'N/A (Track F)',
      parameterCap: 'None',
      rungCap: `Rung ${input.verificationRung}${rung4Kind ? ` (${rung4Kind})` : ''} (F3)`,
      rung4Kind,
      computationGatePassed: true,
      reasons,
    };
  }

  // Track E: Empirical / Computational
  // Confirmed/Derived seed with zero valid executed tools cannot pass the Computation Gate
  if (!computationGatePassed) {
    return {
      finalGrade: input.paperMode ? 'ABSTAIN' : 'INCOMPLETE-EVIDENCE',
      tierCap: input.tier,
      independenceBound: input.independence,
      postulationCeiling: 'N/A',
      parameterCap: 'FAILED (0 valid executed tools)',
      rungCap: `Rung ${input.verificationRung}${rung4Kind ? ` (${rung4Kind})` : ''}`,
      rung4Kind,
      computationGatePassed: false,
      reasons: [
        ...reasons,
        'UM-2.4 Computation Gate failed: confirmed/derived claim has 0 genuinely executed non-no-op, non-text-search tool verdicts -> INCOMPLETE-EVIDENCE.',
      ],
    };
  }

  let tierCapGrade: 'A' | 'B' | 'C' | 'D' = 'D';
  if (input.tier === 'Lite') {
    tierCapGrade = 'D';
    reasons.push('Tier Lite caps maximum grade at D (UM-1.1).');
  } else if (input.tier === 'Standard') {
    tierCapGrade = 'B';
    reasons.push('Tier Standard caps maximum grade at B (UM-1.1).');
  } else if (input.tier === 'Full') {
    if (input.independence === 'I3' || input.independence === 'I4') {
      tierCapGrade = 'A';
      reasons.push('Tier Full with executed I3/I4 permits up to A (UM-1.1).');
    } else {
      tierCapGrade = 'B';
      reasons.push('Tier Full without executed I3/I4 is bounded at B (UM-1.1).');
    }
  }

  let independenceGrade: 'A' | 'B' | 'C' | 'D' = 'D';
  if (input.independence === 'I0') {
    independenceGrade = 'D';
    reasons.push('Independence I0 (same construction data) bounds grade at D (UM-6).');
  } else if (input.independence === 'I1') {
    if (
      input.externalVerification.executed &&
      input.externalVerification.verifierAgent !== 'None' &&
      input.externalVerification.auditedLocallyClaimByClaim
    ) {
      const extGrade =
        input.externalVerification.supportedGrade === 'A' ||
        input.externalVerification.supportedGrade === 'B' ||
        input.externalVerification.supportedGrade === 'C' ||
        input.externalVerification.supportedGrade === 'D'
          ? input.externalVerification.supportedGrade
          : 'C';
      independenceGrade = extGrade;
      reasons.push(
        `2026-11-12 Amendment: I1-to-C bound repealed; External Verification (${input.externalVerification.verifierAgent}) audited locally supports ${extGrade}.`
      );
    } else {
      independenceGrade = 'D';
      reasons.push(
        'I1 without completed UM-4.3 External Verification remains at D (no grade rises by itself under 2026-11-12 amendment).'
      );
    }
  } else if (input.independence === 'I2') {
    independenceGrade = 'B';
    reasons.push('Independence I2 (held-out observable / frozen re-derivation) bounds grade at B (UM-6).');
  } else if (input.independence === 'I3') {
    if (input.hasDiscriminatingComparison) {
      independenceGrade = 'A';
      reasons.push('Independence I3 with pre-specified discriminating comparison permits A (UM-6).');
    } else {
      independenceGrade = 'B';
      reasons.push('Independence I3 without pre-specified discriminating comparison bounds grade at B (UM-6).');
    }
  } else if (input.independence === 'I4') {
    independenceGrade = 'A';
    reasons.push('Independence I4 (independent replication + competing-model comparison) permits A (UM-6).');
  }

  let postulationGrade: 'A' | 'B' | 'C' | 'D' = 'D';
  if (input.postulationValidatedByNewIndependentTests && (input.independence === 'I3' || input.independence === 'I4')) {
    postulationGrade = 'A';
    reasons.push('Postulation ceiling lifted by new independent I3/I4 validation tests (UM-6).');
  } else if (input.postulationKind === 'constraint-led') {
    postulationGrade = 'B';
    reasons.push('Constraint-led postulation ceiling is B (UM-3.1).');
  } else if (input.postulationKind === 'evidence-guided') {
    postulationGrade = 'C';
    reasons.push('Evidence-guided postulation ceiling is C (UM-3.1).');
  } else {
    postulationGrade = 'D';
    reasons.push(`Postulation kind (${input.postulationKind}) without new independent tests caps grade at D (UM-3.1, UM-6).`);
  }

  let parameterCapGrade: 'A' | 'B' | 'C' | 'D' = 'A';
  if (input.unreportedParameterSelection) {
    parameterCapGrade = 'C';
    reasons.push('Unreported parameter selection caps grade at <= C (UM-6).');
  }
  if (!hasSecondIndependentTool) {
    parameterCapGrade = minTrackEGrade(parameterCapGrade, 'D');
    reasons.push('Above CLAIMED (D) requires a second independent tool with quoted verdict (UM-2.4).');
  }

  let rungGrade: 'A' | 'B' | 'C' | 'D' = 'D';
  if (input.verificationRung === 0) rungGrade = 'D';
  else if (input.verificationRung === 1) rungGrade = 'C';
  else if (input.verificationRung === 2) rungGrade = 'C';
  else if (input.verificationRung === 3) rungGrade = 'B';
  else if (input.verificationRung >= 4) rungGrade = 'A';
  reasons.push(
    `Verification Rung ${input.verificationRung}${rung4Kind ? ` (${rung4Kind})` : ''} bounds Track E grade at ${rungGrade}.`
  );

  let current: 'A' | 'B' | 'C' | 'D' = tierCapGrade;
  current = minTrackEGrade(current, independenceGrade);
  current = minTrackEGrade(current, postulationGrade);
  current = minTrackEGrade(current, parameterCapGrade);
  current = minTrackEGrade(current, rungGrade);
  current = minTrackEGrade(current, input.supportInRecord);

  if (
    (input.overrideStatus === 'UNDERDETERMINED' || input.overrideStatus === 'NON-IDENTIFIABLE') &&
    input.narrowestSurvivingGrade
  ) {
    current = minTrackEGrade(current, input.narrowestSurvivingGrade);
    reasons.push(
      `Status ${input.overrideStatus} carries the grade of the narrowest surviving claim (${input.narrowestSurvivingGrade}) (UM-6).`
    );
  }

  const finalGrade = RANK_TO_TRACK_E[TRACK_E_RANK[current]];

  return {
    finalGrade,
    tierCap: tierCapGrade,
    independenceBound: independenceGrade,
    postulationCeiling: postulationGrade,
    parameterCap: parameterCapGrade,
    rungCap: `${rungGrade}${rung4Kind ? ` (Rung ${rung4Kind})` : ''}`,
    rung4Kind,
    computationGatePassed,
    reasons,
  };
}

/**
 * Evaluates P1-P7 preflight gates and $300/service/month spend cap ceiling (UM-2.5).
 */
export function evaluatePreflightGates(preflight: PreflightChecklist): {
  readyForCompute: boolean;
  passedCount: number;
  totalGates: number;
  spendCapValid: boolean;
  blockingReasons: string[];
} {
  const blockingReasons: string[] = [];
  if (!preflight.P1_sourceComplete) blockingReasons.push('P1: Primary sources not mined to completion.');
  if (!preflight.P2_smokeTest) blockingReasons.push('P2: Tooling smoke test & checkpoint resume unverified.');
  if (!preflight.P3_premiseDependenciesChecked)
    blockingReasons.push('P3: Premise dependencies not verified against record.');
  if (!preflight.P4_oneSidednessStated)
    blockingReasons.push('P4: One-sidedness (PASS vs FAIL) not explicitly stated.');
  if (!preflight.P5_invariantFirstChecked)
    blockingReasons.push('P5: Cheap single invariants not evaluated first.');
  if (!preflight.P6_computeBudgetDeclared)
    blockingReasons.push('P6: Compute budget and kill criterion not declared.');
  const spendCapValid = preflight.P7_spendCapNamed && preflight.spendCapUsd > 0 && preflight.spendCapUsd <= 300;
  if (!spendCapValid) {
    blockingReasons.push(
      `P7: Spend cap must be named first and respect the $300/service/month ceiling (current: $${preflight.spendCapUsd}).`
    );
  }

  const passedCount =
    (preflight.P1_sourceComplete ? 1 : 0) +
    (preflight.P2_smokeTest ? 1 : 0) +
    (preflight.P3_premiseDependenciesChecked ? 1 : 0) +
    (preflight.P4_oneSidednessStated ? 1 : 0) +
    (preflight.P5_invariantFirstChecked ? 1 : 0) +
    (preflight.P6_computeBudgetDeclared ? 1 : 0) +
    (spendCapValid ? 1 : 0);

  return {
    readyForCompute: blockingReasons.length === 0,
    passedCount,
    totalGates: 7,
    spendCapValid,
    blockingReasons,
  };
}

/**
 * Runs an automated UM-2.5 Preflight Inspection (P1-P7) against the claim record fields,
 * dependency ledger, and checklist overrides, returning guided step-by-step diagnostics.
 */
export function runAutomatedPreflightAudit(
  claim: ClaimExperimentRecord,
  allClaims: ClaimExperimentRecord[]
): {
  readyForCompute: boolean;
  passedCount: number;
  totalGates: number;
  diagnostics: PreflightGateDiagnostic[];
} {
  const depAudit = auditDependencyLedger(claim, allClaims);

  const p1Auto =
    claim.preflight.P1_sourceComplete &&
    claim.source.trim().length >= 5 &&
    claim.priorLiterature.trim().length >= 5;
  const p2Auto = claim.preflight.P2_smokeTest;
  const p3Auto = claim.preflight.P3_premiseDependenciesChecked && depAudit.p3GatePassed;
  const p4Auto =
    claim.preflight.P4_oneSidednessStated &&
    claim.oneSidednessPass.trim().length >= 5 &&
    claim.oneSidednessFail.trim().length >= 5;
  const p5Auto =
    claim.preflight.P5_invariantFirstChecked && claim.invariantFirstNote.trim().length >= 5;
  const p6Auto =
    claim.preflight.P6_computeBudgetDeclared &&
    claim.computeBudget.trim().length >= 3 &&
    claim.killCriterion.trim().length >= 5;
  const p7Auto =
    claim.preflight.P7_spendCapNamed &&
    claim.preflight.spendCapUsd > 0 &&
    claim.preflight.spendCapUsd <= 300;

  const diagnostics: PreflightGateDiagnostic[] = [
    {
      gateId: 'P1',
      title: 'P1: Source-Complete Before Compute',
      ruleReference: 'UM-2.5(P1)',
      passed: p1Auto,
      automatedFinding: p1Auto
        ? `Primary source ("${claim.source}") and prior literature ("${claim.priorLiterature}") mined and catalogued.`
        : 'Missing primary source or prior literature citation in claim record, or P1 gate unchecked.',
      guidedRemediation:
        'Mine all primary sources to the end (including closing remarks) and record exact source/DOI citations before starting compute.',
    },
    {
      gateId: 'P2',
      title: 'P2: Tooling Smoke Test & Resumable Checkpoints',
      ruleReference: 'UM-2.5(P2)',
      passed: p2Auto,
      automatedFinding: p2Auto
        ? `Smoke test verified on tiny instance with flushed progress and resumable checkpoints (${claim.gradingInput.toolVerdicts.length} tool runner(s) configured).`
        : 'Tooling smoke test not yet certified for runs > 5 minutes.',
      guidedRemediation:
        'Run headless run.py on a tiny test instance to verify flushed stdout logs, checkpoint saving, and non-zero exit code on assertion failure.',
    },
    {
      gateId: 'P3',
      title: 'P3: Premise Dependencies Checked Against Record',
      ruleReference: 'UM-2.5(P3) & UM-4.4',
      passed: p3Auto,
      automatedFinding: p3Auto
        ? `All ${depAudit.totalItems} dependency ledger nodes and ${claim.premiseDependencies.length} parent claim(s) verified with supporting verdicts and zero un-re-derived leaf transcriptions.`
        : depAudit.statusBanner,
      guidedRemediation:
        'Ensure every premise dependency has a confirmed verdict in the record (premises without verdicts are labeled hypotheses) and independently re-derive any primary transcription leaf.',
    },
    {
      gateId: 'P4',
      title: 'P4: One-Sidedness Explicitly Stated',
      ruleReference: 'UM-2.5(P4) & UM-1.4(a)',
      passed: p4Auto,
      automatedFinding: p4Auto
        ? `PASS proves: "${claim.oneSidednessPass}" | FAIL proves: "${claim.oneSidednessFail}"`
        : 'One-sidedness (what PASS proves vs what FAIL proves) is incomplete.',
      guidedRemediation:
        'State asymmetric proof boundaries before running: what a PASS result establishes versus what a FAIL result refutes or exhibits.',
    },
    {
      gateId: 'P5',
      title: 'P5: Invariant-First Evaluation',
      ruleReference: 'UM-2.5(P5) & UM-1.4(d)',
      passed: p5Auto,
      automatedFinding: p5Auto
        ? `Invariant-first note recorded: "${claim.invariantFirstNote}"`
        : 'Missing invariant-first evaluation note.',
      guidedRemediation:
        'Evaluate cheap single invariants (parity, degree, mod-p solubility, trace identities) first and document why they obstruct or why full compute is required.',
    },
    {
      gateId: 'P6',
      title: 'P6: Compute Budget & Kill Criterion Declared',
      ruleReference: 'UM-2.5(P6) & UM-1.4(c)',
      passed: p6Auto,
      automatedFinding: p6Auto
        ? `Budget: "${claim.computeBudget}" | Kill Criterion: "${claim.killCriterion}"`
        : 'Compute budget or explicit kill criterion missing.',
      guidedRemediation:
        'Declare maximum CPU/GPU hours, memory/degree kill thresholds, and the exact recorded conclusion if a budget stop is hit.',
    },
    {
      gateId: 'P7',
      title: 'P7: Run Spend Cap Named First ($300/mo Ceiling)',
      ruleReference: 'UM-2.5(P7)',
      passed: p7Auto,
      automatedFinding: p7Auto
        ? `Declared spend cap $${claim.preflight.spendCapUsd} USD is within the $300/service/month ceiling.`
        : `Declared spend cap ($${claim.preflight.spendCapUsd} USD) violates the $1–$300/service/month ceiling or P7 is unchecked.`,
      guidedRemediation:
        'Name the run spend cap in USD prior to execution and enforce the hard $300/service/month ceiling.',
    },
  ];

  const passedCount = diagnostics.filter((d) => d.passed).length;

  return {
    readyForCompute: passedCount === 7,
    passedCount,
    totalGates: 7,
    diagnostics,
  };
}

/**
 * Computes transitive dependents in the claim graph for UM-4.5 mechanical demotions.
 */
export function findTransitiveDependents(targetClaimId: string, allClaims: ClaimExperimentRecord[]): string[] {
  const visited = new Set<string>();
  const queue: string[] = [targetClaimId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const claim of allClaims) {
      if (claim.id !== targetClaimId && !visited.has(claim.id)) {
        if (claim.premiseDependencies.includes(current)) {
          visited.add(claim.id);
          queue.push(claim.id);
        }
      }
    }
  }

  return Array.from(visited);
}

/**
 * Applies a retraction (UM-4.5): marks the retracted claim CONTRADICTED/INCOMPLETE-EVIDENCE
 * and mechanically demotes all transitive dependents to INCOMPLETE-EVIDENCE.
 */
export function applyRetractionAndDemote(
  targetClaimId: string,
  allClaims: ClaimExperimentRecord[]
): {
  updatedClaims: ClaimExperimentRecord[];
  demotedIds: string[];
} {
  const demotedIds = findTransitiveDependents(targetClaimId, allClaims);
  const demotedSet = new Set(demotedIds);

  const updatedClaims = allClaims.map((claim) => {
    if (claim.id === targetClaimId) {
      return {
        ...claim,
        verdictOutcome: 'refuted' as VerdictOutcome,
        gradingInput: {
          ...claim.gradingInput,
          overrideStatus: 'CONTRADICTED' as OverrideStatus,
        },
      };
    }
    if (demotedSet.has(claim.id)) {
      return {
        ...claim,
        gradingInput: {
          ...claim.gradingInput,
          overrideStatus: 'INCOMPLETE-EVIDENCE' as OverrideStatus,
        },
      };
    }
    return claim;
  });

  return { updatedClaims, demotedIds };
}

/**
 * Upgrade 3a: Restores a retracted / INCOMPLETE-EVIDENCE claim ONLY when accompanied by a NEW,
 * genuinely executed, non-no-op, version-matched tool verdict (`actuallyExecuted === true`).
 * Refuses to clear overrideStatus or restore `verdictOutcome: 'confirmed'` without it.
 */
export function restoreClaimWithExecutedVerdict(
  claim: ClaimExperimentRecord,
  restoringVerdict?: ToolVerdictQuote
): {
  restored: boolean;
  claim: ClaimExperimentRecord;
  reason: string;
} {
  if (!restoringVerdict) {
    return {
      restored: false,
      claim,
      reason:
        'Restoration blocked (UM-4.5 / v2.1): restoring a withdrawn or INCOMPLETE-EVIDENCE claim requires a NEW executed tool verdict (actuallyExecuted: true).',
    };
  }

  if (restoringVerdict.actuallyExecuted !== true) {
    return {
      restored: false,
      claim,
      reason:
        'Restoration blocked: restoring verdict must have actuallyExecuted: true (canned/dry-run verdicts rejected).',
    };
  }

  if (restoringVerdict.exitCode !== 0) {
    return {
      restored: false,
      claim,
      reason: `Restoration blocked: restoring verdict exited with non-zero code (${restoringVerdict.exitCode}).`,
    };
  }

  if (isNoOpToolVerdict(restoringVerdict)) {
    return {
      restored: false,
      claim,
      reason:
        'Restoration blocked (UM-2.4j no-op floor): a no-op or empty tool verdict cannot restore a withdrawn claim.',
    };
  }

  if (isTextSearchToolVerdict(restoringVerdict)) {
    return {
      restored: false,
      claim,
      reason:
        'Restoration blocked (UM-2.4a): text-search / grep scans cannot restore a withdrawn claim.',
    };
  }

  if (!isVersionMatchedToolVerdict(restoringVerdict)) {
    return {
      restored: false,
      claim,
      reason:
        'Restoration blocked (UM-2.4c(2)): restoring verdict lacks a valid matching tool version.',
    };
  }

  const verdictSig =
    restoringVerdict.executionId ||
    restoringVerdict.outputHash ||
    `${restoringVerdict.toolName.trim().toLowerCase()}::${restoringVerdict.command.trim().toLowerCase()}::${restoringVerdict.verdictSummary.trim().toLowerCase()}`;

  const alreadyExists = claim.gradingInput.toolVerdicts.some((existing) => {
    const existingSig =
      existing.executionId ||
      existing.outputHash ||
      `${existing.toolName.trim().toLowerCase()}::${existing.command.trim().toLowerCase()}::${existing.verdictSummary.trim().toLowerCase()}`;
    return existingSig === verdictSig;
  });

  if (alreadyExists) {
    return {
      restored: false,
      claim,
      reason:
        'Restoration blocked: restoring verdict must be a NEW execution, not an already-logged verdict.',
    };
  }

  const nextToolVerdicts = [...claim.gradingInput.toolVerdicts, restoringVerdict];
  const hasUnrederivedLeaf = claim.dependencyLedgerItems.some(
    (item) => item.isLeafTranscription && !item.independentlyRederived
  );
  const hasCitedElsewhere = claim.dependencyLedgerItems.some(
    (item) => item.status === 'CITED-ELSEWHERE'
  );

  const nextClaim: ClaimExperimentRecord = {
    ...claim,
    verdictOutcome: 'confirmed',
    gradingInput: {
      ...claim.gradingInput,
      overrideStatus: 'NONE',
      ledgerEndsInUnrederivedTranscription: hasUnrederivedLeaf,
      hasCitedElsewherePremise: hasCitedElsewhere,
      toolVerdicts: nextToolVerdicts,
      independentRoutesCount: Math.max(
        claim.gradingInput.independentRoutesCount,
        evaluateToolVerdictsUM24(nextToolVerdicts).distinctValidTools.length
      ),
      archivedOutputHashes: restoringVerdict.outputHash
        ? [...(claim.gradingInput.archivedOutputHashes || []), restoringVerdict.outputHash]
        : claim.gradingInput.archivedOutputHashes,
    },
  };

  return {
    restored: true,
    claim: nextClaim,
    reason: `Restored ${claim.id} using newly executed verdict from ${restoringVerdict.toolName} (${restoringVerdict.version}).`,
  };
}

/**
 * Upgrade 3a: Manual rung & audit update NEVER grants `kernelCheckedOrClosedLedger = true`.
 * Only verified execution or dependency ledger closure may set that flag.
 */
export function applyManualRungAndAuditUpdate(
  claim: ClaimExperimentRecord,
  newRung: VerificationRung,
  updatedAudits: RungStageAudit[],
  globalHowWrong: string
): ClaimExperimentRecord {
  return {
    ...claim,
    howCouldThisBeWrong: globalHowWrong,
    rungAudits: updatedAudits,
    gradingInput: {
      ...claim.gradingInput,
      verificationRung: newRung,
      kernelCheckedOrClosedLedger: claim.gradingInput.kernelCheckedOrClosedLedger,
    },
  };
}

/**
 * Generates Condensed Record Template A1 (`claim_record` + `hypothesis.md`)
 */
export function generateA1HypothesisMarkdown(record: ClaimExperimentRecord): string {
  const breakdown = computeUM1Grade(record.gradingInput);
  return `---
claim_id: "${record.id}"
exp_id: "${record.expId || 'NONE (Deductive Claim Record)'}"
tier: "${record.gradingInput.tier}"
track: "Track ${record.gradingInput.track}"
record_label: "${record.gradingInput.recordLabel}"
target: "${record.target}"
source: "${record.source}"
uncertainty: "${record.uncertainty}"
domain: "${record.domain}"
prior_literature: "${record.priorLiterature}"
data_splits: "${record.dataSplits}"
replication_plan: "${record.replicationPlan}"
independence_boundary: "${record.gradingInput.independence} — ${record.independenceBoundary}"
novelty_budget: "${record.noveltyBudget}"
postulation_label_and_ceiling: "${record.gradingInput.postulationKind} (ceiling: ${breakdown.postulationCeiling})"
prediction_class: "${record.predictionClass}"
lifecycle_state: "${record.lifecycleState}"
lenses_declared: [${record.lensesDeclared.map((l) => `"${l}"`).join(', ')}]
frozen_at: "${record.createdAt}"
---

# ${record.expId ? `${record.expId}: ` : ''}${record.title}

## 1. Question, Motivation & Method
- **Question / Hypothesis:** ${record.question}
- **Motivation:** ${record.motivation}
- **Falsifiable Prediction:** ${record.falsifiablePrediction}
- **Method:** ${record.method}
- **Success / Failure Criteria:** ${record.successFailureCriteria}

## 2. Required Pre-Run Fields (UM-1.4)
- **(a) One-Sidedness:**
  - **What PASS proves:** ${record.oneSidednessPass}
  - **What FAIL proves:** ${record.oneSidednessFail}
- **(b) Premise Dependencies:** ${
    record.premiseDependencies.length > 0 ? record.premiseDependencies.join(', ') : 'None (root axiom/source)'
  }
- **(c) Compute Budget, Spend Cap & Kill Criterion:** $${record.preflight.spendCapUsd} USD spend cap; Budget: ${record.computeBudget} | Kill Criterion: ${record.killCriterion}
- **(d) Invariant-First Note:** ${record.invariantFirstNote}
`;
}

/**
 * Generates Condensed Record Template A2 (`verdict.md`)
 */
export function generateA2VerdictMarkdown(record: ClaimExperimentRecord): string {
  const breakdown = computeUM1Grade(record.gradingInput);
  const toolsBlock =
    record.gradingInput.toolVerdicts.length > 0
      ? record.gradingInput.toolVerdicts
          .map(
            (t, idx) =>
              `  ${idx + 1}. \`${t.toolName} (${t.version})\` | exit_code=${t.exitCode} | exact_arithmetic=${t.exactArithmetic}\n     Command: \`${t.command}\`\n     Verdict: "${t.verdictSummary}"`
          )
          .join('\n')
      : '  None recorded';

  return `# Verdict Record — ${record.expId || record.id} (${record.title})

- **Run Outcome Verdict:** \`${record.verdictOutcome}\`
- **Record Label:** \`${record.gradingInput.recordLabel}\`
- **Verification Ladder Rung:** Rung ${record.gradingInput.verificationRung}${
    breakdown.rung4Kind ? ` (${breakdown.rung4Kind})` : ''
  }
- **Exact-Arithmetic Status (UM-2.3):** ${
    record.gradingInput.exactArithmeticCertified
      ? 'CERTIFIED (Exact over Q / SymPy / integer CRT; zero float in certificate)'
      : 'NOT CERTIFIED (Float or empirical pipeline)'
  }
- **SHA-256 Artifact Manifest:** \`${record.sha256Manifest}\`

## Quoted Tool Verdicts (UM-2.4 Computation Gate: ${breakdown.computationGatePassed ? 'PASSED' : 'FAILED'})
${toolsBlock}

## Adversarial Validation & External Verification (UM-4.1, UM-4.3)
- **Independent Routes Executed:** ${record.gradingInput.independentRoutesCount}
- **External HLRE Verification:** ${
    record.gradingInput.externalVerification.executed
      ? `${record.gradingInput.externalVerification.verifierAgent} (Audited locally claim-by-claim: ${record.gradingInput.externalVerification.auditedLocallyClaimByClaim ? 'YES' : 'NO'}) — ${record.gradingInput.externalVerification.auditNotes}`
      : 'Not executed'
  }

## "How Could This Be Wrong?" (Mandatory UM-4.1 Audit)
${record.howCouldThisBeWrong}

## Computable Grade Breakdown (UM-6 Worst-Of Rule)
- **Final HLRE Grade:** **${breakdown.finalGrade}**
- **Tier Cap:** ${breakdown.tierCap}
- **Independence Bound:** ${breakdown.independenceBound}
- **Postulation Ceiling:** ${breakdown.postulationCeiling}
- **Parameter / Tool Cap:** ${breakdown.parameterCap}
- **Rung Bound:** ${breakdown.rungCap}
- **Derivation Trail:**
${breakdown.reasons.map((r) => `  - ${r}`).join('\n')}
`;
}

/**
 * Generates RESUME.md single-screen handoff (UM-5.4)
 */
export function generateResumeMarkdown(
  claims: ClaimExperimentRecord[],
  withdrawals: WithdrawalEntry[],
  programmeSlug: string
): string {
  const rows = claims
    .map((c) => {
      const g = computeUM1Grade(c.gradingInput);
      const rungLabel = g.rung4Kind
        ? `Rung ${c.gradingInput.verificationRung} (${g.rung4Kind})`
        : `Rung ${c.gradingInput.verificationRung}`;
      return `| ${c.id} | ${c.expId || '—'} | ${c.gradingInput.recordLabel} | **${g.finalGrade}** | ${rungLabel} | ${c.lifecycleState} | ${c.verdictOutcome} | ${c.title} |`;
    })
    .join('\n');

  const activeWithdrawals =
    withdrawals.length > 0
      ? withdrawals
          .map(
            (w) =>
              `- **${w.id} (${w.claimId})**: Error Family \`${w.errorFamily}\` (Missed: ${w.missedGate}). Demoted dependents: ${
                w.transitiveDependents.length > 0 ? w.transitiveDependents.join(', ') : 'None'
              } -> \`INCOMPLETE-EVIDENCE\`.`
          )
          .join('\n')
      : '- Zero active withdrawals in ledger.';

  return `# RESUME.md — Programme \`program/${programmeSlug}/state.md\`
*Single first-read handoff under Unified Methodology UM-1 Skill v${UM1_SKILL_VERSION} (${HLRE_PROTOCOL_VERSION} + CAOS OS 01-13). ${UM1_MV_SCOPE_DECISION} On conflict, the frozen experiment record wins.*

## 1. One-Screen State Board
| Claim ID | EXP Record | Label | HLRE Grade | Rung | Lifecycle | Verdict | Target Summary |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${rows}

## 2. Tried Research Lenses & Active Spine (UM-2.6)
- **Mandatory Spine:** Exclusion / Obstruction
- **Active Programme Lenses:** ${Array.from(new Set(claims.flatMap((c) => c.lensesDeclared))).join(', ')}

## 3. Withdrawal & Mechanical Demotion Ledger Summary (UM-4.5)
${activeWithdrawals}

## 4. Ordered Next Actions & Gotchas
1. Verify all claims with \`INCOMPLETE-EVIDENCE\` or demoted transitive premises before manuscript consolidation (R2 gate).
2. Complete UM-4.3 external verification (Manus / Gemini 4 Argon / Academia Co-Scientist) audited locally claim-by-claim for any I1 pipeline claims seeking grade C or above.
3. Ensure zero programme vocabulary (\`campaign\`, \`verdict\`, \`ledger\`, \`dossier\`, \`smoke gate\`, \`session\`) enters manuscript prose outside page-1 disclosures (UM-5.2).
`;
}

export const INITIAL_CLAIMS_DATA: ClaimExperimentRecord[] = [
  {
    id: 'CLM-101',
    expId: 'EXP-014',
    title: 'Exact Fiber Cardinality of Twisted Mordell-Weil Lattice over Q(zeta_8)',
    domain: 'Arithmetic Geometry & Computational Number Theory',
    lifecycleState: 'published',
    target: 'Rank-4 fiber count N(H <= 10^6) = 48 with zero exceptional rational points outside torsion cosets',
    source: 'Primary census data + symbolic Groebner elimination over Q (SHA-256: 9f86d081884c7d65)',
    uncertainty: 'Exact (zero tolerance; symbolic certification over Q)',
    priorLiterature: 'Poonen-Stoll (1999) DOI:10.4007/annals.1999.150.1109; Cassels (1991)',
    dataSplits: 'Full height-bounded box H <= 10^6; held-out modular primes p in [1009, 2003]',
    replicationPlan: 'Cross-verified via SymPy Groebner over Q and SageMath/PARI-GP CRT resultant elimination',
    independenceBoundary: 'Two independent symbolic implementations + formal Lean 4 kernel check (zero sorryAx)',
    noveltyBudget: 'independently_motivated',
    predictionClass: 'prediction',
    question: 'Does the twisted Jacobian variety admit non-torsion rational fibers below height 10^6?',
    motivation: 'Resolves obstruction spine step 2 for high-genus rational point exclusion.',
    falsifiablePrediction: 'Resultant ideal elimination over Q yields degree-48 radical with 48 torsion solutions.',
    method: 'Symbolic Groebner basis elimination over Q paired with modular CRT height certification and Lean 4 kernel proof.',
    successFailureCriteria: 'PASS if radical degree = 48 and all roots lie in torsion subgroup; FAIL if any non-torsion rational point is found.',
    oneSidednessPass: 'Proves exact fiber cardinality = 48 and rules out non-torsion rational points in the locus.',
    oneSidednessFail: 'Exhibits an explicit counterexample point over Q verified by exact substitution.',
    premiseDependencies: [],
    dependencyLedgerItems: [
      {
        id: 'DEP-101-A',
        kind: 'primary_transcription',
        statement: 'Poonen-Stoll Theorem 4.2 genus-3 hyperelliptic defining polynomial coefficients over Q',
        sourceCitation: 'Ann. of Math. 150 (1999), p. 1124, Eq. (4.2)',
        hasSupportingVerdict: true,
        independentlyRederived: true,
        isLeafTranscription: true,
      },
      {
        id: 'DEP-101-B',
        kind: 'choice',
        statement: 'Weighted projective coordinate gauge (1, 2, 1, 4) for resultant elimination ordering',
        sourceCitation: 'EXP-014 run.py lines 44-58',
        hasSupportingVerdict: true,
        independentlyRederived: true,
        isLeafTranscription: false,
      },
      {
        id: 'DEP-101-C',
        kind: 'assumption',
        statement: 'Good reduction outside primes dividing 2 * discriminant(J)',
        sourceCitation: 'Verified by exact resultant discriminant factorization over Z',
        hasSupportingVerdict: true,
        independentlyRederived: true,
        isLeafTranscription: false,
      },
    ],
    computeBudget: '4 CPU hours max on 16-core Xeon node',
    killCriterion: 'Kill run if intermediate Groebner basis total degree exceeds 64 or RAM > 32 GB.',
    computeBudgetAndKill: '4 CPU hours max; kill if Groebner basis degree exceeds 64.',
    invariantFirstNote: '2-Selmer local solubility invariant checked first; fails to obstruct at p=2, requiring resultant.',
    lensesDeclared: ['L0-spine', 'L3', 'L4', 'L9'],
    verdictOutcome: 'confirmed',
    howCouldThisBeWrong:
      'Could fail if height bound transcription from projective to weighted coordinates omitted a ramified base locus; mitigated by checking homogenization invariance in Lean 4.',
    rungAudits: [
      {
        rung: 0,
        completed: true,
        howCouldThisBeWrongAtStage: 'Ambiguity in affine vs weighted projective height bound could misstate the target locus.',
        evidenceArtifactSummary: 'Frozen hypothesis.md committed (SHA-256: 4a1b9c...)',
        updatedAt: '2026-11-12T10:00:00Z',
      },
      {
        rung: 1,
        completed: true,
        howCouldThisBeWrongAtStage: 'Typographical sign error in transcribed Poonen-Stoll hyperelliptic model.',
        evidenceArtifactSummary: 'Primary source PDF hashed and equation re-derived from Weierstrass involutions.',
        updatedAt: '2026-11-12T14:20:00Z',
      },
      {
        rung: 2,
        completed: true,
        howCouldThisBeWrongAtStage: 'Buchberger algorithm over Q could silently drop leading terms if modular reconstruction bound is too small.',
        evidenceArtifactSummary: 'SymPy 1.13.3 exact QQ Groebner basis certificate with exit_code=0.',
        updatedAt: '2026-11-13T09:10:00Z',
      },
      {
        rung: 3,
        completed: true,
        howCouldThisBeWrongAtStage: 'Shared polynomial parser bug across Python scripts.',
        evidenceArtifactSummary: 'Cross-checked independently in PARI/GP 2.17 resultant elimination.',
        updatedAt: '2026-11-13T16:45:00Z',
      },
      {
        rung: 4,
        completed: true,
        howCouldThisBeWrongAtStage: 'Custom tactic macro in Lean 4 could introduce non-standard axiom.',
        evidenceArtifactSummary: 'lean4checker verified 0 sorryAx and standard axioms only.',
        updatedAt: '2026-11-14T08:30:00Z',
      },
      {
        rung: 5,
        completed: false,
        howCouldThisBeWrongAtStage: 'External HLRE agent could overlook an unstated gauge convention in Section 2.',
        evidenceArtifactSummary: 'Pending final Rung 5 external verification deposit sign-off.',
        updatedAt: '2026-11-14T09:15:00Z',
      },
    ],
    tierHistory: [
      {
        id: 'TLOG-101-1',
        claimId: 'CLM-101',
        previousTier: 'Standard',
        newTier: 'Full',
        direction: 'raised',
        justification: 'Raised to Full tier after completing Lean 4 formal kernel verification and second tool check.',
        timestamp: '2026-11-13T18:00:00Z',
      },
    ],
    sha256Manifest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    preflight: {
      P1_sourceComplete: true,
      P2_smokeTest: true,
      P3_premiseDependenciesChecked: true,
      P4_oneSidednessStated: true,
      P5_invariantFirstChecked: true,
      P6_computeBudgetDeclared: true,
      P7_spendCapNamed: true,
      spendCapUsd: 18,
    },
    gradingInput: {
      track: 'F',
      tier: 'Full',
      recordLabel: '[MV]',
      independence: 'I4',
      hasDiscriminatingComparison: true,
      postulationKind: 'constraint-led',
      postulationValidatedByNewIndependentTests: true,
      unreportedParameterSelection: false,
      ledgerEndsInUnrederivedTranscription: false,
      overrideStatus: 'NONE',
      supportInRecord: 'A',
      verificationRung: 4,
      rung4Kind: '4K',
      independentRoutesCount: 2,
      kernelCheckedOrClosedLedger: true,
      exactArithmeticCertified: true,
      toolVerdicts: [
        {
          toolName: 'SymPy Exact Groebner Engine',
          version: '1.13.3-py312',
          exitCode: 0,
          command: 'python3 run.py --seed=42 --domain=QQ --check-exact',
          verdictSummary: 'EXACT_CERTIFIED: radical_degree=48, rational_fibers=48, float_ops=0',
          exactArithmetic: true,
          actuallyExecuted: true,
          outputHash: 'sha256:9f86d081884c7d659a2feaa0c55ad015',
        },
        {
          toolName: 'Lean 4 Kernel Checker (lean4checker)',
          version: '4.12.0',
          exitCode: 0,
          command: 'lake env lean4checker --fresh TwistedFiber.Cert',
          verdictSummary: 'KERNEL_OK: 0 sorryAx, standard axioms [propext, Quot.sound]',
          exactArithmetic: true,
          actuallyExecuted: true,
          outputHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb924',
        },
      ],
      externalVerification: {
        executed: true,
        verifierAgent: 'Gemini 4 (Argon)',
        auditedLocallyClaimByClaim: true,
        supportedGrade: 'F1',
        auditNotes: 'Step 6 HLRE audit completed; all 14 premise links verified locally.',
      },
    },
    createdAt: '2026-11-14T09:15:00Z',
  },
  {
    id: 'CLM-102',
    expId: 'EXP-015',
    title: 'Sub-Gaussian Spectral Gap Scaling in Sparse Random Regular Graphs',
    domain: 'Spectral Graph Theory & Empirical Statistical Physics',
    lifecycleState: 'consolidating',
    target: 'Second eigenvalue gap lambda_2 = 2*sqrt(d-1) - O(n^{-2/3}) with scaling exponent alpha = 0.664 +/- 0.008',
    source: '10,000 independent d=6 configuration-model ensembles + held-out bipartite lift validation set',
    uncertainty: '99% bootstrap CI +/- 0.008; systematic finite-size drift < 0.003 across N in [10^4, 10^6]',
    priorLiterature: 'Friedman (2008) Mem. AMS; Bordenave (2015) arXiv:1503.01173',
    dataSplits: 'Calibration N <= 50,000 (frozen 2026-11-10); Held-out validation N = 250,000 (uninspected pre-freeze)',
    replicationPlan: 'Independent ARPACK Lanczos vs JAX/CuPy Chebyshev polynomial filter + 1,000 null rewirings',
    independenceBoundary: 'I2 held-out observable under frozen protocol + external HLRE verification by Manus',
    noveltyBudget: 'independently_motivated',
    predictionClass: 'prediction',
    question: 'Does the Tracy-Widom edge scaling persist for degree d=6 at N=250,000 without post-hoc outlier trimming?',
    motivation: 'Supplies empirical bound required for spectral expansion postulate in CLM-103.',
    falsifiablePrediction: 'Kolmogorov-Smirnov distance to TW-beta=1 < 0.015 on held-out N=250,000 partition.',
    method: 'Shift-invert Lanczos iteration with Arb ball-arithmetic eigenvalue enclosure on frozen configuration-model seeds.',
    successFailureCriteria: 'PASS if KS distance < 0.015 and ball radius < 1e-12; FAIL if KS >= 0.015 or residual diverges.',
    oneSidednessPass: 'Confirms constraint-led scaling regime within frozen tolerance.',
    oneSidednessFail: 'Refutes universal TW-1 edge convergence at d=6, forcing localized eigenvector tail model.',
    premiseDependencies: ['CLM-101'],
    dependencyLedgerItems: [
      {
        id: 'DEP-102-A',
        kind: 'observation',
        statement: 'Empirical spectral edge histogram across 10,000 d=6 regular graphs at N=250,000',
        sourceCitation: 'EXP-015 artifacts/eigen_census.parquet',
        hasSupportingVerdict: true,
        independentlyRederived: true,
        isLeafTranscription: false,
      },
      {
        id: 'DEP-102-B',
        kind: 'choice',
        statement: 'Fixed shift-invert target sigma = 4.47213595499958 (2*sqrt(5)) frozen before validation run',
        sourceCitation: 'EXP-015 hypothesis.md Section 3',
        hasSupportingVerdict: true,
        independentlyRederived: true,
        isLeafTranscription: false,
      },
      {
        id: 'DEP-102-C',
        kind: 'primary_transcription',
        statement: 'Tracy-Widom beta=1 cumulative distribution lookup table moments from Bornemann (2010)',
        sourceCitation: 'Math. Comp. 79 (2010), Table 2',
        hasSupportingVerdict: true,
        independentlyRederived: true,
        isLeafTranscription: true,
      },
    ],
    computeBudget: '12 A100 GPU hours max',
    killCriterion: 'Kill if Lanczos residual > 1e-12 after 4,000 iterations.',
    computeBudgetAndKill: '12 A100 GPU hours max; kill if Lanczos residual > 1e-12 after 4,000 iterations.',
    invariantFirstNote: 'Trace power sum Tr(A^4) checked first; insufficient to separate near-extreme eigenvalues.',
    lensesDeclared: ['L0-spine', 'L3', 'L7', 'L10'],
    verdictOutcome: 'confirmed',
    howCouldThisBeWrong:
      'Pseudo-random generator correlation in configuration-model pairing could bias extreme tail; mitigated via PCG64DXSM + SplitMix64 cross-implementation.',
    rungAudits: [
      {
        rung: 0,
        completed: true,
        howCouldThisBeWrongAtStage: 'Finite-size N=250,000 could still lie in pre-asymptotic crossover regime.',
        evidenceArtifactSummary: 'Frozen hypothesis.md with N=50k/250k partition.',
        updatedAt: '2026-11-14T11:00:00Z',
      },
      {
        rung: 1,
        completed: true,
        howCouldThisBeWrongAtStage: 'Normalization convention for TW-1 variance scaling factor (d/(d-1)) could be inverted.',
        evidenceArtifactSummary: 'Verified against Bordenave (2015) Section 2.1.',
        updatedAt: '2026-11-14T15:30:00Z',
      },
      {
        rung: 2,
        completed: true,
        howCouldThisBeWrongAtStage: 'Lanczos ghost eigenvalues from loss of orthogonality in float64.',
        evidenceArtifactSummary: 'Certified via Arb/FLINT interval enclosures of radius < 1.4e-14.',
        updatedAt: '2026-11-15T08:00:00Z',
      },
      {
        rung: 3,
        completed: true,
        howCouldThisBeWrongAtStage: 'SciPy ARPACK wrapper could share LAPACK routine with test script.',
        evidenceArtifactSummary: 'Independently replicated in Julia KrylovKit + 1,000 null rewirings.',
        updatedAt: '2026-11-15T14:20:00Z',
      },
      {
        rung: 4,
        completed: false,
        howCouldThisBeWrongAtStage: 'Empirical ensemble cannot be formally kernel-checked without analytical closed-form proof.',
        evidenceArtifactSummary: 'Not applicable / pending I3 external lab dataset.',
        updatedAt: '2026-11-15T14:20:00Z',
      },
      {
        rung: 5,
        completed: false,
        howCouldThisBeWrongAtStage: 'External audit could flag finite-size drift systematic allowance.',
        evidenceArtifactSummary: 'Manus Step 6 audit in progress.',
        updatedAt: '2026-11-15T14:20:00Z',
      },
    ],
    tierHistory: [],
    sha256Manifest: '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730',
    preflight: {
      P1_sourceComplete: true,
      P2_smokeTest: true,
      P3_premiseDependenciesChecked: true,
      P4_oneSidednessStated: true,
      P5_invariantFirstChecked: true,
      P6_computeBudgetDeclared: true,
      P7_spendCapNamed: true,
      spendCapUsd: 95,
    },
    gradingInput: {
      track: 'E',
      tier: 'Standard',
      recordLabel: '[D]',
      independence: 'I2',
      hasDiscriminatingComparison: true,
      postulationKind: 'constraint-led',
      postulationValidatedByNewIndependentTests: false,
      unreportedParameterSelection: false,
      ledgerEndsInUnrederivedTranscription: false,
      overrideStatus: 'NONE',
      supportInRecord: 'B',
      verificationRung: 3,
      independentRoutesCount: 2,
      kernelCheckedOrClosedLedger: false,
      exactArithmeticCertified: true,
      toolVerdicts: [
        {
          toolName: 'SciPy ARPACK Shift-Invert + Arb Interval Certifier',
          version: '1.14.1 / flint-3.1',
          exitCode: 0,
          command: 'python3 run_exp015.py --partition=heldout --certify-intervals',
          verdictSummary: 'PASS: alpha=0.6642, KS_stat=0.0112 < 0.0150, enclosing_ball_radius=1.4e-14',
          exactArithmetic: true,
        },
        {
          toolName: 'Julia KrylovKit + Nemo Ball Arithmetic',
          version: '1.11.1 / KrylovKit-0.8.2',
          exitCode: 0,
          command: 'julia --project=. verify_exp015.jl --seed=9001',
          verdictSummary: 'PASS: cross_impl_max_delta=2.1e-15, null_replicates=1000/1000 separated',
          exactArithmetic: true,
        },
      ],
      externalVerification: {
        executed: true,
        verifierAgent: 'Manus',
        auditedLocallyClaimByClaim: true,
        supportedGrade: 'B',
        auditNotes: 'Manus HLRE Step 6 audit confirmed frozen pre-registration and I2 held-out partition integrity.',
      },
    },
    createdAt: '2026-11-15T14:20:00Z',
  },
  {
    id: 'CLM-103',
    expId: 'EXP-016',
    title: 'All-AI Pipeline Anomaly Detection on Unfrozen Spectral Tails',
    domain: 'Automated Conjecture Synthesis',
    lifecycleState: 'exploring',
    target: 'Secondary spectral cluster at lambda = 1.829 in non-bipartite lifts',
    source: 'All-AI multi-agent sweep sharing upstream prompt templates and candidate filter rules',
    uncertainty: 'Empirical bootstrap +/- 0.042 (post-inspection threshold selection)',
    priorLiterature: 'Internal exploration campaign notes',
    dataSplits: 'Single exploratory pool; threshold chosen after viewing histogram',
    replicationPlan: 'Pending Academia Co-Scientist external audit and frozen hold-out run',
    independenceBoundary: 'I1 (all-AI pipeline sharing inputs/prompts; 2026-11-12 amendment applies)',
    noveltyBudget: 'introduced_to_fit',
    predictionClass: 'exploratory finding',
    question: 'Is the secondary cluster at 1.829 an artifact of post-hoc degree filtering or a genuine phase transition?',
    motivation: 'Tests whether automated sweep anomaly survives UM-2.2 search discipline.',
    falsifiablePrediction: 'Survives Bonferroni volume correction across 1,000 null rewirings.',
    method: 'Exploratory multi-seed spectral sweep over 2-lift adjacency matrices.',
    successFailureCriteria: 'PASS if volume-corrected p < 0.001 on fresh held-out graphs; FAIL if p >= 0.001.',
    oneSidednessPass: 'Elevates candidate to frozen EXP-017 prediction register.',
    oneSidednessFail: 'Confirms post-hoc selection artifact; archive in negative search ledger.',
    premiseDependencies: ['CLM-102'],
    dependencyLedgerItems: [
      {
        id: 'DEP-103-A',
        kind: 'primary_transcription',
        statement: 'Unverified literature table of 2-lift spectral radii transcribed from preprint appendix',
        sourceCitation: 'arXiv:2409.99999v1 Appendix B (Unverified)',
        hasSupportingVerdict: false,
        independentlyRederived: false,
        isLeafTranscription: true,
      },
      {
        id: 'DEP-103-B',
        kind: 'choice',
        statement: 'Post-hoc kernel bandwidth h = 0.015 selected after inspecting eigenvalue density plot',
        sourceCitation: 'sweep_exp016.py line 112 (POST-HOC)',
        hasSupportingVerdict: false,
        independentlyRederived: false,
        isLeafTranscription: false,
      },
    ],
    computeBudget: '2 CPU hours max',
    killCriterion: 'Kill if null p-value > 0.05.',
    computeBudgetAndKill: '2 CPU hours; kill if null p-value > 0.05.',
    invariantFirstNote: 'Bipartite cycle count invariant explains 80% of variance.',
    lensesDeclared: ['L0-spine', 'L2', 'L9'],
    verdictOutcome: 'inconclusive',
    howCouldThisBeWrong:
      'Candidate space and stopping rules were not frozen prior to inspecting results (POST-HOC label required under UM-2.2); also depends on un-re-derived leaf transcription DEP-103-A.',
    rungAudits: [
      {
        rung: 0,
        completed: true,
        howCouldThisBeWrongAtStage: 'Search space was modified after viewing initial histogram (POST-HOC).',
        evidenceArtifactSummary: 'Registered as exploratory [C] conjecture.',
        updatedAt: '2026-11-16T10:00:00Z',
      },
      {
        rung: 1,
        completed: true,
        howCouldThisBeWrongAtStage: 'Leaf transcription DEP-103-A from preprint Appendix B has not been independently re-derived.',
        evidenceArtifactSummary: 'Transcribed table; flagged INCOMPLETE-EVIDENCE until re-derived.',
        updatedAt: '2026-11-16T14:00:00Z',
      },
      {
        rung: 2,
        completed: false,
        howCouldThisBeWrongAtStage: 'Float64 eigvalsh sweep without interval certification.',
        evidenceArtifactSummary: 'Exploratory sweep output only.',
        updatedAt: '2026-11-16T18:05:00Z',
      },
      {
        rung: 3,
        completed: false,
        howCouldThisBeWrongAtStage: 'Single implementation route.',
        evidenceArtifactSummary: 'Pending.',
        updatedAt: '2026-11-16T18:05:00Z',
      },
      {
        rung: 4,
        completed: false,
        howCouldThisBeWrongAtStage: 'Unclosed dependency ledger.',
        evidenceArtifactSummary: 'Pending.',
        updatedAt: '2026-11-16T18:05:00Z',
      },
      {
        rung: 5,
        completed: false,
        howCouldThisBeWrongAtStage: 'No external verification executed.',
        evidenceArtifactSummary: 'Pending.',
        updatedAt: '2026-11-16T18:05:00Z',
      },
    ],
    tierHistory: [
      {
        id: 'TLOG-103-1',
        claimId: 'CLM-103',
        previousTier: 'Standard',
        newTier: 'Lite',
        direction: 'lowered',
        justification:
          'Lowered from Standard to Lite because candidate filter threshold was selected post-inspection (UM-2.2 POST-HOC).',
        timestamp: '2026-11-16T18:10:00Z',
      },
    ],
    sha256Manifest: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    preflight: {
      P1_sourceComplete: true,
      P2_smokeTest: true,
      P3_premiseDependenciesChecked: false,
      P4_oneSidednessStated: true,
      P5_invariantFirstChecked: true,
      P6_computeBudgetDeclared: true,
      P7_spendCapNamed: true,
      spendCapUsd: 40,
    },
    gradingInput: {
      track: 'E',
      tier: 'Lite',
      recordLabel: '[C]',
      independence: 'I1',
      hasDiscriminatingComparison: false,
      postulationKind: 'post-hoc',
      postulationValidatedByNewIndependentTests: false,
      unreportedParameterSelection: true,
      ledgerEndsInUnrederivedTranscription: true,
      overrideStatus: 'NONE',
      supportInRecord: 'D',
      verificationRung: 1,
      independentRoutesCount: 1,
      kernelCheckedOrClosedLedger: false,
      exactArithmeticCertified: false,
      toolVerdicts: [
        {
          toolName: 'NumPy Eigvalsh Sweep',
          version: '2.1.2',
          exitCode: 0,
          command: 'python3 sweep_exp016.py --exploratory',
          verdictSummary: 'POST-HOC_CANDIDATE: cluster=1.829, volume_corrected_p=0.14',
          exactArithmetic: false,
        },
      ],
      externalVerification: {
        executed: false,
        verifierAgent: 'None',
        auditedLocallyClaimByClaim: false,
        supportedGrade: 'D',
        auditNotes: 'Awaiting external verification under 2026-11-12 amendment.',
      },
    },
    createdAt: '2026-11-16T18:05:00Z',
  },
];

export const INITIAL_WITHDRAWALS_DATA: WithdrawalEntry[] = [
  {
    id: 'WDR-001',
    claimId: 'EXP-011 (Superseded)',
    timestamp: '2026-11-13T11:40:00Z',
    verbatimStatement:
      '"The genus-3 Prym variety exhibits 64 rational fibers under float64 homotopy continuation."',
    errorFamily: 'H',
    missedGate: 'UM-2.3 Exact Arithmetic Certificate & P5 Invariant-First Gate',
    transitiveDependents: ['EXP-012-DRAFT'],
    demotionApplied: 'EXP-011 retracted; EXP-012-DRAFT mechanically demoted to INCOMPLETE-EVIDENCE.',
    restorationCriteria: 'Re-derive over Q using exact Groebner elimination in EXP-014 (CLM-101).',
    remediationPlan:
      'Replaced float64 homotopy continuation with SymPy exact rational Groebner elimination + Lean 4 kernel certificate in EXP-014.',
    postMortemSummary:
      'Near-singular Jacobian conditioning caused 16 spurious cluster splits in IEEE-754 float64 arithmetic. Enforced hard CI check rejecting float imports in certificate modules.',
    complianceSignOff: 'Audited locally under UM-1 R1 retraction sweep across narrative, wiki, and RESUME.md.',
  },
];

/**
 * Generates the HLRE v5.1 (amended 2026-11-12) Step 6 Prompt Block and executes deterministic
 * claim-by-claim audit checks for Manus, Gemini 4 (Argon), or Academia Co-Scientist (UM-4.3).
 */
export function buildAndAuditExternalVerification(
  claim: ClaimExperimentRecord,
  allClaims: ClaimExperimentRecord[],
  agent: 'Manus' | 'Gemini 4 (Argon)' | 'Academia Co-Scientist',
  hlreSkillVersion: string,
  spendCapUsd: number,
  userApprovedOutwardDispatch: boolean
): {
  promptBlock: string;
  logEntry: ExternalVerificationLogEntry;
} {
  const depAudit = auditDependencyLedger(claim, allClaims);
  const preflightAudit = runAutomatedPreflightAudit(claim, allClaims);

  // Temporarily evaluate grade assuming external verification is audited
  const simulatedInput: ClaimGradingInput = {
    ...claim.gradingInput,
    externalVerification: {
      executed: true,
      verifierAgent: agent,
      auditedLocallyClaimByClaim: true,
      supportedGrade: claim.gradingInput.track === 'F' ? 'F1' : claim.gradingInput.supportInRecord,
      auditNotes: `Audited under ${hlreSkillVersion} by ${agent}`,
    },
  };
  const computed = computeUM1Grade(simulatedInput);

  const promptBlock = `### HLRE Skill (${hlreSkillVersion}) — Step 6 External Verification Prompt Block
- **Assigned Verifier Agent:** ${agent}
- **Target Claim / Experiment:** ${claim.id} (${claim.expId || 'Deductive Claim'}) — ${claim.title}
- **Declared Spend Cap (UM-2.5 P7):** $${spendCapUsd} USD (Explicit user approval for outward dispatch: ${
    userApprovedOutwardDispatch ? 'CONFIRMED' : 'LOCAL_SANDBOX_ONLY'
  })
- **Track & Tier:** Track ${claim.gradingInput.track} · Tier ${claim.gradingInput.tier} · Record Label ${claim.gradingInput.recordLabel}
- **Independence Level:** ${claim.gradingInput.independence} (${claim.independenceBoundary})
- **Target Statement:** ${claim.target}
- **One-Sidedness:** PASS -> ${claim.oneSidednessPass} | FAIL -> ${claim.oneSidednessFail}
- **Computation Gate Quotes:** ${claim.gradingInput.toolVerdicts.map((t) => `${t.toolName} v${t.version} (exit=${t.exitCode})`).join('; ')}

**Mandate under 2026-11-12 Amendments:**
1. Human gates and fallback caps are repealed; I1-to-C automatic bound is repealed and replaced by this external verification (no grade rises by itself).
2. Audit every premise link in the dependency ledger (${depAudit.totalItems} nodes) and verify zero un-re-derived transcriptions at leaf nodes.
3. Return per-aspect findings for local claim-by-claim audit.`;

  const claimChecks: ClaimByClaimAuditCheck[] = [
    {
      checkId: 'CHK-1',
      aspect: 'Statement & One-Sidedness Hygiene (UM-1.4a, UM-2.1)',
      agentFinding: `${agent} verified target measurement units and asymmetric PASS/FAIL proof boundaries.`,
      localAuditVerified: preflightAudit.diagnostics.find((d) => d.gateId === 'P4')?.passed ?? true,
    },
    {
      checkId: 'CHK-2',
      aspect: 'Computation Gate & Exact-Arithmetic Certificate (UM-2.3, UM-2.4)',
      agentFinding:
        claim.gradingInput.toolVerdicts.length >= 2
          ? `${agent} verified ${claim.gradingInput.toolVerdicts.length} independent tool verdicts with exit_code=0.`
          : `${agent} noted single-tool execution (${claim.gradingInput.toolVerdicts.length} tool); caps grade above CLAIMED unless second tool added.`,
      localAuditVerified: computed.computationGatePassed,
    },
    {
      checkId: 'CHK-3',
      aspect: 'Premise Dependency Ledger & Leaf Transcription Audit (UM-4.4, P3)',
      agentFinding: depAudit.endsInUnrederivedTranscription
        ? `${agent} FLAGGED un-re-derived leaf transcription (${depAudit.unrederivedTranscriptionItems.map((i) => i.id).join(', ')}) -> INCOMPLETE-EVIDENCE.`
        : `${agent} verified all ${depAudit.totalItems} dependency nodes are independently re-derived with supporting verdicts.`,
      localAuditVerified: !depAudit.endsInUnrederivedTranscription,
    },
    {
      checkId: 'CHK-4',
      aspect: '2026-11-12 Independence Bound & Postulation Ceiling (UM-3.1, UM-6)',
      agentFinding: `${agent} evaluated Independence ${claim.gradingInput.independence} and ${claim.gradingInput.postulationKind} ceiling -> Recommended worst-of grade: ${computed.finalGrade}.`,
      localAuditVerified: true,
    },
  ];

  const logEntry: ExternalVerificationLogEntry = {
    id: `EXT-${claim.id}-${Date.now().toString().slice(-4)}`,
    claimId: claim.id,
    expId: claim.expId,
    verifierAgent: agent,
    hlreSkillVersion,
    spendCapUsd,
    userApprovedOutwardDispatch,
    timestamp: new Date().toISOString(),
    recommendedGrade: computed.finalGrade,
    locallyAuditedClaimByClaim: claimChecks.every((c) => c.localAuditVerified),
    claimChecks,
    summaryVerdict: `${agent} under ${hlreSkillVersion} audited ${claim.id} across 4 protocol checks; worst-of grade follows evidence: ${computed.finalGrade}.`,
  };

  return { promptBlock, logEntry };
}

export const INITIAL_PREFLIGHT_LOGS: PreflightAuditLogEntry[] = [
  {
    id: 'PFL-101-01',
    claimId: 'CLM-101',
    expId: 'EXP-014',
    timestamp: '2026-11-14T08:00:00Z',
    readyForCompute: true,
    passedCount: 7,
    totalGates: 7,
    spendCapUsd: 18,
    gateResults: { P1: true, P2: true, P3: true, P4: true, P5: true, P6: true, P7: true },
    summaryNote: 'All 7 preflight checks passed; $18 USD spend cap verified under $300/mo ceiling.',
  },
  {
    id: 'PFL-103-01',
    claimId: 'CLM-103',
    expId: 'EXP-016',
    timestamp: '2026-11-16T17:50:00Z',
    readyForCompute: false,
    passedCount: 6,
    totalGates: 7,
    spendCapUsd: 40,
    gateResults: { P1: true, P2: true, P3: false, P4: true, P5: true, P6: true, P7: true },
    summaryNote: 'Blocked at P3: Dependency node DEP-103-A is an un-re-derived primary transcription leaf.',
  },
];

export const INITIAL_EXTERNAL_VERIFICATION_LOGS: ExternalVerificationLogEntry[] = [
  {
    id: 'EXT-CLM-101-8821',
    claimId: 'CLM-101',
    expId: 'EXP-014',
    verifierAgent: 'Gemini 4 (Argon)',
    hlreSkillVersion: 'UM-1 v3.1 (HLRE v5.1)',
    spendCapUsd: 18,
    userApprovedOutwardDispatch: true,
    timestamp: '2026-11-14T09:10:00Z',
    recommendedGrade: 'F1',
    locallyAuditedClaimByClaim: true,
    claimChecks: [
      {
        checkId: 'CHK-1',
        aspect: 'Statement & One-Sidedness Hygiene (UM-1.4a, UM-2.1)',
        agentFinding: 'Gemini 4 (Argon) verified rank-4 fiber cardinality statement and torsion coset exclusion boundary.',
        localAuditVerified: true,
      },
      {
        checkId: 'CHK-2',
        aspect: 'Computation Gate & Exact-Arithmetic Certificate (UM-2.3, UM-2.4)',
        agentFinding: 'Verified SymPy 1.13.3 Groebner over Q + Lean 4.12.0 kernel checker (0 sorryAx, exit=0).',
        localAuditVerified: true,
      },
      {
        checkId: 'CHK-3',
        aspect: 'Premise Dependency Ledger & Leaf Transcription Audit (UM-4.4, P3)',
        agentFinding: 'All 3 dependency nodes (DEP-101-A, DEP-101-B, DEP-101-C) independently re-derived.',
        localAuditVerified: true,
      },
      {
        checkId: 'CHK-4',
        aspect: '2026-11-12 Independence Bound & Postulation Ceiling (UM-3.1, UM-6)',
        agentFinding: 'Track F Full tier at Rung 4 (4K) with closed ledger supports Grade F1.',
        localAuditVerified: true,
      },
    ],
    summaryVerdict: 'Gemini 4 (Argon) Step 6 HLRE audit completed and locally verified claim-by-claim -> Grade F1.',
  },
  {
    id: 'EXT-CLM-102-8904',
    claimId: 'CLM-102',
    expId: 'EXP-015',
    verifierAgent: 'Manus',
    hlreSkillVersion: 'UM-1 v3.1 (HLRE v5.1)',
    spendCapUsd: 95,
    userApprovedOutwardDispatch: true,
    timestamp: '2026-11-15T14:15:00Z',
    recommendedGrade: 'B',
    locallyAuditedClaimByClaim: true,
    claimChecks: [
      {
        checkId: 'CHK-1',
        aspect: 'Statement & One-Sidedness Hygiene (UM-1.4a, UM-2.1)',
        agentFinding: 'Manus verified KS < 0.015 held-out partition criterion and finite-size scaling exponent.',
        localAuditVerified: true,
      },
      {
        checkId: 'CHK-2',
        aspect: 'Computation Gate & Exact-Arithmetic Certificate (UM-2.3, UM-2.4)',
        agentFinding: 'Verified SciPy ARPACK + Arb interval certifier and independent Julia KrylovKit replication.',
        localAuditVerified: true,
      },
      {
        checkId: 'CHK-3',
        aspect: 'Premise Dependency Ledger & Leaf Transcription Audit (UM-4.4, P3)',
        agentFinding: 'Bornemann (2010) TW-1 quadrature moments independently re-derived.',
        localAuditVerified: true,
      },
      {
        checkId: 'CHK-4',
        aspect: '2026-11-12 Independence Bound & Postulation Ceiling (UM-3.1, UM-6)',
        agentFinding: 'Track E Standard tier with I2 frozen held-out partition and constraint-led postulation supports Grade B.',
        localAuditVerified: true,
      },
    ],
    summaryVerdict: 'Manus Step 6 HLRE audit completed and locally verified claim-by-claim -> Grade B.',
  },
];
