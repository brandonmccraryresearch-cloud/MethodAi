import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateNegativeAnalogyGuard,
  evaluateSheafCohomologyCycle,
  evaluateSciAFAcceptance,
  buildEpistemicMachineReport,
  lakatosianRowToUM1Claim,
} from './epistemic-machine';

test('Layer 2 Negative Analogy Guard blocks mapping 2nd-order inertia onto Thermal domain', () => {
  const blocked = evaluateNegativeAnalogyGuard(
    'Electrical (RLC Resonance)',
    'Thermal (Pure Conduction)',
    'Map inductor L resonance onto thermal conduction'
  );
  assert.equal(blocked.passed, false);
  assert.equal(blocked.ruleTriggered, 'LAYER2_THERMAL_NO_INERTANCE_L');
  assert.ok(blocked.blockedReason?.includes('NO conjugate thermal inertance (L)'));

  const allowed = evaluateNegativeAnalogyGuard(
    'Electrical',
    'Translational Mechanical',
    'Map voltage/current to force/velocity'
  );
  assert.equal(allowed.passed, true);
  assert.equal(allowed.blockedReason, null);
});

test('Layer 5B Cellular Sheaf Cohomology detects Möbius Frustration (+1, +1, -1) and triggers AGM Revision', () => {
  const frustrated = evaluateSheafCohomologyCycle(
    ['Physics', 'Biology', 'Chemistry'],
    [1, 1, -1],
    'Protective belt auxiliary postulate'
  );
  assert.equal(frustrated.hasMobiusFrustration, true);
  assert.ok(frustrated.h1ObstructionClass.includes('H¹(G; F) ≠ 0'));
  assert.ok(frustrated.agmBeliefRevisionAction.includes('Inconsistency-Adaptive Logic engaged'));

  const consistent = evaluateSheafCohomologyCycle(
    ['Physics', 'Biology', 'Chemistry'],
    [1, -1, -1]
  );
  assert.equal(consistent.hasMobiusFrustration, false);
});

test('Layer 5B SciAF Acceptance Criterion enforces Elab(c) ∧ DVP(c) ∧ ¬Disprove(¬c) with zero sorry', () => {
  const accepted = evaluateSciAFAcceptance({
    naturalEnglishClaim: 'The force is proportional to the rate of change of momentum.',
    z3StructuralLogicSmt2: '(assert (forall ((f Int)) (= f f)))',
    lean4TheoremCode: 'theorem force_momentum (f : Nat) : f = f := by rfl',
  });
  assert.equal(accepted.sciAfAccepted, true);

  const rejectedSorry = evaluateSciAFAcceptance({
    naturalEnglishClaim: 'Unproven conjecture',
    z3StructuralLogicSmt2: '(assert true)',
    lean4TheoremCode: 'theorem bad_proof : 1 = 1 := by sorry',
  });
  assert.equal(rejectedSorry.elabPassed, false);
  assert.equal(rejectedSorry.sciAfAccepted, false);
});

test('buildEpistemicMachineReport constructs 5-Layer Sieve, 7-Step Blueprint, and IRH v83->v94 Audit Ledger', () => {
  const report = buildEpistemicMachineReport();
  assert.equal(report.operational7Steps.length, 7);
  assert.equal(report.irhPathologyMatrix.length, 3);
  assert.equal(report.lakatosianProblemShiftLedger.length, 4);
  assert.equal(report.lakatosianProblemShiftLedger[0].finalGradeTag, '[REFORMED: RUNG 4]');
  assert.equal(report.lakatosianProblemShiftLedger[2].finalGradeTag, '[CONTRADICTED]');
  assert.equal(report.lakatosianProblemShiftLedger[3].finalGradeTag, '[GRADE F1: MACHINE VERIFIED]');

  const claim = lakatosianRowToUM1Claim(report.lakatosianProblemShiftLedger[3]);
  assert.equal(claim.gradingInput.track, 'F');
  assert.equal(claim.gradingInput.verificationRung, 4);
  assert.equal(claim.gradingInput.exactArithmeticCertified, true);
});
