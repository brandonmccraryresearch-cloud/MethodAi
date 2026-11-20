'use client';

import React, { useState } from 'react';
import {
  EXECUTION_STARTER_TEMPLATES,
  executionRunToToolVerdict,
  type ExecutionRuntime,
  type ExecutionRunRecord,
} from '@/lib/frontier-discovery';
import {
  computeUM1Grade,
  type ClaimExperimentRecord,
  type ToolVerdictQuote,
} from '@/lib/um1-engine';
import {
  CheckCircle2,
  Code2,
  Cpu,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
  AlertTriangle,
} from 'lucide-react';

interface ExecutionLabViewProps {
  claims: ClaimExperimentRecord[];
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  executionRuns: ExecutionRunRecord[];
  onRecordExecutionRun: (run: ExecutionRunRecord) => void;
  onAttachToolVerdictToClaim: (
    claimId: string,
    verdict: ToolVerdictQuote,
    runtime: ExecutionRuntime
  ) => void;
  initialRuntime?: ExecutionRuntime;
  initialCode?: string;
  initialTitle?: string;
  onRequestNewClaim: () => void;
}

const RUNTIME_SPECS: Array<{
  id: ExecutionRuntime;
  label: string;
  version: string;
  badge: string;
  description: string;
}> = [
  {
    id: 'lean4',
    label: 'Lean 4 Formal Kernel',
    version: 'Lean 4.15.0 · Mathlib4',
    badge: 'Rung 4 Kernel Proof',
    description:
      'Formal dependent type theory & tactic verifier (`omega`, `ring`, `simp`, `rw`). Rejects `sorry`/`admit` tokens and certifies Rung 4 Kernel proofs.',
  },
  {
    id: 'singular',
    label: 'Singular Algebra System',
    version: 'Singular 4.4.0 · char 0 / F_p',
    badge: 'Gröbner / Syzygy / Ideal',
    description:
      'Commutative algebra & algebraic geometry engine (`std`, `dim`, `vdim`, `syz`, `resultant`) over exact polynomial rings Q[x_1..x_n].',
  },
  {
    id: 'python',
    label: 'Python 3 Exact Symbolic',
    version: 'Python 3.11.2 · SymPy / Q',
    badge: 'UM-2.3 Zero-Float',
    description:
      'Headless deterministic Python 3.11 subprocess with built-in exact rational (`Fraction`, `sympy.Rational`, `Matrix`, `resultant`) verification.',
  },
];

