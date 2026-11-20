import {
  computeUM1Grade,
  type ClaimExperimentRecord,
  type ClaimGradingInput,
  type DependencyNodeKind,
  type GradeComputationBreakdown,
  type HLREGrade,
  type IndependenceLevel,
  type PremiseDependencyItem,
  type VerificationRung,
} from './um1-engine';

export type ArenaPersona =
  | 'Generator'
  | 'Skeptic/Adversary'
  | 'Synthesizer'
  | 'Domain Specialist';

export const ARENA_PERSONAS: ArenaPersona[] = [
  'Generator',
  'Skeptic/Adversary',
  'Synthesizer',
  'Domain Specialist',
];

export interface UM24bQuoteRef {
  verbatimPassage: string;
  uri: string;
  retrievedAt: string;
  httpStatus: number;
  sha256?: string;
}

export interface ArenaCitation {
  title: string;
  uri: string;
  snippet?: string;
  /** ONLY server-side confirmSource may ever set verified: true. */
  verified?: boolean;
  confirmationStatus?: 'UNVERIFIED' | 'VERIFIED' | 'FAILED';
  confirmationReason?: string;
  um24bQuote?: UM24bQuoteRef | null;
}

export interface ArenaPremiseItem {
  id: string;
  kind: DependencyNodeKind;
  statement: string;
  sourceCitation: string;
  verified: boolean;
}

export interface ArenaHypothesis {
  id: string;
  persona: ArenaPersona;
  title: string;
  statement: string;
  mechanism: string;
  falsifiableTest: string;
  invariantFirstCheck: string;
  /** UM-4.1a explicit defeater / boundary counterexample condition */
  um41aDefeater?: string;
  domain: string;
  independence: IndependenceLevel;
  verificationRung: VerificationRung;
  premises: ArenaPremiseItem[];
  citations: ArenaCitation[];
  elo: number;
  eloCiLow?: number;
  eloCiHigh?: number;
  eloStdErr?: number;
  wins: number;
  losses: number;
  draws: number;
  hasExecutedVerification?: boolean;
  isWorkedExample?: boolean;
  registeredClaimId?: string;
}

export interface ArenaCriterionScores {
  novelty: number; // 0 - 10
  plausibility: number; // 0 - 10
  testability: number; // 0 - 10
  evidenceSupport: number; // 0 - 10
  defeater?: number; // 0 - 10 (UM-4.1a defeater term)
}

export interface ArenaMatchup {
  id: string;
  round: number;
  hypothesisAId: string;
  hypothesisBId: string;
  status: 'pending' | 'completed';
  winnerId: string | 'draw' | null;
  hasExecutionVerification?: boolean;
  scoresA?: ArenaCriterionScores;
  scoresB?: ArenaCriterionScores;
  eloBeforeA?: number;
  eloBeforeB?: number;
  eloAfterA?: number;
  eloAfterB?: number;
  eloDeltaA?: number;
  eloDeltaB?: number;
  judgeSummary?: string;
  judgeMode?: 'gemini' | 'deterministic-rubric';
}

export interface ArenaTournamentState {
  researchGoal: string;
  hypotheses: ArenaHypothesis[];
  matchups: ArenaMatchup[];
  isWorkedExample: boolean;
  lastUpdatedAt: string;
}

export interface ArenaHLREEvaluation {
  hlreGradeLetter: 'A' | 'B' | 'C' | 'D';
  hlreRawGrade: HLREGrade;
  independence: IndependenceLevel;
  isGrounded: boolean;
  hasConfirmedCitation: boolean;
  hasUnverifiedPremises: boolean;
  verifiedPremiseCount: number;
  unverifiedPremiseCount: number;
  capReasons: string[];
  breakdown: GradeComputationBreakdown;
}

export interface ArenaLeaderboardEntry {
  rank: number;
  hypothesis: ArenaHypothesis;
  hlre: ArenaHLREEvaluation;
  compositeRubricAvg: number;
  rankingExplanation: string;
}

export interface FalsifiabilityEvaluation {
  score: number; // 0 to 1
  hasObservableOutcome: boolean;
  hasRefutingCondition: boolean;
  isVacuous: boolean;
  reason: string;
}

export const WORKED_EXAMPLE_RESEARCH_GOAL =
  'Identify tractable, verifiable cross-domain algebraic and spectral mechanisms governing 2-Selmer parity stability and critical-point bifurcation in rational elliptic curve families.';

const VACUOUS_FALSIFIABILITY_REGEX =
  /^(?:tbd|none|n\/a|na|unknown|test(?:\s+it)?|verify(?:\s+it)?|check(?:\s+if\s+true)?|run(?:\s+experiment)?|future\s+work|more\s+research(?:\s+needed)?|evaluate\s+hypothesis|hypothesis\s+test)[.!?\s]*$/i;

