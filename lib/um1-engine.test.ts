import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UM1_SKILL_VERSION,
  UM1_MV_SCOPE_DECISION,
  UM1_SKILL_VERSION_NOTES,
  computeUM1Grade,
  evaluatePreflightGates,
  runAutomatedPreflightAudit,
  buildAndAuditExternalVerification,
  findTransitiveDependents,
  applyRetractionAndDemote,
  restoreClaimWithExecutedVerdict,
  applyManualRungAndAuditUpdate,
  validateTierTransition,
  auditDependencyLedger,
  VERIFICATION_LADDER_SPECS,
  generateA1HypothesisMarkdown,
  generateA2VerdictMarkdown,
  generateResumeMarkdown,
  INITIAL_CLAIMS_DATA,
  INITIAL_WITHDRAWALS_DATA,
  type ClaimGradingInput,
  type ToolVerdictQuote,
} from './um1-engine';
import { isNoOpCode } from './frontier-discovery';

const baseTrackEInput: ClaimGradingInput = {
  track: 'E',
  tier: 'Full',
  recordLabel: '[D]',
  independence: 'I4',
  hasDiscriminatingComparison: true,
  postulationKind: 'constraint-led',
  postulationValidatedByNewIndependentTests: true,
  unreportedParameterSelection: false,
  ledgerEndsInUnrederivedTranscription: false,
  overrideStatus: 'NONE',
  supportInRecord: 'A',
  verificationRung: 4,
  independentRoutesCount: 2,
  kernelCheckedOrClosedLedger: true,
  exactArithmeticCertified: true,
  toolVerdicts: [
    {
      toolName: 'ToolA',
      version: '1.0.0',
      exitCode: 0,
      command: 'run_a',
      verdictSummary: 'PASS',
      exactArithmetic: true,
    },
    {
      toolName: 'ToolB',
      version: '2.1.0',
      exitCode: 0,
      command: 'run_b',
      verdictSummary: 'PASS',
      exactArithmetic: true,
    },
  ],
  externalVerification: {
    executed: true,
    verifierAgent: 'Gemini 4 (Argon)',
    auditedLocallyClaimByClaim: true,
    supportedGrade: 'A',
    auditNotes: 'Audited locally',
  },
};

test('Track E Full I4 with validated postulation and 2 tools achieves Grade A', () => {
  const res = computeUM1Grade(baseTrackEInput);
  assert.equal(res.finalGrade, 'A');
  assert.equal(res.computationGatePassed, true);
});

test('2026-11-12 Amendment: I1 without external verification is capped at D, and rises with audited external verification', () => {
  const withoutExt = computeUM1Grade({
    ...baseTrackEInput,
    independence: 'I1',
    externalVerification: {
      executed: false,
      verifierAgent: 'None',
      auditedLocallyClaimByClaim: false,
      supportedGrade: 'C',
      auditNotes: '',
    },
  });
  assert.equal(withoutExt.finalGrade, 'D');

  const withExt = computeUM1Grade({
    ...baseTrackEInput,
    tier: 'Standard',
    independence: 'I1',
    postulationKind: 'constraint-led',
    postulationValidatedByNewIndependentTests: false,
    externalVerification: {
      executed: true,
      verifierAgent: 'Manus',
      auditedLocallyClaimByClaim: true,
      supportedGrade: 'C',
      auditNotes: 'Verified claim-by-claim',
    },
  });
  assert.equal(withExt.finalGrade, 'C');
});

test('Track F requires exact arithmetic and Rung >= 2, achieving F1 when kernel-checked with 2 tools', () => {
  const f1Res = computeUM1Grade(INITIAL_CLAIMS_DATA[0].gradingInput);
  assert.equal(f1Res.finalGrade, 'F1');

  const floatContaminated = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    exactArithmeticCertified: false,
  });
  assert.equal(floatContaminated.finalGrade, 'INCOMPLETE-EVIDENCE');

  const rung1Only = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    verificationRung: 1,
  });
  assert.equal(rung1Only.finalGrade, 'INCOMPLETE-EVIDENCE');
});

