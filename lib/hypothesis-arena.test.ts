import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaHypothesisToUM1Claim,
  buildRoundRobinMatchups,
  computeLeaderboardWithExplanations,
  createWorkedExampleArenaState,
  evaluateArenaHypothesisHLRE,
  evaluateDefeaterCriterion,
  evaluateDeterministicPairwiseMatchup,
  evaluateFalsifiabilityCriterion,
  fitBradleyTerryRatings,
  resetArenaTournamentMatches,
  runAllDeterministicMatchups,
  scoreHypothesisNormalized,
  type ArenaHypothesis,
} from './hypothesis-arena';
import { computeUM1Grade } from './um1-engine';
import { confirmSource, type SourceFetcher } from './grounding-confirmer';

function makeBareDefaultHypothesis(id: string): ArenaHypothesis {
  return {
    id,
    persona: 'Generator',
    title: 'Default Bare Hypothesis',
    statement: 'Default statement.',
    mechanism: 'Default',
    falsifiableTest: 'TBD',
    invariantFirstCheck: '',
    um41aDefeater: '',
    domain: 'General',
    independence: 'I1',
    verificationRung: 0,
    premises: [],
    citations: [],
    elo: 1500,
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

test('Worked example loads 4 distinct personas, executes 6 match-ups via Bradley-Terry, and is NOT all draws', () => {
  const pending = createWorkedExampleArenaState(false);
  assert.equal(pending.hypotheses.length, 4);
  assert.equal(pending.matchups.length, 6);
  assert.ok(pending.matchups.every((m) => m.status === 'pending'));

  const personas = new Set(pending.hypotheses.map((h) => h.persona));
  assert.deepEqual(
    personas,
    new Set(['Domain Specialist', 'Synthesizer', 'Skeptic/Adversary', 'Generator'])
  );

  // Every worked-example citation must start verified: false (only confirmSource sets verified: true)
  for (const h of pending.hypotheses) {
    assert.ok((h.um41aDefeater || '').length > 16);
    for (const c of h.citations) {
      assert.equal(c.verified, false);
    }
  }

  const completed = runAllDeterministicMatchups(pending);
  assert.ok(completed.matchups.every((m) => m.status === 'completed'));

  // Default worked-example matches must NOT all be draws (expect decisive outcomes for verified pairs, draw for unverified-vs-unverified)
  const decisiveCount = completed.matchups.filter((m) => m.winnerId !== 'draw').length;
  const drawCount = completed.matchups.filter((m) => m.winnerId === 'draw').length;
  assert.ok(decisiveCount >= 4, `Expected >=4 decisive matches, got ${decisiveCount}`);
  assert.equal(drawCount, 1, 'Expected Skeptic vs Generator unverified criterion-only match to draw');

  const leaderboard = computeLeaderboardWithExplanations(
    completed.hypotheses,
    completed.matchups
  );
  assert.equal(leaderboard.length, 4);
  assert.equal(leaderboard[0].hypothesis.persona, 'Domain Specialist');
  assert.ok(leaderboard[0].hypothesis.elo > 1500);
  assert.ok(typeof leaderboard[0].hypothesis.eloCiLow === 'number');
  assert.ok(typeof leaderboard[0].hypothesis.eloCiHigh === 'number');
  assert.ok(leaderboard[0].hypothesis.eloCiLow! < leaderboard[0].hypothesis.elo);
  assert.ok(leaderboard[0].hypothesis.elo < leaderboard[0].hypothesis.eloCiHigh!);

  for (const entry of leaderboard) {
    assert.ok(entry.rankingExplanation.includes(`#${entry.rank}`));
    assert.ok(entry.rankingExplanation.includes(`Elo ${entry.hypothesis.elo}`));
    assert.ok(entry.rankingExplanation.includes('95% CI'));
  }
});

test('Bradley-Terry MLE rating fit is invariant to match order and computes 95% CIs', () => {
  const completed = createWorkedExampleArenaState(true);
  const forward = fitBradleyTerryRatings(completed.hypotheses, completed.matchups);
  const reversed = fitBradleyTerryRatings(
    completed.hypotheses,
    [...completed.matchups].reverse()
  );

  for (let i = 0; i < forward.length; i++) {
    assert.equal(forward[i].elo, reversed[i].elo);
    assert.equal(forward[i].eloCiLow, reversed[i].eloCiLow);
    assert.equal(forward[i].eloCiHigh, reversed[i].eloCiHigh);
    assert.equal(forward[i].eloStdErr, reversed[i].eloStdErr);
    assert.equal(forward[i].wins, reversed[i].wins);
    assert.equal(forward[i].losses, reversed[i].losses);
    assert.equal(forward[i].draws, reversed[i].draws);
  }

  const reset = resetArenaTournamentMatches(completed);
  assert.ok(
    reset.hypotheses.every(
      (h) => h.elo === 1500 && h.wins === 0 && h.losses === 0 && h.draws === 0
    )
  );
  assert.equal(reset.matchups.length, buildRoundRobinMatchups(reset.hypotheses).length);
  assert.ok(reset.matchups.every((m) => m.status === 'pending'));
});

test('Criterion-only match between two unverified hypotheses is recorded as a draw', () => {
  const unverifiedA = {
    ...makeBareDefaultHypothesis('H-UNV-A'),
    statement: 'Long unverified conjecture about prime fiber parity in elliptic families.',
    mechanism: 'Heuristic local-global correspondence without executed verification.',
    falsifiableTest: 'Fails if Selmer rank parity != 0 mod 2 at any conductor p >= 5.',
    um41aDefeater: 'Breaks if Frobenius trace parity mismatches root number sign.',
  };
  const unverifiedB = {
    ...makeBareDefaultHypothesis('H-UNV-B'),
    persona: 'Skeptic/Adversary' as const,
    statement: 'Alternative unverified conjecture with no citations or executed runs.',
    mechanism: 'Counterexample family search.',
    falsifiableTest: 'Short TBD test',
  };

  const pendingMatch = {
    id: 'M-UNV',
    round: 1,
    hypothesisAId: unverifiedA.id,
    hypothesisBId: unverifiedB.id,
    status: 'pending' as const,
    winnerId: null,
  };
  const { completedMatchup: match } = evaluateDeterministicPairwiseMatchup(
    [unverifiedA, unverifiedB],
    pendingMatch
  );
  assert.equal(match.winnerId, 'draw');
  assert.ok(match.judgeSummary?.toLowerCase().includes('draw'));

  const fitted = fitBradleyTerryRatings([unverifiedA, unverifiedB], [match]);
  assert.equal(fitted[0].elo, 1500);
  assert.equal(fitted[1].elo, 1500);
  assert.equal(fitted[0].draws, 1);
  assert.equal(fitted[1].draws, 1);
});

test('Falsifiability criterion scores 0 on vacuous predictions and default bare hypothesis does NOT score 0.26', () => {
  assert.equal(evaluateFalsifiabilityCriterion('').score, 0);
  assert.equal(evaluateFalsifiabilityCriterion('TBD').score, 0);
  assert.equal(evaluateFalsifiabilityCriterion('Run experiment to check if true').score, 0);
  // Names observable but lacks refuting condition -> 0
  assert.equal(
    evaluateFalsifiabilityCriterion('Measure spectral determinant over rational fibers').score,
    0
  );
  // Names concrete observable AND explicit refuting condition -> > 0
  const rigorous = evaluateFalsifiabilityCriterion(
    'Compute exact resultant R(f, f_x) over Q; FAIL and reject hypothesis if resultant != 0.'
  );
  assert.ok(rigorous.score >= 0.85);
  assert.equal(rigorous.isVacuous, false);

  assert.equal(evaluateDefeaterCriterion('').valueOf(), 0);
  assert.ok(
    evaluateDefeaterCriterion('Defeated if Tamagawa factor parity shifts under char 2 reduction.') >= 0.75
  );

  // Regression guard: bare default hypothesis must NOT score 0.26 (previously 0.20 falsifiability + partial credits)
  const bare = makeBareDefaultHypothesis('H-BARE');
  const breakdown = scoreHypothesisNormalized(bare);
  assert.equal(breakdown.testability, 0);
  assert.equal(breakdown.defeater, 0);
  assert.notEqual(breakdown.overall, 0.26);
  assert.ok(breakdown.overall < 0.26, `Expected overall < 0.26, got ${breakdown.overall}`);
});

test('confirmSource requires HTTP 200 + text support and emits a UM-2.4b quote', async () => {
  const supportingFetcher: SourceFetcher = async () => ({
    status: 200,
    text: async () =>
      '<html><body><p>We establish that for rational elliptic curves, the 2-Selmer parity invariant equals the global root number sign across good primes p >= 5.</p></body></html>',
  });

  const ok = await confirmSource({
    uri: 'https://arxiv.org/abs/1003.2266',
    citedPassage: '2-Selmer parity invariant equals the global root number sign',
    fetcher: supportingFetcher,
  });
  assert.equal(ok.verified, true);
  assert.equal(ok.httpStatus, 200);
  assert.ok(ok.um24bQuote);
  assert.equal(ok.um24bQuote!.uri, 'https://arxiv.org/abs/1003.2266');
  assert.ok(ok.um24bQuote!.verbatimPassage.includes('2-Selmer parity invariant'));
  assert.ok(ok.um24bQuote!.sha256.length > 16);

  const notFoundFetcher: SourceFetcher = async () => ({
    status: 404,
    text: async () => 'Not found',
  });
  const fail404 = await confirmSource({
    uri: 'https://arxiv.org/abs/9999.99999',
    citedPassage: '2-Selmer parity invariant',
    fetcher: notFoundFetcher,
  });
  assert.equal(fail404.verified, false);
  assert.equal(fail404.um24bQuote, null);

  const unrelatedFetcher: SourceFetcher = async () => ({
    status: 200,
    text: async () =>
      '<html><body><p>Recipes for sourdough bread baking at sea level using flour and water.</p></body></html>',
  });
  const failMismatch = await confirmSource({
    uri: 'https://example.org/unrelated',
    citedPassage: '2-Selmer parity invariant equals root number sign',
    fetcher: unrelatedFetcher,
  });
  assert.equal(failMismatch.verified, false);
  assert.equal(failMismatch.um24bQuote, null);
});

test('HLRE worst-of grading honors verified premises, NOT VERIFIED caps, and UNGROUNDED caps', () => {
  const seeded = createWorkedExampleArenaState(true);
  const byId = new Map(seeded.hypotheses.map((h) => [h.id, h]));

  const domEval = evaluateArenaHypothesisHLRE(byId.get('HYP-DOMAIN-1')!);
  assert.equal(domEval.hlreGradeLetter, 'A');
  assert.equal(domEval.independence, 'I3');
  assert.equal(domEval.isGrounded, true);
  assert.equal(domEval.hasUnverifiedPremises, false);

  const synthEval = evaluateArenaHypothesisHLRE(byId.get('HYP-SYNTH-2')!);
  assert.equal(synthEval.hlreGradeLetter, 'B');
  assert.equal(synthEval.independence, 'I2');

  const skepticEval = evaluateArenaHypothesisHLRE(byId.get('HYP-SKEPTIC-3')!);
  assert.equal(skepticEval.isGrounded, true);
  assert.equal(skepticEval.hasUnverifiedPremises, true);
  assert.equal(skepticEval.unverifiedPremiseCount, 1);
  assert.equal(skepticEval.hlreGradeLetter, 'D');
  assert.ok(skepticEval.capReasons.some((r) => r.includes('NOT VERIFIED')));

  const genEval = evaluateArenaHypothesisHLRE(byId.get('HYP-GEN-4')!);
  assert.equal(genEval.isGrounded, false);
  assert.equal(genEval.hasUnverifiedPremises, true);
  assert.equal(genEval.hlreGradeLetter, 'D');
  assert.ok(genEval.capReasons.some((r) => r.includes('UNGROUNDED')));
});

test('1-click arenaHypothesisToUM1Claim preserves NOT VERIFIED and UNGROUNDED safeguards under computeUM1Grade', () => {
  const seeded = createWorkedExampleArenaState(true);
  const ungrounded = seeded.hypotheses.find((h) => h.id === 'HYP-GEN-4')!;
  const claim = arenaHypothesisToUM1Claim(ungrounded, seeded.researchGoal, 0);

  assert.equal(claim.preflight.P1_sourceComplete, false);
  assert.equal(claim.preflight.P3_premiseDependenciesChecked, false);
  assert.equal(claim.gradingInput.recordLabel, '[C]');
  assert.equal(claim.gradingInput.ledgerEndsInUnrederivedTranscription, true);
  assert.ok(claim.dependencyLedgerItems.some((i) => !i.hasSupportingVerdict));

  const computed = computeUM1Grade(claim.gradingInput);
  assert.equal(computed.finalGrade, 'INCOMPLETE-EVIDENCE');

  const verifiedDom = seeded.hypotheses.find((h) => h.id === 'HYP-DOMAIN-1')!;
  const domClaim = arenaHypothesisToUM1Claim(verifiedDom, seeded.researchGoal, 1);
  assert.equal(domClaim.preflight.P1_sourceComplete, true);
  assert.equal(domClaim.preflight.P3_premiseDependenciesChecked, true);
  assert.equal(computeUM1Grade(domClaim.gradingInput).finalGrade, 'A');
});