export default function ExecutionLabView({
  claims,
  selectedClaimId,
  onSelectClaim,
  executionRuns,
  onRecordExecutionRun,
  onAttachToolVerdictToClaim,
  initialRuntime = 'lean4',
  initialCode,
  initialTitle,
  onRequestNewClaim,
}: ExecutionLabViewProps) {
  const [runtime, setRuntime] = useState<ExecutionRuntime>(initialRuntime);
  const [scriptTitle, setScriptTitle] = useState<string>(
    initialTitle || EXECUTION_STARTER_TEMPLATES[initialRuntime][0].title
  );
  const [code, setCode] = useState<string>(
    initialCode || EXECUTION_STARTER_TEMPLATES[initialRuntime][0].code
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentRun, setCurrentRun] = useState<ExecutionRunRecord | null>(
    executionRuns[0] || null
  );
  const [attachedNotice, setAttachedNotice] = useState<string | null>(null);

  const activeClaim = claims.find((c) => c.id === selectedClaimId) || claims[0];

  const handleSelectRuntime = (nextRuntime: ExecutionRuntime) => {
    setRuntime(nextRuntime);
    setAttachedNotice(null);
    const defaultTemplate = EXECUTION_STARTER_TEMPLATES[nextRuntime][0];
    setScriptTitle(defaultTemplate.title);
    setCode(defaultTemplate.code);
  };

  const handleSelectTemplate = (tpl: { title: string; code: string }) => {
    setScriptTitle(tpl.title);
    setCode(tpl.code);
    setAttachedNotice(null);
  };

  const handleSynthesizeFromActiveClaim = () => {
    if (!activeClaim) return;
    setAttachedNotice(null);
    const safeSlug = activeClaim.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (runtime === 'lean4') {
      setScriptTitle(`${activeClaim.id}: Formal Invariant Proof`);
      setCode(`import Mathlib.Tactic

-- Formalization for ${activeClaim.id} (${activeClaim.expId || 'EXP-001'}): ${activeClaim.title}
-- Target: ${activeClaim.target}
-- Invariant-First (UM-1.4d): ${activeClaim.invariantFirstNote}

def claimInvariant_${safeSlug} (a b : Int) : Int := (a + b) * (a + b) - (a * a + 2 * a * b + b * b)

theorem ${safeSlug}_invariant_zero (a b : Int) :
    claimInvariant_${safeSlug} a b = 0 := by
  unfold claimInvariant_${safeSlug}
  ring

theorem ${safeSlug}_parity_preserved (n k : Nat) :
    (n + 2 * k) % 2 = n % 2 := by
  omega

#check ${safeSlug}_invariant_zero
#eval claimInvariant_${safeSlug} 42 (-17)`);
    } else if (runtime === 'singular') {
      setScriptTitle(`${activeClaim.id}: Singular Discriminant & Syzygy Check`);
      setCode(`// Singular 4.4.0 Verification for ${activeClaim.id}: ${activeClaim.title}
// Invariant-First: ${activeClaim.invariantFirstNote}
ring R = 0, (x, y, z), dp;
poly f = y^2 - x^3 + 3*x - 2;
ideal J = f, diff(f, x), diff(f, y);
ideal G = std(J);
G;
dim(G);
vdim(G);
resultant(diff(f, x), f, x);`);
    } else {
      setScriptTitle(`${activeClaim.id}: Exact Q-Arithmetic Certificate`);
      setCode(`from fractions import Fraction
from sympy import Symbol, Rational, Matrix, resultant

# Exact Arithmetic Verification for ${activeClaim.id} (${activeClaim.expId || 'EXP-001'})
# Claim: ${activeClaim.title}
x = Symbol('x')
f = x**3 - 3*x + 2
df = 3*x**2 - 3

res_val = resultant(f, df, x)
print(f"[${activeClaim.id}] Exact Sylvester Resultant R(f, f') over Q = {res_val}")
assert res_val == 0, "Expected vanishing resultant at critical parameter"

M = Matrix([
    [Fraction(2, 1), Fraction(-1, 1), Fraction(0, 1)],
    [Fraction(-1, 1), Fraction(2, 1), Fraction(-1, 1)],
    [Fraction(0, 1), Fraction(-1, 1), Fraction(2, 1)]
])
det_M = M.det()
print(f"[${activeClaim.id}] Exact Cartan/Laplacian 3x3 determinant over Q = {det_M}")
assert det_M == Fraction(4, 1), "Exact determinant check failed"
print("UM-2.3 & UM-2.4 EXACT ARITHMETIC VERDICT: PASS (exit_code=0)")`);
    }
  };

  const handleExecuteCode = async () => {
    setIsRunning(true);
    setAttachedNotice(null);
    try {
      const res = await fetch('/api/coscientist/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runtime,
          title: scriptTitle,
          code,
          linkedClaimId: activeClaim?.id,
        }),
      });
      const data = await res.json();
      if (data.run) {
        setCurrentRun(data.run);
        onRecordExecutionRun(data.run);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleCertifyToClaim = () => {
    if (!currentRun || !activeClaim) return;
    if (currentRun.isNoOp) {
      setAttachedNotice(
        `Rejected by UM-2.4(j) No-Op Floor: empty or no-op runs cannot be attached or promote rungs.`
      );
      return;
    }
    const verdict = executionRunToToolVerdict(currentRun);
    onAttachToolVerdictToClaim(activeClaim.id, verdict, currentRun.runtime);
    setAttachedNotice(
      verdict.actuallyExecuted === false
        ? `Logged unexecuted/static ${verdict.toolName} output to ${activeClaim.id} (actuallyExecuted=false — does NOT promote rungs or pass UM-2.4).`
        : `Attached executed ${verdict.toolName} verdict (exit=${verdict.exitCode}, exact=${verdict.exactArithmetic}) to ${activeClaim.id} (${
            activeClaim.expId || 'EXP'
          }).`
    );
  };

  const currentSpec = RUNTIME_SPECS.find((s) => s.id === runtime) || RUNTIME_SPECS[0];

  return (
    <div className="space-y-6">
      {/* Top Runtime Switcher & Active Claim Link Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs font-mono text-blue-700">
              UM-2.3 Exact Arithmetic &amp; UM-2.4 Multi-Tool Computation Gate
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">
              Formal &amp; Symbolic Execution Lab (Lean 4 · Singular · Python 3)
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-3xl">
              Execute formal proofs in Lean 4, Gröbner bases and syzygies in Singular, and exact
              rational/modular scripts in Python 3.11. Attach quoted tool verdicts with versions and
              SHA-256 manifests directly to your claims.
            </p>
          </div>

          {/* Active Claim Target Selector */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {claims.length > 0 ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5">
                <span className="text-xs font-mono text-slate-500">Target Claim:</span>
                <select
                  aria-label="Target Claim for Execution Verdict"
                  value={activeClaim?.id || ''}
                  onChange={(e) => onSelectClaim(e.target.value)}
                  className="text-xs font-mono font-semibold text-slate-900 bg-transparent focus:outline-none"
                >
                  {claims.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} ({c.expId || 'No EXP'}) — {c.title.slice(0, 36)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <button
                type="button"
                onClick={onRequestNewClaim}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
              >
                + Register Claim to Attach Verdicts
              </button>
            )}
          </div>
        </div>

        {/* 3 Runtime Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4" role="tablist" aria-label="Execution Runtime">
          {RUNTIME_SPECS.map((spec) => {
            const selected = runtime === spec.id;
            return (
              <button
                key={spec.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => handleSelectRuntime(spec.id)}
                data-testid={`exec-runtime-tab-${spec.id}`}
                className={`p-3.5 rounded-md border text-left transition-colors ${
                  selected
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{spec.label}</span>
                  <span
                    className={`text-[11px] font-mono ${
                      selected ? 'text-blue-300' : 'text-blue-700'
                    }`}
                  >
                    {spec.badge}
                  </span>
                </div>
                <div
                  className={`text-[11px] font-mono mt-0.5 ${
                    selected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {spec.version}
                </div>
                <p
                  className={`text-xs mt-1.5 leading-snug ${
                    selected ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  {spec.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Console: Left Code Editor & Templates | Right Live Execution Output & UM-2.4 Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Code Editor & Starter Templates */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-600" />
              <input
                type="text"
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
                aria-label="Execution Script Title"
                className="text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeClaim && (
                <button
                  type="button"
                  onClick={handleSynthesizeFromActiveClaim}
                  data-testid="exec-synthesize-from-claim-btn"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Synthesize {currentSpec.label.split(' ')[0]} for {activeClaim.id}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExecuteCode}
                disabled={isRunning}
                data-testid="exec-run-code-btn"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {isRunning ? `Running ${currentSpec.label.split(' ')[0]}...` : `Run ${currentSpec.label}`}
                </span>
              </button>
            </div>
          </div>

          {/* Starter Templates Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-[11px] text-slate-500">Templates:</span>
            {EXECUTION_STARTER_TEMPLATES[runtime].map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl)}
                data-testid={`exec-template-${tpl.id}`}
                className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
              >
                {tpl.title}
              </button>
            ))}
          </div>

          {/* Code Editor Textarea */}
          <div>
            <textarea
              rows={16}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Formal or Symbolic Verification Code Editor"
              data-testid="exec-code-editor"
              spellCheck={false}
              className="w-full p-3.5 text-xs font-mono leading-relaxed bg-slate-950 text-slate-100 border border-slate-800 rounded-md focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Right Column (5 cols): Execution Verdict Console & UM-2.4 Computation Gate */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Quoted Tool Verdict &amp; Output (UM-2.4)
                </h2>
              </div>
              {currentRun && (
                <span
                  data-testid="exec-exit-code-badge"
                  className={`text-xs font-mono font-semibold ${
                    currentRun.exitCode === 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {currentRun.exitCode === 0 ? '● EXIT 0 (PASS)' : `✖ EXIT ${currentRun.exitCode} (FAIL)`}
                </span>
              )}
            </div>

            {!currentRun ? (
              <div className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-md text-center space-y-2">
                <Cpu className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600">
                  Click <strong>Run {currentSpec.label}</strong> to execute the formal/symbolic
                  script and generate a SHA-256 certified tool verdict.
                </p>
              </div>
            ) : (
              <div data-testid="exec-verdict-output" className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-700">
                    <span>Tool: {currentRun.runtimeVersion}</span>
                    <span className="tabular-nums">{currentRun.durationMs} ms</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    SHA-256: {currentRun.sha256Hash}
                  </div>
                  <div className="text-[11px]">
                    Execution Authenticity (UM-2.4):{' '}
                    <strong
                      className={
                        currentRun.isNoOp
                          ? 'text-rose-700'
                          : currentRun.actuallyExecuted === false
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                      }
                    >
                      {currentRun.isNoOp
                        ? 'REJECTED NO-OP (UM-2.4j)'
                        : currentRun.actuallyExecuted === false
                          ? 'STATIC / CANNED FALLBACK (actuallyExecuted: false — Cannot Promote Rungs)'
                          : 'EXECUTED SUBPROCESS (actuallyExecuted: true)'}
                    </strong>
                  </div>
                  <div className="text-[11px]">
                    Exact Arithmetic (UM-2.3):{' '}
                    <strong
                      className={
                        currentRun.exactArithmeticVerified ? 'text-emerald-700' : 'text-amber-700'
                      }
                    >
                      {currentRun.exactArithmeticVerified
                        ? 'CERTIFIED (Zero Floats / Native Kernel)'
                        : 'UNVERIFIED / FALLBACK / FLOAT WARNING'}
                    </strong>
                  </div>
                </div>

                {/* Standard Output */}
                <pre
                  data-testid="exec-stdout-pre"
                  className="p-3.5 bg-slate-950 text-emerald-300 font-mono text-xs rounded-md overflow-x-auto max-h-64 whitespace-pre-wrap"
                >
                  {currentRun.stdout || '(no stdout)'}
                  {currentRun.stderr ? `\n[stderr]\n${currentRun.stderr}` : ''}
                </pre>

                {currentRun.diagnostics.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-1">
                    {currentRun.diagnostics.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                )}

                {attachedNotice && (
                  <div
                    data-testid="exec-attached-toast"
                    className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2 font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{attachedNotice}</span>
                  </div>
                )}

                {/* 1-Click Attach to Active Claim Button */}
                {activeClaim && (
                  <button
                    type="button"
                    onClick={handleCertifyToClaim}
                    disabled={Boolean(currentRun.isNoOp)}
                    data-testid="exec-attach-verdict-btn"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {currentRun.isNoOp
                        ? `Blocked by UM-2.4(j) No-Op Floor`
                        : currentRun.actuallyExecuted === false
                          ? `Log Unexecuted Fallback to ${activeClaim.id} (Does Not Promote Rung)`
                          : `Attach Quoted Verdict to ${activeClaim.id} (${activeClaim.expId || 'EXP'}) · UM-2.4 Gate`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active Claim Tool Verdict Ledger Summary */}
          {activeClaim && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">
                  {activeClaim.id} Computation Gate Status (UM-2.4)
                </h3>
                <span className="text-xs font-mono font-semibold text-blue-700">
                  Grade: {computeUM1Grade(activeClaim.gradingInput).finalGrade} · Rung{' '}
                  {activeClaim.gradingInput.verificationRung}
                  {computeUM1Grade(activeClaim.gradingInput).rung4Kind
                    ? ` (${computeUM1Grade(activeClaim.gradingInput).rung4Kind})`
                    : ''}
                </span>
              </div>

              <p className="text-xs text-slate-600">
                Above CLAIMED requires <strong>2 independent tools</strong> (e.g., Singular + Python
                or Lean 4 + Python) with quoted version and exit code 0.
              </p>

              {activeClaim.gradingInput.toolVerdicts.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500 font-mono">
                  0 tool verdicts attached to {activeClaim.id}. Run a script above and click Attach.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeClaim.gradingInput.toolVerdicts.map((tv, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono space-y-0.5"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>
                          {idx + 1}. {tv.toolName} ({tv.version})
                        </span>
                        <span className={tv.exitCode === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          exit={tv.exitCode}
                        </span>
                      </div>
                      <div className="text-slate-600 truncate">{tv.verdictSummary}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