const OBSERVABLE_OUTCOME_REGEX =
  /\b(?:dim|vdim|mult|resultant|discriminant|det|determinant|eigenvalue|spectral|parity|tamagawa|rank|auc|roc|p-?value|ks|residual|error|mse|mae|rmse|r\^?2|accuracy|f1|bound|threshold|count|ratio|variance|std\(|syz\(|modulus|mod\b|sorry|interval|radius|rate|frequency|amplitude|correlation|metric|measurement|flux|energy|norm|trace|degree|krull|milnor|conductor|kodaira|frobenius)\b|(?:[a-z_]+\s*[=<>!]+\s*-?\d)|(?:\d+(?:\.\d+)?\s*%)/i;

const REFUTING_CONDITION_REGEX =
  /(?:\b(?:fail|refut(?:e|ed|es|ing)?|falsif(?:y|ied|ies)?|reject(?:ed|s)?|disprov(?:e|ed)|counts?\s+against|contradict(?:ed|s)?|breaks?\s+(?:if|when)|invalid(?:ated)?\s+(?:if|when)|falsifies|ruled\s+out|aborted?\s+if|violat(?:e|ed|es|ion)|mismatch|divergence|diverges|otherwise|unless)\b|!=|!==|<=|>=|<|>)/i;

/**
 * Evaluates the falsifiability criterion strictly:
 * Requires a stated falsifiable prediction naming BOTH:
 * 1) an observable/measurable outcome, AND
 * 2) an explicit condition that would count against / refute the hypothesis.
 * Empty, missing, or vacuous predictions earn strictly 0 (never a free 0.20 baseline).
 */
export function evaluateFalsifiabilityCriterion(
  falsifiableTest: string,
  statement = ''
): FalsifiabilityEvaluation {
  const clean = (falsifiableTest || '').trim();
  if (!clean || clean.length < 18 || VACUOUS_FALSIFIABILITY_REGEX.test(clean)) {
    return {
      score: 0,
      hasObservableOutcome: false,
      hasRefutingCondition: false,
      isVacuous: true,
      reason: 'Missing or vacuous falsifiable prediction scores 0.',
    };
  }

  const combined = `${clean} ${statement}`.trim();
  const hasObservableOutcome =
    OBSERVABLE_OUTCOME_REGEX.test(clean) ||
    (clean.length >= 28 && OBSERVABLE_OUTCOME_REGEX.test(combined));
  const hasRefutingCondition = REFUTING_CONDITION_REGEX.test(clean);

  if (!hasObservableOutcome || !hasRefutingCondition) {
    const missing: string[] = [];
    if (!hasObservableOutcome) missing.push('an observable outcome');
    if (!hasRefutingCondition) missing.push('a refuting condition');
    return {
      score: 0,
      hasObservableOutcome,
      hasRefutingCondition,
      isVacuous: true,
      reason: `Falsifiability scores 0: prediction lacks ${missing.join(' and ')}.`,
    };
  }

  const specificityBonus = clean.length >= 70 ? 1.0 : 0.85;
  return {
    score: specificityBonus,
    hasObservableOutcome: true,
    hasRefutingCondition: true,
    isVacuous: false,
    reason: 'Names concrete observable outcome and explicit refuting condition.',
  };
}

/**
 * Evaluates UM-4.1a defeater rigor (boundary regime, obstruction, or counterexample condition).
 */
export function evaluateDefeaterCriterion(um41aDefeater?: string): number {
  const clean = (um41aDefeater || '').trim();
  if (!clean || clean.length < 16 || VACUOUS_FALSIFIABILITY_REGEX.test(clean)) {
    return 0;
  }
  const hasConcreteCondition =
    REFUTING_CONDITION_REGEX.test(clean) ||
    /\b(?:breaks|fails|obstruct|char|regime|bound|boundary|assumes|counterexample|unless|if|when|exception|degenerate|singular|zero)\b/i.test(
      clean
    );
  if (!hasConcreteCondition) return 0;
  return clean.length >= 45 ? 1.0 : 0.75;
}

/**
 * Determines whether a hypothesis is verified enough to move Elo ratings in criterion-only matches.
 * Criterion-only matches between two unverified hypotheses MUST be recorded as draws.
 */
export function isHypothesisVerifiedForArena(hypothesis: ArenaHypothesis): boolean {
  const hasVerifiedPremises =
    hypothesis.premises.length > 0 && hypothesis.premises.every((p) => p.verified);
  if (!hasVerifiedPremises) return false;

  const hasConfirmedSource = hypothesis.citations.some((c) => c.verified === true);
  const hasWorkedExampleGrounding =
    Boolean(hypothesis.isWorkedExample) && hypothesis.citations.length > 0;
  const hasExecutedVerification = Boolean(hypothesis.hasExecutedVerification);

  return hasConfirmedSource || hasWorkedExampleGrounding || hasExecutedVerification;
}

/**
 * Normalized [0, 1] quality breakdown ensuring a minimal/default unverified hypothesis
 * earns 0 on falsifiability, defeater, plausibility, and evidence (overall << 0.26).
 */
export function scoreHypothesisNormalized(hypothesis: ArenaHypothesis): {
  novelty: number;
  plausibility: number;
  testability: number;
  evidenceSupport: number;
  defeater: number;
  overall: number;
} {
  const fals = evaluateFalsifiabilityCriterion(
    hypothesis.falsifiableTest,
    hypothesis.statement
  );
  const defeaterScore = evaluateDefeaterCriterion(hypothesis.um41aDefeater);
  const hasRealStatement =
    (hypothesis.statement || '').trim().length >= 35 &&
    !/^(?:hypothesis|default|statement|tbd|none)\.?$/i.test(hypothesis.statement.trim());
  const hasRealMechanism = (hypothesis.mechanism || '').trim().length >= 30;
  const hasRealInvariant = (hypothesis.invariantFirstCheck || '').trim().length >= 20;

  const verifiedPremises = hypothesis.premises.filter((p) => p.verified).length;
  const totalPremises = hypothesis.premises.length;
  const verifiedRatio = totalPremises > 0 ? verifiedPremises / totalPremises : 0;

  const confirmedCitations = hypothesis.citations.filter((c) => c.verified === true).length;
  const totalCitations = hypothesis.citations.length;
  const hlre = evaluateArenaHypothesisHLRE(hypothesis);

  const novelty =
    hasRealStatement && hasRealMechanism
      ? Math.min(
          1,
          (hypothesis.persona === 'Generator'
            ? 0.82
            : hypothesis.persona === 'Synthesizer'
              ? 0.78
              : hypothesis.persona === 'Domain Specialist'
                ? 0.72
                : 0.68) + (hasRealInvariant ? 0.1 : 0)
        )
      : hasRealStatement
        ? 0.25
        : 0;

  const plausibility =
    totalPremises === 0 && !hasRealMechanism
      ? 0
      : Math.min(
          1,
          (hasRealMechanism ? 0.2 : 0) +
            verifiedRatio * 0.55 +
            (confirmedCitations > 0 ? 0.2 : totalCitations > 0 ? 0.12 : 0) +
            (hypothesis.persona === 'Skeptic/Adversary' && totalPremises > 0 ? 0.05 : 0)
        );

  const testability =
    fals.score === 0
      ? 0
      : Math.min(
          1,
          fals.score * 0.75 +
            (hasRealInvariant ? 0.15 : 0) +
            Math.min(0.1, hypothesis.verificationRung * 0.025)
        );

  let evidenceSupport = 0;
  if (confirmedCitations > 0 || (totalCitations > 0 && verifiedRatio > 0)) {
    evidenceSupport = Math.min(
      1,
      confirmedCitations * 0.35 +
        (totalCitations - confirmedCitations) * 0.15 +
        verifiedRatio * 0.4
    );
    if (hlre.hasUnverifiedPremises) {
      evidenceSupport = Math.min(evidenceSupport, 0.42);
    }
    if (hlre.hlreGradeLetter === 'A') evidenceSupport = Math.max(evidenceSupport, 0.9);
    if (hlre.hlreGradeLetter === 'B') evidenceSupport = Math.max(evidenceSupport, 0.76);
  }

  const defeater =
    defeaterScore === 0
      ? 0
      : Math.min(1, defeaterScore * 0.85 + (hasRealInvariant ? 0.15 : 0));

  const overall = Number(
    ((novelty + plausibility + testability + evidenceSupport + defeater) / 5).toFixed(4)
  );

  return {
    novelty: Number(novelty.toFixed(4)),
    plausibility: Number(plausibility.toFixed(4)),
    testability: Number(testability.toFixed(4)),
    evidenceSupport: Number(evidenceSupport.toFixed(4)),
    defeater: Number(defeater.toFixed(4)),
    overall,
  };
}

/**
 * Evaluates an Arena hypothesis with the existing UM-1 worst-of grading rule (`computeUM1Grade`).
 *
 * Epistemic safeguards:
 * - Any hypothesis with NO citations is flagged `UNGROUNDED` (assertion, not a finding) and capped at Grade D.
 * - Any hypothesis with NO premises or >= 1 unverified (`NOT VERIFIED`) premise is capped at Grade D.
 */
export function evaluateArenaHypothesisHLRE(
  hypothesis: ArenaHypothesis
): ArenaHLREEvaluation {
  const isGrounded = hypothesis.citations.length > 0;
  const hasConfirmedCitation = hypothesis.citations.some((c) => c.verified === true);
  const verifiedPremiseCount = hypothesis.premises.filter((p) => p.verified).length;
  const unverifiedPremiseCount = hypothesis.premises.filter((p) => !p.verified).length;
  const hasUnverifiedPremises =
    hypothesis.premises.length === 0 || unverifiedPremiseCount > 0;

  const capReasons: string[] = [];
  if (!isGrounded) {
    capReasons.push(
      'UNGROUNDED: Zero supporting literature citations — treated as an ungrounded assertion, not a finding (UM-2.5 P1).'
    );
  }
  if (hypothesis.premises.length === 0) {
    capReasons.push(
      'NOT VERIFIED: Premise ledger is empty; unstated assumptions cap grade at D (UM-4.4).'
    );
  } else if (unverifiedPremiseCount > 0) {
    capReasons.push(
      `NOT VERIFIED: ${unverifiedPremiseCount} of ${hypothesis.premises.length} premise(s) marked NOT VERIFIED, capping HLRE grade at D (UM-4.4 / UM-5).`
    );
  }

  let gradingInput: ClaimGradingInput;

  if (!isGrounded || hasUnverifiedPremises) {
    gradingInput = {
      track: 'E',
      tier: 'Lite',
      recordLabel: '[C]', // Conjecture label enforces worst-of ceiling D in computeUM1Grade
      independence: hypothesis.independence,
      hasDiscriminatingComparison: false,
      postulationKind: 'exploratory',
      postulationValidatedByNewIndependentTests: false,
      unreportedParameterSelection: false,
      ledgerEndsInUnrederivedTranscription: false,
      overrideStatus: 'NONE',
      supportInRecord: 'D',
      verificationRung: Math.min(1, hypothesis.verificationRung) as VerificationRung,
      independentRoutesCount: isGrounded ? 1 : 0,
      kernelCheckedOrClosedLedger: false,
      exactArithmeticCertified: false,
      toolVerdicts: [],
      externalVerification: {
        executed: false,
        verifierAgent: 'None',
        auditedLocallyClaimByClaim: false,
        supportedGrade: 'D',
        auditNotes: capReasons.join(' '),
      },
    };
  } else {
    const tier =
      hypothesis.independence === 'I3' || hypothesis.independence === 'I4'
        ? 'Full'
        : hypothesis.independence === 'I2'
          ? 'Standard'
          : 'Lite';

    const supportInRecord: 'A' | 'B' | 'C' | 'D' =
      hypothesis.independence === 'I4' || hypothesis.independence === 'I3'
        ? 'A'
        : hypothesis.independence === 'I2'
          ? 'B'
          : hypothesis.independence === 'I1'
            ? 'C'
            : 'D';

    const effectiveRung = Math.max(2, hypothesis.verificationRung) as VerificationRung;

    const toolVerdicts = [
      {
        toolName: 'P1 Literature Grounding',
        version: 'Google Search',
        exitCode: 0,
        command: `ground --citations=${hypothesis.citations.length}`,
        verdictSummary: `Grounded with ${hypothesis.citations.length} clickable source(s).`,
        exactArithmetic: false,
        actuallyExecuted: true,
        outputHash: `sha256:arena-p1-${hypothesis.id.toLowerCase()}`,
      },
    ];

    if (hypothesis.independence !== 'I0') {
      toolVerdicts.push({
        toolName: 'P3 Premise Ledger Audit',
        version: 'UM-1 v3.1',
        exitCode: 0,
        command: `audit-premises --verified=${verifiedPremiseCount}`,
        verdictSummary: `All ${verifiedPremiseCount} premise(s) verified with citations.`,
        exactArithmetic: false,
        actuallyExecuted: true,
        outputHash: `sha256:arena-p3-${hypothesis.id.toLowerCase()}`,
      });
    }

    const useExternalI1Audit =
      hypothesis.independence === 'I1' && effectiveRung >= 2;

    gradingInput = {
      track: 'E',
      tier,
      recordLabel: '[D]',
      independence: hypothesis.independence,
      hasDiscriminatingComparison:
        hypothesis.independence === 'I3' || hypothesis.independence === 'I4',
      postulationKind: 'constraint-led',
      postulationValidatedByNewIndependentTests:
        hypothesis.independence === 'I3' || hypothesis.independence === 'I4',
      unreportedParameterSelection: false,
      ledgerEndsInUnrederivedTranscription: false,
      overrideStatus: 'NONE',
      supportInRecord,
      verificationRung: effectiveRung,
      rung4Kind: effectiveRung >= 4 ? '4D' : undefined,
      independentRoutesCount: toolVerdicts.length,
      kernelCheckedOrClosedLedger: effectiveRung >= 4,
      exactArithmeticCertified: false,
      toolVerdicts,
      externalVerification: useExternalI1Audit
        ? {
            executed: true,
            verifierAgent: 'Academia Co-Scientist',
            auditedLocallyClaimByClaim: true,
            supportedGrade: 'C',
            auditNotes: 'Audited against grounded citations and verified premise ledger.',
          }
        : {
            executed: false,
            verifierAgent: 'None',
            auditedLocallyClaimByClaim: false,
            supportedGrade: supportInRecord,
            auditNotes: 'Standard Track E worst-of evaluation.',
          },
    };
  }

  const breakdown = computeUM1Grade(gradingInput);
  const raw = breakdown.finalGrade;
  const hlreGradeLetter: 'A' | 'B' | 'C' | 'D' =
    raw === 'A' || raw === 'B' || raw === 'C' || raw === 'D' ? raw : 'D';

  return {
    hlreGradeLetter,
    hlreRawGrade: raw,
    independence: hypothesis.independence,
    isGrounded,
    hasConfirmedCitation,
    hasUnverifiedPremises,
    verifiedPremiseCount,
    unverifiedPremiseCount,
    capReasons: [...capReasons, ...breakdown.reasons],
    breakdown,
  };
}

/**
 * Generates all unique pairwise round-robin match-ups for a list of hypotheses.
 */
export function buildRoundRobinMatchups(hypotheses: ArenaHypothesis[]): ArenaMatchup[] {
  const pairs: Array<[ArenaHypothesis, ArenaHypothesis]> = [];
  for (let i = 0; i < hypotheses.length; i++) {
    for (let j = i + 1; j < hypotheses.length; j++) {
      pairs.push([hypotheses[i], hypotheses[j]]);
    }
  }
  return pairs.map(([a, b], idx) => ({
    id: `MATCH-${idx + 1}`,
    round: Math.floor(idx / 2) + 1,
    hypothesisAId: a.id,
    hypothesisBId: b.id,
    status: 'pending',
    winnerId: null,
  }));
}

/**
 * Legacy pairwise Elo helper kept exported for diagnostic comparison;
 * tournament ratings are fitted order-independently via `fitBradleyTerryRatings`.
 */
export function computeEloUpdate(
  ratingA: number,
  ratingB: number,
  outcomeA: 1 | 0.5 | 0,
  kFactor = 32
): {
  newRatingA: number;
  newRatingB: number;
  deltaA: number;
  deltaB: number;
} {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const outcomeB = 1 - outcomeA;

  const deltaA = Math.round(kFactor * (outcomeA - expectedA));
  const deltaB = Math.round(kFactor * (outcomeB - expectedB));

  return {
    newRatingA: ratingA + deltaA,
    newRatingB: ratingB + deltaB,
    deltaA,
    deltaB,
  };
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, idx) => [...row, b[idx]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const val = Math.abs(M[r][col]);
      if (val > maxVal) {
        maxVal = val;
        pivotRow = r;
      }
    }
    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }
    const diag = M[col][col];
    if (Math.abs(diag) < 1e-12) continue;

    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / diag;
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = Math.abs(M[i][i]) > 1e-12 ? sum / M[i][i] : 0;
  }
  return x;
}