test('UM-1.1 Tier transition: raising tier is free, lowering tier requires logged justification', () => {
  const raiseRes = validateTierTransition('Lite', 'Standard', '');
  assert.equal(raiseRes.valid, true);
  assert.equal(raiseRes.direction, 'raised');

  const lowerWithoutJustification = validateTierTransition('Full', 'Standard', '');
  assert.equal(lowerWithoutJustification.valid, false);
  assert.equal(lowerWithoutJustification.direction, 'lowered');

  const lowerWithJustification = validateTierTransition(
    'Full',
    'Standard',
    'Lowered because I3 external dataset replication was deferred to next quarter.'
  );
  assert.equal(lowerWithJustification.valid, true);
  assert.equal(lowerWithJustification.direction, 'lowered');
});

test('UM-4.1 Verification Ladder specs cover Rung 0 through Rung 5', () => {
  assert.equal(VERIFICATION_LADDER_SPECS.length, 6);
  assert.equal(VERIFICATION_LADDER_SPECS[0].rung, 0);
  assert.equal(VERIFICATION_LADDER_SPECS[5].rung, 5);
});

test('UM-4.4 Dependency Ledger & P3 audit flags un-re-derived leaf transcriptions as INCOMPLETE-EVIDENCE', () => {
  const audit101 = auditDependencyLedger(INITIAL_CLAIMS_DATA[0], INITIAL_CLAIMS_DATA);
  assert.equal(audit101.endsInUnrederivedTranscription, false);
  assert.equal(audit101.p3GatePassed, true);

  const audit103 = auditDependencyLedger(INITIAL_CLAIMS_DATA[2], INITIAL_CLAIMS_DATA);
  assert.equal(audit103.endsInUnrederivedTranscription, true);
  assert.equal(audit103.p3GatePassed, false);
  assert.equal(computeUM1Grade(INITIAL_CLAIMS_DATA[2].gradingInput).finalGrade, 'INCOMPLETE-EVIDENCE');
});

test('Automated Preflight Audit (P1-P7) inspects record fields and guides remediation (UM-2.5)', () => {
  const audit101 = runAutomatedPreflightAudit(INITIAL_CLAIMS_DATA[0], INITIAL_CLAIMS_DATA);
  assert.equal(audit101.readyForCompute, true);
  assert.equal(audit101.passedCount, 7);
  assert.equal(audit101.diagnostics.length, 7);

  const audit103 = runAutomatedPreflightAudit(INITIAL_CLAIMS_DATA[2], INITIAL_CLAIMS_DATA);
  assert.equal(audit103.readyForCompute, false);
  const p3Diag = audit103.diagnostics.find((d) => d.gateId === 'P3')!;
  assert.equal(p3Diag.passed, false);
});

test('UM-4.3 External Verification builds Step 6 HLRE prompt and claim-by-claim local audit log', () => {
  assert.equal(UM1_SKILL_VERSION, '3.1');
  const { promptBlock, logEntry } = buildAndAuditExternalVerification(
    INITIAL_CLAIMS_DATA[0],
    INITIAL_CLAIMS_DATA,
    'Academia Co-Scientist',
    'UM-1 v3.1 (HLRE v5.1)',
    25,
    true
  );
  assert.ok(promptBlock.includes('Academia Co-Scientist'));
  assert.equal(logEntry.recommendedGrade, 'F1');
  assert.equal(logEntry.locallyAuditedClaimByClaim, true);
  assert.equal(logEntry.claimChecks.length, 4);
});

test('Preflight P1-P7 enforces $300/service/month spend cap ceiling (UM-2.5)', () => {
  const validPreflight = evaluatePreflightGates(INITIAL_CLAIMS_DATA[0].preflight);
  assert.equal(validPreflight.readyForCompute, true);
  assert.equal(validPreflight.passedCount, 7);

  const overBudget = evaluatePreflightGates({
    ...INITIAL_CLAIMS_DATA[0].preflight,
    spendCapUsd: 450,
  });
  assert.equal(overBudget.readyForCompute, false);
  assert.equal(overBudget.spendCapValid, false);
});

