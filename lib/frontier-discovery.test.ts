import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeLean4Code,
  parseSingularScript,
  executionRunToToolVerdict,
  buildCorpusSynthesisAndDiscoveries,
  EXECUTION_STARTER_TEMPLATES,
} from './frontier-discovery';

test('analyzeLean4Code certifies valid Lean 4 proofs and flags sorry/admit tokens', () => {
  const validProof = EXECUTION_STARTER_TEMPLATES.lean4[0].code;
  const res = analyzeLean4Code(validProof);
  assert.equal(res.validSyntax, true);
  assert.equal(res.hasSorryOrAdmit, false);
  assert.equal(res.kernelVerified, true);
  assert.equal(res.exitCode, 0);
  assert.ok(res.theoremsDeclared.includes('selmer_parity_involution'));

  const sorryProof = `import Mathlib.Tactic\ntheorem incomplete_claim (n : Nat) : n = n + 0 := by sorry`;
  const badRes = analyzeLean4Code(sorryProof);
  assert.equal(badRes.hasSorryOrAdmit, true);
  assert.equal(badRes.kernelVerified, false);
  assert.equal(badRes.exitCode, 1);
});

test('parseSingularScript extracts ring characteristic, variables, ordering, ideals, and commands', () => {
  const script = EXECUTION_STARTER_TEMPLATES.singular[0].code;
  const parsed = parseSingularScript(script);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.characteristic, 0);
  assert.deepEqual(parsed.variables, ['x', 'y']);
  assert.equal(parsed.ordering, 'dp');
  assert.ok(parsed.ideals.length >= 2);
  assert.ok(parsed.commands.some((c) => c.startsWith('std(')));
});

test('executionRunToToolVerdict formats UM-2.4 ToolVerdictQuote with version, exitCode, and sha256', () => {
  const verdict = executionRunToToolVerdict({
    id: 'RUN-101',
    runtime: 'singular',
    runtimeVersion: 'Singular 4.4.0 (Exact Q)',
    title: 'Elliptic Discriminant Ideal',
    code: 'ring R = 0, (x,y), dp;',
    stdout: 'G[1]=x-1\nG[2]=y\ndim(G) = 0\nvdim(G) = 1',
    stderr: '',
    exitCode: 0,
    exactArithmeticVerified: true,
    durationMs: 42,
    sha256Hash: 'a1b2c3d4e5f60123456789abcdef',
    timestamp: new Date().toISOString(),
    diagnostics: [],
  });
  assert.equal(verdict.toolName, 'Singular Commutative Algebra');
  assert.equal(verdict.exitCode, 0);
  assert.equal(verdict.exactArithmetic, true);
  assert.ok(verdict.verdictSummary.includes('sha256:a1b2c3d4e5f6'));
});

test('buildCorpusSynthesisAndDiscoveries generates cross-domain bridges with Lean 4, Singular, and Python templates', () => {
  const report = buildCorpusSynthesisAndDiscoveries(
    [
      {
        id: 'SRC-1',
        sourceType: 'arxiv',
        identifier: 'arXiv:2502.18864',
        title: 'AI Co-Scientist & Exact Symbolic Verification',
        domain: 'Algebraic Geometry',
      },
    ],
    'Discover structural invariants across algebraic geometry and spectral dynamics'
  );
  assert.equal(report.corpusCount, 1);
  assert.ok(report.crossDomainBridges.length >= 2);
  assert.ok(report.crossDomainBridges[0].dictionaryMapping.length >= 2);
  assert.ok(report.crossDomainBridges[0].lean4Template.includes('theorem'));
  assert.ok(report.crossDomainBridges[0].singularTemplate.includes('ring R'));
  assert.ok(report.crossDomainBridges[0].pythonTemplate.includes('Fraction'));
});