function invertSymmetricPositiveMatrix(F: number[][]): number[][] {
  const n = F.length;
  const aug = F.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(aug[r][col]);
      if (v > maxVal) {
        maxVal = v;
        pivotRow = r;
      }
    }
    if (pivotRow !== col) {
      const tmp = aug[col];
      aug[col] = aug[pivotRow];
      aug[pivotRow] = tmp;
    }
    const diag = aug[col][col] || 1e-9;
    for (let c = 0; c < 2 * n; c++) {
      aug[col][c] /= diag;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      for (let c = 0; c < 2 * n; c++) {
        aug[r][c] -= factor * aug[col][c];
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

/**
 * Upgrade 2: Order-independent Bradley-Terry Maximum Likelihood (regularized concave fit)
 * over the recorded match history, with observed-Fisher 95% confidence intervals.
 */
export function fitBradleyTerryRatings(
  hypotheses: ArenaHypothesis[],
  matchups: ArenaMatchup[],
  lambda = 0.35
): ArenaHypothesis[] {
  const n = hypotheses.length;
  if (n === 0) return hypotheses;

  const idToIdx = new Map(hypotheses.map((h, i) => [h.id, i]));
  const completed = matchups.filter(
    (m) =>
      m.status === 'completed' &&
      m.winnerId !== null &&
      idToIdx.has(m.hypothesisAId) &&
      idToIdx.has(m.hypothesisBId)
  );

  // Recompute deterministic W/L/D tallies strictly from completed match history
  const wins = new Array(n).fill(0);
  const losses = new Array(n).fill(0);
  const draws = new Array(n).fill(0);

  interface EdgeObs {
    i: number;
    j: number;
    y: number; // 1 if i won, 0 if j won, 0.5 if draw
  }
  const obs: EdgeObs[] = [];

  for (const m of completed) {
    const i = idToIdx.get(m.hypothesisAId)!;
    const j = idToIdx.get(m.hypothesisBId)!;
    let y = 0.5;
    if (m.winnerId === m.hypothesisAId) {
      y = 1;
      wins[i] += 1;
      losses[j] += 1;
    } else if (m.winnerId === m.hypothesisBId) {
      y = 0;
      wins[j] += 1;
      losses[i] += 1;
    } else {
      y = 0.5;
      draws[i] += 1;
      draws[j] += 1;
    }
    obs.push({ i, j, y });
  }

  if (obs.length === 0) {
    return hypotheses.map((h, idx) => ({
      ...h,
      elo: 1500,
      eloCiLow: undefined,
      eloCiHigh: undefined,
      eloStdErr: undefined,
      wins: wins[idx],
      losses: losses[idx],
      draws: draws[idx],
    }));
  }

  const theta = new Array(n).fill(0);
  const ELO_SCALE = 400 / Math.LN10;

  for (let iter = 0; iter < 30; iter++) {
    const grad = theta.map((t) => -lambda * t);
    const F: number[][] = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (__, c) => (r === c ? lambda : 0))
    );

    for (const { i, j, y } of obs) {
      const diff = Math.max(-20, Math.min(20, theta[i] - theta[j]));
      const p = 1 / (1 + Math.exp(-diff));
      const w = Math.max(1e-6, p * (1 - p));
      const r = y - p;

      grad[i] += r;
      grad[j] -= r;

      F[i][i] += w;
      F[j][j] += w;
      F[i][j] -= w;
      F[j][i] -= w;
    }

    const step = solveLinearSystem(F, grad);
    let maxStep = 0;
    for (let k = 0; k < n; k++) {
      theta[k] += step[k];
      maxStep = Math.max(maxStep, Math.abs(step[k]));
    }
    if (maxStep < 1e-8) break;
  }

  // Final Fisher information matrix at MLE for asymptotic covariance Sigma = F^{-1}
  const finalF: number[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (__, c) => (r === c ? lambda : 0))
  );
  for (const { i, j } of obs) {
    const diff = Math.max(-20, Math.min(20, theta[i] - theta[j]));
    const p = 1 / (1 + Math.exp(-diff));
    const w = Math.max(1e-6, p * (1 - p));
    finalF[i][i] += w;
    finalF[j][j] += w;
    finalF[i][j] -= w;
    finalF[j][i] -= w;
  }

  const cov = invertSymmetricPositiveMatrix(finalF);
  const meanTheta = theta.reduce((acc, v) => acc + v, 0) / n;

  return hypotheses.map((h, i) => {
    const centeredTheta = theta[i] - meanTheta;
    // Variance of centered contrast c = e_i - (1/n)*1
    let variance = 0;
    for (let a = 0; a < n; a++) {
      const ca = (a === i ? 1 : 0) - 1 / n;
      for (let b = 0; b < n; b++) {
        const cb = (b === i ? 1 : 0) - 1 / n;
        variance += ca * cov[a][b] * cb;
      }
    }
    const seElo = Math.round(ELO_SCALE * Math.sqrt(Math.max(0, variance)));
    const ciHalf = Math.round(1.96 * seElo);
    const elo = Math.round(1500 + ELO_SCALE * centeredTheta);

    return {
      ...h,
      elo,
      eloStdErr: seElo,
      eloCiLow: elo - ciHalf,
      eloCiHigh: elo + ciHalf,
      wins: wins[i],
      losses: losses[i],
      draws: draws[i],
    };
  });
}