test('Retraction mechanically demotes transitive dependents to INCOMPLETE-EVIDENCE (UM-4.5)', () => {
  const dependents = findTransitiveDependents('CLM-101', INITIAL_CLAIMS_DATA);
  assert.deepEqual(dependents, ['CLM-102', 'CLM-103']);

  const { updatedClaims, demotedIds } = applyRetractionAndDemote('CLM-101', INITIAL_CLAIMS_DATA);
  assert.equal(demotedIds.length, 2);

  const clm101 = updatedClaims.find((c) => c.id === 'CLM-101')!;
  const clm102 = updatedClaims.find((c) => c.id === 'CLM-102')!;
  const clm103 = updatedClaims.find((c) => c.id === 'CLM-103')!;

  assert.equal(computeUM1Grade(clm101.gradingInput).finalGrade, 'CONTRADICTED');
  assert.equal(computeUM1Grade(clm102.gradingInput).finalGrade, 'INCOMPLETE-EVIDENCE');
  assert.equal(computeUM1Grade(clm103.gradingInput).finalGrade, 'INCOMPLETE-EVIDENCE');
});

test('Condensed templates A1, A2, and RESUME.md generate complete structured records', () => {
  const a1 = generateA1HypothesisMarkdown(INITIAL_CLAIMS_DATA[0]);
  assert.ok(a1.includes('claim_id: "CLM-101"'));
  assert.ok(a1.includes('One-Sidedness'));
  assert.ok(a1.includes('Method:'));

  const a2 = generateA2VerdictMarkdown(INITIAL_CLAIMS_DATA[0]);
  assert.ok(a2.includes('Final HLRE Grade:** **F1**'));
  assert.ok(a2.includes('Rung 4 (4K)') || a2.includes('4K'));

  const resume = generateResumeMarkdown(INITIAL_CLAIMS_DATA, INITIAL_WITHDRAWALS_DATA, 'mordell-weil-obstruction');
  assert.ok(resume.includes('program/mordell-weil-obstruction/state.md'));
  assert.ok(resume.includes('CLM-101'));
  assert.ok(resume.includes('UM-1 Skill v3.1'));
});