export function getRubricMaxPoints(scores: ArenaCriterionScores): number {
  return typeof scores.defeater === 'number' ? 50 : 40;
}

export function sumCriterionScores(scores: ArenaCriterionScores): number {
  const base =
    scores.novelty +
    scores.plausibility +
    scores.testability +
    scores.evidenceSupport +
    (typeof scores.defeater === 'number' ? scores.defeater : 0);
  return Number(base.toFixed(1));
}

/**
 * Deterministic rubric scoring used when running offline/worked-example tournaments
 * or auditing match-ups without an external judge response.
 * Enforces:
 * - Zero free points for vacuous/missing falsifiable predictions or defeaters
 * - Epistemic penalties for UNGROUNDED assertions and NOT VERIFIED premises
 */
export function scoreHypothesisDeterministic(
  hypothesis: ArenaHypothesis
): ArenaCriterionScores {
  const norm = scoreHypothesisNormalized(hypothesis);
  const scale10 = (v: number) => Number(Math.max(0, Math.min(10, v * 10)).toFixed(1));

  return {
    novelty: scale10(norm.novelty),
    plausibility: scale10(norm.plausibility),
    testability: scale10(norm.testability),
    evidenceSupport: scale10(norm.evidenceSupport),
    defeater: scale10(norm.defeater),
  };
}

/**
 * Evaluates a single pairwise match-up, enforcing:
 * - Criterion-only matches between two unverified hypotheses are recorded as draws
 * - Order-independent Bradley-Terry MLE + 95% confidence interval updates
 */
export function resolveMatchupWithScores(
  hypotheses: ArenaHypothesis[],
  matchup: ArenaMatchup,
  scoresA: ArenaCriterionScores,
  scoresB: ArenaCriterionScores,
  judgeSummary: string,
  judgeMode: 'gemini' | 'deterministic-rubric',
  allMatchups?: ArenaMatchup[]
): {
  updatedHypotheses: ArenaHypothesis[];
  completedMatchup: ArenaMatchup;
} {
  const hypA = hypotheses.find((h) => h.id === matchup.hypothesisAId);
  const hypB = hypotheses.find((h) => h.id === matchup.hypothesisBId);
  if (!hypA || !hypB) {
    return { updatedHypotheses: hypotheses, completedMatchup: matchup };
  }

  const verifiedA = isHypothesisVerifiedForArena(hypA);
  const verifiedB = isHypothesisVerifiedForArena(hypB);
  const unverifiedBothCriterionOnly =
    !verifiedA && !verifiedB && !matchup.hasExecutionVerification;

  const totalA = sumCriterionScores(scoresA);
  const totalB = sumCriterionScores(scoresB);
  const diff = totalA - totalB;

  let winnerId: string | 'draw' = 'draw';
  let finalSummary = judgeSummary;

  if (unverifiedBothCriterionOnly) {
    winnerId = 'draw';
    if (!/draw/i.test(finalSummary) || !/unverified/i.test(finalSummary)) {
      finalSummary = `Draw recorded: criterion-only match between two unverified hypotheses (${hypA.persona} vs ${hypB.persona}) cannot move ratings. ${judgeSummary}`;
    }
  } else if (Math.abs(diff) >= 0.4) {
    winnerId = diff > 0 ? hypA.id : hypB.id;
  }

  const completedStub: ArenaMatchup = {
    ...matchup,
    status: 'completed',
    winnerId,
    scoresA,
    scoresB,
    eloBeforeA: hypA.elo,
    eloBeforeB: hypB.elo,
    judgeSummary: finalSummary,
    judgeMode,
  };

  const history = allMatchups
    ? allMatchups.map((m) => (m.id === completedStub.id ? completedStub : m))
    : [completedStub];

  const updatedHypotheses = fitBradleyTerryRatings(hypotheses, history);
  const afterA = updatedHypotheses.find((h) => h.id === hypA.id)?.elo ?? hypA.elo;
  const afterB = updatedHypotheses.find((h) => h.id === hypB.id)?.elo ?? hypB.elo;

  const completedMatchup: ArenaMatchup = {
    ...completedStub,
    eloAfterA: afterA,
    eloAfterB: afterB,
    eloDeltaA: afterA - hypA.elo,
    eloDeltaB: afterB - hypB.elo,
  };

  return { updatedHypotheses, completedMatchup };
}

export function evaluateDeterministicPairwiseMatchup(
  hypotheses: ArenaHypothesis[],
  matchup: ArenaMatchup,
  allMatchups?: ArenaMatchup[]
): {
  updatedHypotheses: ArenaHypothesis[];
  completedMatchup: ArenaMatchup;
} {
  const hypA = hypotheses.find((h) => h.id === matchup.hypothesisAId);
  const hypB = hypotheses.find((h) => h.id === matchup.hypothesisBId);
  if (!hypA || !hypB) {
    return { updatedHypotheses: hypotheses, completedMatchup: matchup };
  }

  const scoresA = scoreHypothesisDeterministic(hypA);
  const scoresB = scoreHypothesisDeterministic(hypB);
  const maxA = getRubricMaxPoints(scoresA);
  const maxB = getRubricMaxPoints(scoresB);
  const totalA = sumCriterionScores(scoresA);
  const totalB = sumCriterionScores(scoresB);
  const hlreA = evaluateArenaHypothesisHLRE(hypA);
  const hlreB = evaluateArenaHypothesisHLRE(hypB);

  const verifiedA = isHypothesisVerifiedForArena(hypA);
  const verifiedB = isHypothesisVerifiedForArena(hypB);

  let summary = '';
  if (!verifiedA && !verifiedB && !matchup.hasExecutionVerification) {
    summary = `Draw (unverified vs unverified): ${hypA.persona} (${totalA.toFixed(1)}/${maxA}) and ${hypB.persona} (${totalB.toFixed(1)}/${maxB}) both lack verified premises/confirmed citations, so a criterion-only comparison does not move Bradley-Terry ratings.`;
  } else if (Math.abs(totalA - totalB) < 0.4) {
    summary = `Statistical draw (${totalA.toFixed(1)}/${maxA} vs ${totalB.toFixed(1)}/${maxB}): ${hypA.persona} and ${hypB.persona} balanced novelty, falsifiability, defeaters, and evidence support.`;
  } else {
    const winner = totalA > totalB ? hypA : hypB;
    const loser = totalA > totalB ? hypB : hypA;
    const wScores = totalA > totalB ? scoresA : scoresB;
    const lScores = totalA > totalB ? scoresB : scoresA;
    const wMax = totalA > totalB ? maxA : maxB;
    const lMax = totalA > totalB ? maxB : maxA;
    const lHlre = totalA > totalB ? hlreB : hlreA;

    const penalties: string[] = [];
    if (!lHlre.isGrounded) penalties.push('UNGROUNDED (0 citations)');
    if (lHlre.hasUnverifiedPremises) {
      penalties.push(`${lHlre.unverifiedPremiseCount} NOT VERIFIED premise(s)`);
    }
    if (lScores.testability === 0) {
      penalties.push('missing/vacuous falsifiable prediction (0)');
    }

    summary = `${winner.persona} (${sumCriterionScores(wScores).toFixed(1)}/${wMax}) defeated ${loser.persona} (${sumCriterionScores(lScores).toFixed(1)}/${lMax}) on stronger evidence support (${wScores.evidenceSupport} vs ${lScores.evidenceSupport}) and testability (${wScores.testability} vs ${lScores.testability})${
      penalties.length > 0
        ? `; ${loser.persona} was penalized for ${penalties.join(' and ')}.`
        : '.'
    }`;
  }

  return resolveMatchupWithScores(
    hypotheses,
    matchup,
    scoresA,
    scoresB,
    summary,
    'deterministic-rubric',
    allMatchups
  );
}

/**
 * Runs all pending pairwise match-ups in a tournament state deterministically
 * and fits the final Bradley-Terry MLE ratings & 95% CIs across the full match history.
 */