test('v2.1 Section-9 Seeded-Error Self-Test: 4 seeded errors fail Computation Gate while F3 and F2 controls pass', () => {
  const executedPythonVerdict: ToolVerdictQuote = {
    toolName: 'Python 3 Exact Symbolic',
    version: 'Python 3.11.2',
    expectedVersion: 'Python 3.11.2',
    exitCode: 0,
    command: 'python3 -I verify_bounds.py',
    verdictSummary: 'EXACT CERTIFICATE PASS',
    exactArithmetic: true,
    actuallyExecuted: true,
    outputHash: 'hash-py-001',
    executionId: 'EXEC-PY-001',
  };

  // 1. scan-as-kernel (grep/ripgrep masquerading as kernel verification)
  const scanAsKernel = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    verificationRung: 4,
    toolVerdicts: [
      {
        toolName: 'Scan-as-Kernel',
        version: 'ripgrep 14.1.0',
        exitCode: 0,
        command: 'rg -n "theorem" formal/',
        verdictSummary: 'Matched 3 theorem lines via scan-as-kernel',
        exactArithmetic: true,
        actuallyExecuted: true,
        outputHash: 'hash-rg-001',
      },
    ],
  });
  assert.equal(scanAsKernel.finalGrade, 'INCOMPLETE-EVIDENCE');
  assert.equal(scanAsKernel.computationGatePassed, false);

  // 2. canned Singular runner (unexecuted canned fallback)
  const cannedSingular = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    verificationRung: 3,
    toolVerdicts: [
      {
        toolName: 'Singular Commutative Algebra',
        version: 'Singular 4.4.0 (Canned Fallback)',
        exitCode: 0,
        command: 'Singular -q ideal.sing',
        verdictSummary: 'Canned Gröbner output dim=0',
        exactArithmetic: true,
        actuallyExecuted: false,
        outputHash: 'hash-sing-canned',
      },
    ],
  });
  assert.equal(cannedSingular.finalGrade, 'INCOMPLETE-EVIDENCE');
  assert.equal(cannedSingular.computationGatePassed, false);

  // 3. confirmed seed with no verdicts (0 tools)
  const confirmedSeedNoVerdicts = computeUM1Grade({
    ...baseTrackEInput,
    toolVerdicts: [],
  });
  assert.equal(confirmedSeedNoVerdicts.finalGrade, 'INCOMPLETE-EVIDENCE');
  assert.equal(confirmedSeedNoVerdicts.computationGatePassed, false);

  // 4. same non-execution under two names
  const sameNonExecTwoNames = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    verificationRung: 3,
    toolVerdicts: [
      {
        toolName: 'FormalVerifierAlpha',
        version: '1.0.0',
        exitCode: 0,
        command: 'dry-run-check',
        verdictSummary: 'unexecuted placeholder',
        exactArithmetic: true,
        actuallyExecuted: false,
        executionId: 'SHARED-DRY-1',
      },
      {
        toolName: 'FormalVerifierBeta',
        version: '1.0.0',
        exitCode: 0,
        command: 'dry-run-check',
        verdictSummary: 'unexecuted placeholder',
        exactArithmetic: true,
        actuallyExecuted: false,
        executionId: 'SHARED-DRY-1',
      },
    ],
  });
  assert.equal(sameNonExecTwoNames.finalGrade, 'INCOMPLETE-EVIDENCE');
  assert.equal(sameNonExecTwoNames.computationGatePassed, false);

  // Control A: F3 with 1 genuinely executed Python verdict
  const controlF3 = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    verificationRung: 2,
    independentRoutesCount: 1,
    kernelCheckedOrClosedLedger: false,
    toolVerdicts: [executedPythonVerdict],
  });
  assert.equal(controlF3.finalGrade, 'F3');
  assert.equal(controlF3.computationGatePassed, true);

  // Control B: F2 with 2 independent genuinely executed passing tools
  const controlF2 = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    tier: 'Standard',
    verificationRung: 3,
    independentRoutesCount: 2,
    kernelCheckedOrClosedLedger: false,
    toolVerdicts: [
      executedPythonVerdict,
      {
        toolName: 'SageMath Exact Ring Checker',
        version: 'SageMath 10.4',
        expectedVersion: 'SageMath 10.4',
        exitCode: 0,
        command: 'sage -python verify_ring.sage',
        verdictSummary: 'Exact polynomial ideal quotient verified',
        exactArithmetic: true,
        actuallyExecuted: true,
        outputHash: 'hash-sage-002',
        executionId: 'EXEC-SAGE-002',
      },
    ],
  });
  assert.equal(controlF2.finalGrade, 'F2');
  assert.equal(controlF2.computationGatePassed, true);
});

test('UM-2.4(j) No-Op Floor rejects empty, pass, and trivial scripts with zero credit', () => {
  assert.equal(isNoOpCode('python', 'pass').isNoOp, true);
  assert.equal(isNoOpCode('python', '# comment only\n   ').isNoOp, true);
  assert.equal(isNoOpCode('python', 'print("ok")').isNoOp, true);
  assert.equal(
    isNoOpCode('python', 'from fractions import Fraction\nassert Fraction(1,2) + Fraction(1,2) == 1').isNoOp,
    false
  );

  const noOpGrade = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    verificationRung: 2,
    toolVerdicts: [
      {
        toolName: 'Python 3',
        version: 'Python 3.11.2',
        exitCode: 0,
        command: 'python3 -c "pass"',
        verdictSummary: 'Exited 0',
        exactArithmetic: true,
        actuallyExecuted: true,
      },
    ],
  });
  assert.equal(noOpGrade.finalGrade, 'INCOMPLETE-EVIDENCE');
  assert.equal(noOpGrade.computationGatePassed, false);
});