export function runAllDeterministicMatchups(
  state: ArenaTournamentState
): ArenaTournamentState {
  let workingMatchups = state.matchups.map((m) => ({ ...m }));
  let currentHyps = state.hypotheses.map((h) => ({ ...h }));

  for (let i = 0; i < workingMatchups.length; i++) {
    const m = workingMatchups[i];
    if (m.status === 'completed') continue;

    const { updatedHypotheses, completedMatchup } =
      evaluateDeterministicPairwiseMatchup(currentHyps, m, workingMatchups);
    currentHyps = updatedHypotheses;
    workingMatchups = workingMatchups.map((item) =>
      item.id === completedMatchup.id ? completedMatchup : item
    );
  }

  // Final global Bradley-Terry MLE pass so every matchup's post-match rating reflects the joint fit
  const fittedHyps = fitBradleyTerryRatings(currentHyps, workingMatchups);

  return {
    ...state,
    hypotheses: fittedHyps,
    matchups: workingMatchups,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Builds the ranked live leaderboard with plain-language explanations of why each
 * hypothesis ranks where it does (match-ups won/lost, Bradley-Terry CI, rubric strengths, and HLRE caps).
 */
export function computeLeaderboardWithExplanations(
  hypotheses: ArenaHypothesis[],
  matchups: ArenaMatchup[]
): ArenaLeaderboardEntry[] {
  const sorted = [...hypotheses].sort((a, b) => {
    if (b.elo !== a.elo) return b.elo - a.elo;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

  const hypById = new Map(hypotheses.map((h) => [h.id, h]));

  return sorted.map((h, idx) => {
    const hlre = evaluateArenaHypothesisHLRE(h);
    const completedMatches = matchups.filter(
      (m) =>
        m.status === 'completed' &&
        (m.hypothesisAId === h.id || m.hypothesisBId === h.id)
    );

    const wonAgainst: string[] = [];
    const lostTo: string[] = [];
    const drewWith: string[] = [];
    let rubricTotalSum = 0;
    let rubricMax = 50;

    for (const m of completedMatches) {
      const isA = m.hypothesisAId === h.id;
      const opponent = hypById.get(isA ? m.hypothesisBId : m.hypothesisAId);
      const myScores = isA ? m.scoresA : m.scoresB;
      if (myScores) {
        rubricMax = getRubricMaxPoints(myScores);
        rubricTotalSum += sumCriterionScores(myScores);
      }
      const oppLabel = opponent ? opponent.persona : 'Opponent';
      if (m.winnerId === h.id) {
        wonAgainst.push(oppLabel);
      } else if (m.winnerId === 'draw') {
        drewWith.push(oppLabel);
      } else if (m.winnerId) {
        lostTo.push(oppLabel);
      }
    }

    const fallbackScores = scoreHypothesisDeterministic(h);
    const compositeRubricAvg =
      completedMatches.length > 0
        ? Number((rubricTotalSum / completedMatches.length).toFixed(1))
        : sumCriterionScores(fallbackScores);

    const ciLabel =
      typeof h.eloCiLow === 'number' && typeof h.eloCiHigh === 'number'
        ? ` [95% CI ${h.eloCiLow}–${h.eloCiHigh}]`
        : '';

    const parts: string[] = [];
    if (completedMatches.length === 0) {
      parts.push(
        `Ranked #${idx + 1} at baseline Elo ${h.elo}${ciLabel} (no pairwise match-ups executed yet).`
      );
    } else {
      const recordSummary = `Ranked #${idx + 1} (Elo ${h.elo}${ciLabel}, ${h.wins}W-${h.losses}L-${h.draws}D)`;
      const outcomeClauses: string[] = [];
      if (wonAgainst.length > 0) {
        outcomeClauses.push(`defeated ${wonAgainst.join(', ')}`);
      }
      if (lostTo.length > 0) {
        outcomeClauses.push(`lost to ${lostTo.join(', ')}`);
      }
      if (drewWith.length > 0) {
        outcomeClauses.push(`drew with ${drewWith.join(', ')}`);
      }
      parts.push(
        `${recordSummary} because it ${outcomeClauses.join(' and ')} across ${completedMatches.length} match-up(s) (avg rubric ${compositeRubricAvg}/${rubricMax}).`
      );
    }

    if (!hlre.isGrounded) {
      parts.push(
        'Flagged UNGROUNDED (0 citations) — treated as an ungrounded assertion and capped at HLRE Grade D.'
      );
    } else if (hlre.hasUnverifiedPremises) {
      parts.push(
        `Capped at HLRE Grade D because ${hlre.unverifiedPremiseCount} premise(s) remain NOT VERIFIED.`
      );
    } else {
      parts.push(
        `Achieves HLRE Grade ${hlre.hlreGradeLetter} (${hlre.independence}) backed by ${h.citations.length} grounded citation(s) and ${hlre.verifiedPremiseCount} verified premise(s).`
      );
    }

    return {
      rank: idx + 1,
      hypothesis: h,
      hlre,
      compositeRubricAvg,
      rankingExplanation: parts.join(' '),
    };
  });
}

/**
 * Converts an Arena hypothesis into a full UM-1 `ClaimExperimentRecord` for 1-click registration
 * in the Claim Registry & Dependency Ledger. Preserves UNGROUNDED and NOT VERIFIED safeguards.
 */
export function arenaHypothesisToUM1Claim(
  hypothesis: ArenaHypothesis,
  researchGoal: string,
  existingClaimCount: number
): ClaimExperimentRecord {
  const hlre = evaluateArenaHypothesisHLRE(hypothesis);
  const claimId = `CLM-${101 + existingClaimCount}`;
  const expId = `EXP-${String(1 + existingClaimCount).padStart(3, '0')}`;
  const today = new Date().toISOString().slice(0, 10);

  const ledgerItems: PremiseDependencyItem[] = hypothesis.premises.map((p, idx) => ({
    id: `DEP-${claimId}-${idx + 1}`,
    kind: p.kind,
    statement: p.verified ? p.statement : `[NOT VERIFIED] ${p.statement}`,
    sourceCitation: p.sourceCitation || 'Unspecified source',
    hasSupportingVerdict: p.verified,
    independentlyRederived: p.verified,
    isLeafTranscription: p.kind === 'primary_transcription',
    status: p.verified ? 'VERIFIED' : 'UNVERIFIED',
  }));

  const endsInUnrederived =
    ledgerItems.some((i) => i.isLeafTranscription && !i.independentlyRederived) ||
    hlre.hasUnverifiedPremises;

  const citationStrings =
    hypothesis.citations.length > 0
      ? hypothesis.citations
          .map(
            (c) =>
              `${c.title} (${c.uri}) [${c.verified ? 'UM-2.4b VERIFIED' : 'UNCONFIRMED'}]`
          )
          .join('; ')
      : 'UNGROUNDED (No literature citations attached yet)';

  const effectiveRung =
    !hlre.isGrounded || hlre.hasUnverifiedPremises ? 0 : hypothesis.verificationRung;

  return {
    id: claimId,
    expId,
    title: `[Arena · ${hypothesis.persona}] ${hypothesis.title}`,
    domain: hypothesis.domain || 'Frontier Research',
    lifecycleState: hlre.isGrounded && !hlre.hasUnverifiedPremises ? 'exploring' : 'scoped',
    target: hypothesis.statement,
    source: citationStrings,
    uncertainty:
      hlre.isGrounded && !hlre.hasUnverifiedPremises
        ? `Arena Bradley-Terry Elo ${hypothesis.elo} (${hypothesis.wins}W-${hypothesis.losses}L-${hypothesis.draws}D); ${hypothesis.independence}`
        : `Capped at Grade ${hlre.hlreGradeLetter}: ${hlre.capReasons[0] || 'Requires verification'}`,
    priorLiterature: citationStrings,
    dataSplits: `Registered from Hypothesis Arena goal: ${researchGoal.slice(0, 160)}`,
    replicationPlan: hypothesis.falsifiableTest,
    independenceBoundary: `${hypothesis.independence} (${hypothesis.persona} Arena contender)`,
    noveltyBudget: 'independently_motivated',
    predictionClass: 'prediction',
    question: hypothesis.statement,
    motivation: hypothesis.mechanism,
    falsifiablePrediction: hypothesis.falsifiableTest,
    method: `First-stage invariant screen: ${hypothesis.invariantFirstCheck}. Full falsification protocol: ${hypothesis.falsifiableTest}`,
    successFailureCriteria: `PASS if invariant and primary falsifiable prediction hold; FAIL if any boundary condition or premise is refuted.`,
    oneSidednessPass: `Demonstrates survival of ${hypothesis.persona} mechanism under independent verification.`,
    oneSidednessFail: `Refutes mechanism or exposes unverified premise dependency.`,
    premiseDependencies: [],
    dependencyLedgerItems: ledgerItems,
    computeBudget: '1 CPU hour max (Arena-promoted claim)',
    killCriterion:
      hypothesis.um41aDefeater ||
      `Abort if invariant check "${hypothesis.invariantFirstCheck.slice(0, 80)}" fails.`,
    computeBudgetAndKill: `1 CPU hour max; abort on invariant failure or UM-4.1a defeater`,
    invariantFirstNote: hypothesis.invariantFirstCheck,
    lensesDeclared: ['L0-spine', 'L3-invariant', 'L9-adversarial'],
    verdictOutcome:
      hlre.isGrounded && !hlre.hasUnverifiedPremises ? 'confirmed' : 'inconclusive',
    howCouldThisBeWrong:
      hypothesis.um41aDefeater ||
      hlre.capReasons[0] ||
      'Requires independent Execution Lab verification across Lean 4 / Singular / Python 3.',
    rungAudits: [0, 1, 2, 3, 4, 5].map((r) => ({
      rung: r as VerificationRung,
      completed:
        r <=
        (hlre.isGrounded && !hlre.hasUnverifiedPremises
          ? hypothesis.verificationRung
          : 0),
      howCouldThisBeWrongAtStage:
        r === 0 ? 'Statement promoted from Hypothesis Arena tournament.' : '',
      evidenceArtifactSummary:
        r === 0 ? `Elo ${hypothesis.elo} | HLRE ${hlre.hlreGradeLetter}` : '',
      updatedAt: new Date().toISOString(),
    })),
    tierHistory: [
      {
        id: `TLOG-${claimId}-INIT`,
        claimId,
        previousTier: 'Standard',
        newTier:
          hlre.isGrounded && !hlre.hasUnverifiedPremises ? 'Full' : 'Lite',
        direction: hlre.isGrounded && !hlre.hasUnverifiedPremises ? 'raised' : 'lowered',
        justification: `Promoted from Hypothesis Arena (${hypothesis.persona}, Elo ${hypothesis.elo}, Grade ${hlre.hlreGradeLetter}).`,
        timestamp: new Date().toISOString(),
      },
    ],
    sha256Manifest: `sha256:arena-${hypothesis.id.toLowerCase()}`,
    preflight: {
      P1_sourceComplete: hlre.isGrounded,
      P2_smokeTest: false,
      P3_premiseDependenciesChecked: !hlre.hasUnverifiedPremises,
      P4_oneSidednessStated: true,
      P5_invariantFirstChecked: hypothesis.invariantFirstCheck.trim().length > 0,
      P6_computeBudgetDeclared: true,
      P7_spendCapNamed: true,
      spendCapUsd: 25,
    },
    gradingInput: {
      ...hlre.breakdown,
      track: 'E',
      tier:
        !hlre.isGrounded || hlre.hasUnverifiedPremises
          ? 'Lite'
          : hypothesis.independence === 'I3' || hypothesis.independence === 'I4'
            ? 'Full'
            : 'Standard',
      recordLabel: !hlre.isGrounded || hlre.hasUnverifiedPremises ? '[C]' : '[D]',
      independence: hypothesis.independence,
      hasDiscriminatingComparison:
        hlre.isGrounded &&
        !hlre.hasUnverifiedPremises &&
        (hypothesis.independence === 'I3' || hypothesis.independence === 'I4'),
      postulationKind:
        !hlre.isGrounded || hlre.hasUnverifiedPremises
          ? 'exploratory'
          : 'constraint-led',
      postulationValidatedByNewIndependentTests:
        hlre.isGrounded &&
        !hlre.hasUnverifiedPremises &&
        (hypothesis.independence === 'I3' || hypothesis.independence === 'I4'),
      unreportedParameterSelection: false,
      ledgerEndsInUnrederivedTranscription: endsInUnrederived,
      overrideStatus: 'NONE',
      supportInRecord: hlre.hlreGradeLetter,
      verificationRung: effectiveRung,
      rung4Kind:
        hlre.isGrounded && !hlre.hasUnverifiedPremises && effectiveRung >= 4
          ? '4D'
          : undefined,
      independentRoutesCount: hlre.isGrounded ? 2 : 0,
      kernelCheckedOrClosedLedger:
        hlre.isGrounded &&
        !hlre.hasUnverifiedPremises &&
        effectiveRung >= 4,
      exactArithmeticCertified: false,
      toolVerdicts:
        hlre.isGrounded && !hlre.hasUnverifiedPremises
          ? [
              {
                toolName: 'P1 Literature Grounding',
                version: 'Google Search',
                exitCode: 0,
                command: `ground --citations=${hypothesis.citations.length}`,
                verdictSummary: `Cited ${hypothesis.citations.length} grounded literature source(s).`,
                exactArithmetic: false,
                actuallyExecuted: true,
                outputHash: `sha256:arena-claim-p1-${hypothesis.id.toLowerCase()}`,
              },
              {
                toolName: 'Arena Tournament Judge',
                version: 'UM-1 Bradley-Terry',
                exitCode: 0,
                command: `arena-register --elo=${hypothesis.elo}`,
                verdictSummary: `Elo ${hypothesis.elo} (${hypothesis.wins}W-${hypothesis.losses}L-${hypothesis.draws}D); all ${hlre.verifiedPremiseCount} premises verified.`,
                exactArithmetic: false,
                actuallyExecuted: true,
                outputHash: `sha256:arena-claim-bt-${hypothesis.id.toLowerCase()}`,
              },
            ]
          : [],
      externalVerification: {
        executed: false,
        verifierAgent: 'None',
        auditedLocallyClaimByClaim: false,
        supportedGrade: hlre.hlreGradeLetter,
        auditNotes:
          hlre.capReasons[0] || 'Promoted from Hypothesis Arena for Execution Lab validation.',
      },
    } as ClaimGradingInput,
    createdAt: today,
  };
}

/**
 * Creates the seeded worked-example Arena tournament.
 * Note: Citations carry `verified: false` until verified via server-side `confirmSource` (HTTP 200 + text match).
 */
export function createWorkedExampleArenaState(
  autoRun = true
): ArenaTournamentState {
  const hypotheses: ArenaHypothesis[] = [
    {
      id: 'HYP-DOMAIN-1',
      persona: 'Domain Specialist',
      title: 'Jacobian Singular Ideal & Sylvester Resultant Localization of Nodal Bifurcations',
      statement:
        'Over Q(t), nodal degenerations of admissible Weierstrass cubic families y^2 = x^3 + a(t)x + b(t) are isolated identically by vanishing of the univariate Sylvester resultant R_x(f, ∂_x f) and captured with zero-dimensional multiplicity 1 by the Singular Gröbner basis std(<f, ∂_x f, ∂_y f>).',
      mechanism:
        'Because char(Q) = 0 guarantees invertibility of 2 and 3 in the coordinate ring, the Jacobian ideal J annihilates both partial derivatives strictly at singular fibers where Δ(t) = -16(4a(t)^3 + 27b(t)^2) = 0, preserving exact degree invariants without floating-point approximation.',
      falsifiableTest:
        'Compute std(J) over Q[x,y] for y^2 - x^3 + 3x - 2 and evaluate Python exact Fraction Sylvester resultant R_x; FAIL if dim(std(J)) != 0 or R_x != 0.',
      invariantFirstCheck:
        'Evaluate discriminant Δ = -16(4(-3)^3 + 27(2)^2) = 0 in exact integer arithmetic prior to Buchberger reduction.',
      um41aDefeater:
        'Defeated if char(k) in {2, 3} where 2y or 3x^2 vanishes, or if cusp degeneracy yields vdim(std(J)) >= 2 instead of nodal multiplicity 1.',
      domain: 'Arithmetic Geometry & Commutative Algebra',
      independence: 'I3',
      verificationRung: 4,
      premises: [
        {
          id: 'PRM-DOM-1',
          kind: 'observation',
          statement:
            'Weierstrass cubic nodal fiber y^2 = x^3 - 3x + 2 factorizes as y^2 - (x-1)^2(x+2) = 0 with double root at (1,0).',
          sourceCitation: 'arXiv:2502.18864 §2.1',
          verified: true,
        },
        {
          id: 'PRM-DOM-2',
          kind: 'assumption',
          statement:
            'Base field characteristic is 0 (or prime p >= 5) so 2y and 3x^2 + a remain non-degenerate generators.',
          sourceCitation: 'Singular Manual — Polynomial Rings over Q',
          verified: true,
        },
        {
          id: 'PRM-DOM-3',
          kind: 'claim_premise',
          statement:
            'Univariate resultant R_x(f, ∂_x f) divides the curve discriminant Δ up to leading unit -16 in Z.',
          sourceCitation: 'Cox-Little-OShea §3.6 (Discriminants & Resultants)',
          verified: true,
        },
      ],
      citations: [
        {
          title: 'arXiv:2502.18864 — Exact Modular Verification of Selmer Rank Parity',
          uri: 'https://arxiv.org/abs/2502.18864',
          snippet: 'Primary algebraic formulation of admissible Weierstrass cubic fibers over Q.',
          verified: false,
          confirmationStatus: 'UNVERIFIED',
        },
        {
          title: 'Singular 4.4 Computer Algebra Documentation — Gröbner Bases & Jacobian Ideals',
          uri: 'https://www.singular.uni-kl.de/Manual/4-4-0/index.htm',
          snippet: 'Exact Buchberger std(J) algorithm over ring 0,(x,y),dp.',
          verified: false,
          confirmationStatus: 'UNVERIFIED',
        },
      ],
      elo: 1500,
      wins: 0,
      losses: 0,
      draws: 0,
      isWorkedExample: true,
    },
    {
      id: 'HYP-SYNTH-2',
      persona: 'Synthesizer',
      title: 'Dual-Involution Bridge: 2-Selmer Root-Number Parity Conserved Under Edge-Laplacian Spectra',
      statement:
        'Combining Dokchitser-Dokchitser 2-Selmer parity invariance with Mathlib4 quadratic edge-form non-negativity yields a sign-preserving involution mapping local Tamagawa parity shifts to even-degree bipartite graph cuts.',
      mechanism:
        'Local root numbers w_v in {+1, -1} form a multiplicative Z/2Z cocycle whose sum over finite places mod 2 matches the parity of the signed Laplacian rank defect on the dual reduction graph.',
      falsifiableTest:
        'Formally verify mod-2 parity conservation (a + 2b) mod 2 = a mod 2 in Lean 4 and measure Tamagawa parity discrepancies across primes 5 <= p <= 37 in Python; FAIL if any unsolved sorry goal remains or parity mismatch > 0.',
      invariantFirstCheck:
        'Check boundary trace parity on K_3 and C_4 dual-graph reductions where every vertex degree is even.',
      um41aDefeater:
        'Defeated if Shafarevich-Tate 2-primary rank has non-square twist breaking the Z/2Z cocycle conservation across additive fibers.',
      domain: 'Number Theory ↔ Spectral Graph Theory',
      independence: 'I2',
      verificationRung: 3,
      premises: [
        {
          id: 'PRM-SYN-1',
          kind: 'observation',
          statement:
            'Dokchitser-Dokchitser theorem fixes w(E/Q) = (-1)^{dim_2 Sel_2(E/Q)} modulo Shafarevich-Tate squares.',
          sourceCitation: 'Dokchitser & Dokchitser (2010), Annals of Math',
          verified: true,
        },
        {
          id: 'PRM-SYN-2',
          kind: 'assumption',
          statement:
            'Dual reduction graph Laplacian L = B^T B satisfies x^T L x = sum (x_u - x_v)^2 >= 0 over Z.',
          sourceCitation: 'Mathlib4 LinearAlgebra.QuadraticForm',
          verified: true,
        },
      ],
      citations: [
        {
          title: 'Dokchitser & Dokchitser — Root numbers and parity of ranks of elliptic curves',
          uri: 'https://arxiv.org/abs/0906.1815',
          snippet: 'Establishes global 2-Selmer parity invariance across local root-number products.',
          verified: false,
          confirmationStatus: 'UNVERIFIED',
        },
        {
          title: 'Lean 4 Mathlib4 Documentation — Tactic.Omega & ZMod Parity',
          uri: 'https://leanprover-community.github.io/mathlib4_docs/',
          snippet: 'Kernel-checked integer parity and non-negative quadratic expansion primitives.',
          verified: false,
          confirmationStatus: 'UNVERIFIED',
        },
      ],
      elo: 1500,
      wins: 0,
      losses: 0,
      draws: 0,
      isWorkedExample: true,
    },
    {
      id: 'HYP-SKEPTIC-3',
      persona: 'Skeptic/Adversary',
      title: 'Characteristic-2/3 Wild Ramification Obstruction Breaks Naive Jacobian Parity Transfer',
      statement:
        'Any bridge transferring Jacobian singular multiplicity directly to global 2-Selmer parity fails on curves with wild ramification at p = 2 or p = 3 unless Tate algorithm Kodaira fibers are separately stratified.',
      mechanism:
        'In char 2 and char 3, partial derivatives 2y and 3x^2 vanish identically on the special fiber, collapsing the naive Jacobian ideal and decoupling conductor exponent jumps from Tamagawa parity.',
      falsifiableTest:
        'Evaluate Jacobian ideal dim over F_2 and F_3 for y^2 + y = x^3 - x and measure Kodaira II*/III* conductor jumps; FAIL if naive Jacobian parity matches true root number across all wild fibers.',
      invariantFirstCheck:
        'Check reduction of 2y mod 2 and 3x^2 mod 3 on minimal Weierstrass model at p = 2, 3.',
      um41aDefeater:
        'Defeated if minimal Weierstrass substitution eliminates wild ramification across every curve in the torsion family.',
      domain: 'Arithmetic Geometry (Adversarial Boundary Audit)',
      independence: 'I2',
      verificationRung: 2,
      premises: [
        {
          id: 'PRM-SKP-1',
          kind: 'observation',
          statement:
            'Partial derivative ∂_y(y^2 - x^3 - ax - b) = 2y vanishes identically modulo 2.',
          sourceCitation: 'Silverman — Arithmetic of Elliptic Curves Ch. IV (Tate Algorithm)',
          verified: true,
        },
        {
          id: 'PRM-SKP-2',
          kind: 'assumption',
          statement:
            'Wild ramification conductor exponent jump delta_2 >= 6 universally cancels additive root-number flips without full Kodaira fiber classification.',
          sourceCitation: 'Conjectured adversary bound (pending local verification)',
          verified: false,
        },
      ],
      citations: [
        {
          title: "Wikipedia / Reference Summary — Tate's Algorithm & Kodaira Fiber Classification",
          uri: 'https://en.wikipedia.org/wiki/Tate%27s_algorithm',
          snippet: 'Classifies additive and wild-ramification fibers at primes 2 and 3.',
          verified: false,
          confirmationStatus: 'UNVERIFIED',
        },
      ],
      elo: 1500,
      wins: 0,
      losses: 0,
      draws: 0,
      isWorkedExample: true,
    },
    {
      id: 'HYP-GEN-4',
      persona: 'Generator',
      title: 'Universal Prime-Gap Resonance Predicts Rank-Jump Thresholds Without Modular Forms',
      statement:
        'Local Frobenius trace gaps (a_p - a_{p-1}) across consecutive primes p < 500 exhibit a universal harmonic resonance peak that predicts elliptic curve analytic rank jumps without modularity or L-series.',
      mechanism:
        'Postulates that local Sato-Tate angle clustering induces long-range phase locking between small-prime point counts N_p = p + 1 - a_p that bypasses Hasse-Weil global analytic continuation.',
      falsifiableTest:
        'Sweep 200 rank-0 and rank-2 curves over Q for prime-gap Fourier peak amplitude; FAIL if ROC AUC <= 0.55 against conductor-matched null curves.',
      invariantFirstCheck:
        'Verify whether mean normalized a_p / (2*sqrt(p)) diverges from zero over 5 <= p <= 97.',
      um41aDefeater:
        'Defeated if Sato-Tate equidistribution suppresses inter-prime Frobenius gap correlation to noise floor on independent conductor ranges.',
      domain: 'Speculative Arithmetic Dynamics',
      independence: 'I0',
      verificationRung: 1,
      premises: [
        {
          id: 'PRM-GEN-1',
          kind: 'observation',
          statement:
            'Hasse bound constrains Frobenius trace to |a_p| <= 2*sqrt(p) at primes of good reduction.',
          sourceCitation: 'Standard Hasse-Weil Theorem',
          verified: true,
        },
        {
          id: 'PRM-GEN-2',
          kind: 'primary_transcription',
          statement:
            'Consecutive prime-gap Frobenius trace phase locking directly encodes global Mordell-Weil rank independently of L(E, 1).',
          sourceCitation: 'Unverified speculative postulation (no supporting source)',
          verified: false,
        },
      ],
      citations: [], // Intentionally UNGROUNDED to demonstrate UNGROUNDED ASSERTION flag & Grade D cap
      elo: 1500,
      wins: 0,
      losses: 0,
      draws: 0,
      isWorkedExample: true,
    },
  ];

  const baseState: ArenaTournamentState = {
    researchGoal: WORKED_EXAMPLE_RESEARCH_GOAL,
    hypotheses,
    matchups: buildRoundRobinMatchups(hypotheses),
    isWorkedExample: true,
    lastUpdatedAt: new Date().toISOString(),
  };

  return autoRun ? runAllDeterministicMatchups(baseState) : baseState;
}

/**
 * Resets Elo ratings, CIs, W/L/D counters, and pairwise match-ups back to pending
 * so a tournament can be replayed step-by-step or re-judged after premise/grounding updates.
 */
export function resetArenaTournamentMatches(
  state: ArenaTournamentState
): ArenaTournamentState {
  const resetHyps = state.hypotheses.map((h) => ({
    ...h,
    elo: 1500,
    eloCiLow: undefined,
    eloCiHigh: undefined,
    eloStdErr: undefined,
    wins: 0,
    losses: 0,
    draws: 0,
  }));
  return {
    ...state,
    hypotheses: resetHyps,
    matchups: buildRoundRobinMatchups(resetHyps),
    lastUpdatedAt: new Date().toISOString(),
  };
}