test('v2.1 Computational-F1 (4D), UM-2.4c(2) version mismatch, CITED-ELSEWHERE, and Section-6 ABSTAIN', () => {
  // Computational-F1 (4D): closed ledger + 2nd independent implementation + archived hashed outputs
  const compF1 = computeUM1Grade({
    track: 'F',
    tier: 'Full',
    recordLabel: '[D]',
    independence: 'I3',
    hasDiscriminatingComparison: true,
    postulationKind: 'constraint-led',
    postulationValidatedByNewIndependentTests: true,
    unreportedParameterSelection: false,
    ledgerEndsInUnrederivedTranscription: false,
    overrideStatus: 'NONE',
    supportInRecord: 'A',
    verificationRung: 4,
    rung4Kind: '4D',
    independentRoutesCount: 2,
    kernelCheckedOrClosedLedger: true,
    exactArithmeticCertified: true,
    archivedOutputHashes: ['sha256:runA', 'sha256:runB'],
    toolVerdicts: [
      {
        toolName: 'Python Exact Q',
        version: '3.11.2',
        exitCode: 0,
        command: 'python3 verify_a.py',
        verdictSummary: 'PASS A',
        exactArithmetic: true,
        actuallyExecuted: true,
        outputHash: 'sha256:runA',
      },
      {
        toolName: 'Singular 4',
        version: '4.4.0',
        exitCode: 0,
        command: 'Singular -q verify_b.sing',
        verdictSummary: 'PASS B',
        exactArithmetic: true,
        actuallyExecuted: true,
        outputHash: 'sha256:runB',
      },
    ],
    externalVerification: {
      executed: false,
      verifierAgent: 'None',
      auditedLocallyClaimByClaim: false,
      supportedGrade: 'A',
      auditNotes: '',
    },
  });
  assert.equal(compF1.finalGrade, 'F1');
  assert.equal(compF1.rung4Kind, '4D');

  // Decided [MV] scope: 4D closed-ledger Computational-F1 earns [MV]/F1 as well as 4K
  assert.ok(UM1_MV_SCOPE_DECISION.includes('4K') && UM1_MV_SCOPE_DECISION.includes('4D'));
  assert.ok(UM1_SKILL_VERSION_NOTES.some((n) => n.includes('[MV] scope DECIDED')));
  const compF1MV = computeUM1Grade({
    track: 'F',
    tier: 'Full',
    recordLabel: '[MV]',
    independence: 'I3',
    hasDiscriminatingComparison: true,
    postulationKind: 'constraint-led',
    postulationValidatedByNewIndependentTests: true,
    unreportedParameterSelection: false,
    ledgerEndsInUnrederivedTranscription: false,
    overrideStatus: 'NONE',
    supportInRecord: 'A',
    verificationRung: 4,
    rung4Kind: '4D',
    independentRoutesCount: 2,
    kernelCheckedOrClosedLedger: true,
    exactArithmeticCertified: true,
    archivedOutputHashes: ['sha256:runA', 'sha256:runB'],
    toolVerdicts: [
      {
        toolName: 'Python Exact Q',
        version: '3.11.2',
        exitCode: 0,
        command: 'python3 verify_a.py',
        verdictSummary: 'PASS A',
        exactArithmetic: true,
        actuallyExecuted: true,
        outputHash: 'sha256:runA',
      },
      {
        toolName: 'Singular 4',
        version: '4.4.0',
        exitCode: 0,
        command: 'Singular -q verify_b.sing',
        verdictSummary: 'PASS B',
        exactArithmetic: true,
        actuallyExecuted: true,
        outputHash: 'sha256:runB',
      },
    ],
    externalVerification: {
      executed: false,
      verifierAgent: 'None',
      auditedLocallyClaimByClaim: false,
      supportedGrade: 'A',
      auditNotes: '',
    },
  });
  assert.equal(compF1MV.finalGrade, 'F1');
  assert.equal(compF1MV.rung4Kind, '4D');

  // Version mismatch under UM-2.4(c)(2)
  const versionMismatch = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    toolVerdicts: [
      {
        toolName: 'Lean 4',
        version: 'unknown',
        expectedVersion: '4.15.0',
        exitCode: 0,
        command: 'lean proof.lean',
        verdictSummary: 'ok',
        exactArithmetic: true,
        actuallyExecuted: true,
      },
    ],
  });
  assert.equal(versionMismatch.finalGrade, 'INCOMPLETE-EVIDENCE');

  // UM-4.4 CITED-ELSEWHERE blocks grade
  const baseWithCitedElsewhere = {
    ...INITIAL_CLAIMS_DATA[0],
    dependencyLedgerItems: [
      {
        id: 'DEP-CITED-1',
        kind: 'primary_transcription' as const,
        statement: 'External Lemma 3.4 used without local re-derivation',
        sourceCitation: 'CITED-ELSEWHERE: Smith 2024',
        hasSupportingVerdict: true,
        independentlyRederived: false,
        isLeafTranscription: false,
        status: 'CITED-ELSEWHERE' as const,
      },
    ],
  };
  const depAudit = auditDependencyLedger(baseWithCitedElsewhere, [baseWithCitedElsewhere]);
  assert.equal(depAudit.hasCitedElsewhere, true);
  assert.equal(depAudit.p3GatePassed, false);
  const citedGrade = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    hasCitedElsewherePremise: true,
  });
  assert.equal(citedGrade.finalGrade, 'INCOMPLETE-EVIDENCE');

  // Paper-mode Section-6 ABSTAIN
  const paperAbstain = computeUM1Grade({
    ...INITIAL_CLAIMS_DATA[0].gradingInput,
    paperMode: true,
    toolVerdicts: [],
  });
  assert.equal(paperAbstain.finalGrade, 'ABSTAIN');
});

test('Upgrade 3a: handleRestoreClaim & handleUpdateRungAndAudit close live fabrication holes', () => {
  const { updatedClaims } = applyRetractionAndDemote('CLM-101', INITIAL_CLAIMS_DATA);
  const retracted101 = updatedClaims.find((c) => c.id === 'CLM-101')!;

  // Cannot restore without a verdict
  const noVerdict = restoreClaimWithExecutedVerdict(retracted101);
  assert.equal(noVerdict.restored, false);
  assert.equal(noVerdict.claim.gradingInput.overrideStatus, 'CONTRADICTED');

  // Cannot restore with unexecuted / canned verdict
  const fakeVerdict = restoreClaimWithExecutedVerdict(retracted101, {
    toolName: 'Python 3',
    version: '3.11.2',
    exitCode: 0,
    command: 'python3 -I check.py',
    verdictSummary: 'simulated',
    exactArithmetic: true,
    actuallyExecuted: false,
    outputHash: 'new-hash-fake',
  });
  assert.equal(fakeVerdict.restored, false);

  // Cannot restore with duplicate of an existing verdict
  const dupVerdict = restoreClaimWithExecutedVerdict(
    retracted101,
    retracted101.gradingInput.toolVerdicts[0]
  );
  assert.equal(dupVerdict.restored, false);

  // Valid NEW executed verdict restores cleanly
  const goodVerdict = restoreClaimWithExecutedVerdict(retracted101, {
    toolName: 'Python 3 Exact Recovery',
    version: 'Python 3.11.2',
    exitCode: 0,
    command: 'python3 -I recovery_check.py',
    verdictSummary: 'Re-derived exact certificate after retraction patch',
    exactArithmetic: true,
    actuallyExecuted: true,
    outputHash: 'sha256:fresh-recovery-999',
    executionId: 'EXEC-RECOVER-999',
  });
  assert.equal(goodVerdict.restored, true);
  assert.equal(goodVerdict.claim.verdictOutcome, 'confirmed');
  assert.equal(goodVerdict.claim.gradingInput.overrideStatus, 'NONE');

  // Manual rung assignment to Rung 4 must NEVER flip kernelCheckedOrClosedLedger to true
  const unverifiedClaim = {
    ...INITIAL_CLAIMS_DATA[1],
    gradingInput: {
      ...INITIAL_CLAIMS_DATA[1].gradingInput,
      verificationRung: 1 as const,
      kernelCheckedOrClosedLedger: false,
    },
  };
  const updatedManual = applyManualRungAndAuditUpdate(
    unverifiedClaim,
    4,
    unverifiedClaim.rungAudits,
    'Manual audit note'
  );
  assert.equal(updatedManual.gradingInput.verificationRung, 4);
  assert.equal(updatedManual.gradingInput.kernelCheckedOrClosedLedger, false);
});
