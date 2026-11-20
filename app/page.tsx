'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  applyRetractionAndDemote,
  applyManualRungAndAuditUpdate,
  evaluateToolVerdictsUM24,
  findTransitiveDependents,
  isFormalKernelTool,
  restoreClaimWithExecutedVerdict,
  validateTierTransition,
  buildAndAuditExternalVerification,
  type ClaimExperimentRecord,
  type WithdrawalEntry,
  type PreflightAuditLogEntry,
  type ExternalVerificationLogEntry,
  type ProblemLifecycleState,
  type ClaimGradingInput,
  type PreflightChecklist,
  type TierType,
  type VerificationRung,
  type RungStageAudit,
  type PremiseDependencyItem,
  type ToolVerdictQuote,
} from '@/lib/um1-engine';
import {
  buildCorpusSynthesisAndDiscoveries,
  type CorpusSynthesisReport,
  type CrossDomainPatternBridge,
  type ExecutionRunRecord,
  type ExecutionRuntime,
} from '@/lib/frontier-discovery';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onAuthStateChanged,
  signInWithGoogleResearcher,
  signOutResearcher,
  testFirestoreConnection,
  handleFirestoreError,
  OperationType,
  type User,
} from '@/lib/firebase';
import CoScientistHubView, {
  type CoScientistAgentRole,
  type CoScientistChatMessage,
  type CoScientistModelId,
} from '@/components/CoScientistHubView';
import CorpusDiscoveryView from '@/components/CorpusDiscoveryView';
import ExecutionLabView from '@/components/ExecutionLabView';
import EpistemicMachineView from '@/components/EpistemicMachineView';
import HypothesisArenaView from '@/components/HypothesisArenaView';
import {
  arenaHypothesisToUM1Claim,
  type ArenaHypothesis,
  type ArenaTournamentState,
} from '@/lib/hypothesis-arena';
import {
  buildEpistemicMachineReport,
  lakatosianRowToUM1Claim,
  type LakatosianLedgerRow,
} from '@/lib/epistemic-machine';
import ClaimRegistryView from '@/components/ClaimRegistryView';
import VerificationLadderView from '@/components/VerificationLadderView';
import DependencyLedgerView from '@/components/DependencyLedgerView';
import GradingPreflightView from '@/components/GradingPreflightView';
import WithdrawalLedgerView from '@/components/WithdrawalLedgerView';
import HandoffDepositionView from '@/components/HandoffDepositionView';
import {
  type ConnectedSourceRecord,
  type AutoFillExtractionPayload,
} from '@/components/SourceIngestionPanel';
import { CloudCheck, LogIn, LogOut } from 'lucide-react';

type ActiveWorkspaceTab =
  | 'coscientist'
  | 'arena'
  | 'sieve'
  | 'corpus'
  | 'execution'
  | 'registry'
  | 'ladder'
  | 'dependencies'
  | 'grading'
  | 'withdrawals'
  | 'handoff';

export default function UM1WorkbenchPage() {
  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('coscientist');
  const [openModalOnRegistry, setOpenModalOnRegistry] = useState<boolean>(false);

  // Clean initial state — zero unrequested clutter
  const [claims, setClaims] = useState<ClaimExperimentRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalEntry[]>([]);
  const [preflightLogs, setPreflightLogs] = useState<PreflightAuditLogEntry[]>([]);
  const [externalLogs, setExternalLogs] = useState<ExternalVerificationLogEntry[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>('');

  // Connected Sources, Synthesis & Execution Lab state
  const [connectedSources, setConnectedSources] = useState<ConnectedSourceRecord[]>([]);
  const [synthesisReport, setSynthesisReport] = useState<CorpusSynthesisReport | null>(null);
  const [executionRuns, setExecutionRuns] = useState<ExecutionRunRecord[]>([]);
  const [execLabRuntime, setExecLabRuntime] = useState<ExecutionRuntime>('lean4');
  const [execLabCode, setExecLabCode] = useState<string | undefined>(undefined);
  const [execLabTitle, setExecLabTitle] = useState<string | undefined>(undefined);

  const [prefillExtraction, setPrefillExtraction] = useState<AutoFillExtractionPayload | null>(null);
  const [autoFilledSearchQuery, setAutoFilledSearchQuery] = useState<string>('');
  const [autoFilledProgrammeSlug, setAutoFilledProgrammeSlug] = useState<string>('');
  const [autoFilledManuscriptExcerpt, setAutoFilledManuscriptExcerpt] = useState<string>('');

  // Co-Scientist & Hypothesis Arena state
  const [researchGoal, setResearchGoal] = useState<string>('');
  const [arenaState, setArenaState] = useState<ArenaTournamentState | null>(null);
  const [chatMessages, setChatMessages] = useState<CoScientistChatMessage[]>([]);
  const [activeAgentRole, setActiveAgentRole] = useState<CoScientistAgentRole>('Generation');
  const [activeModel, setActiveModel] = useState<CoScientistModelId>('gemini-4-hydrogen');

  // Firebase Auth & Firestore Sync state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authErrorBanner, setAuthErrorBanner] = useState<string | null>(null);
  const [restoreStatusBanner, setRestoreStatusBanner] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const hydratedUidRef = useRef<string | null>(null);

  useEffect(() => {
    testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (!user) {
        hydratedUidRef.current = null;
        return;
      }

      const wsPath = `workspaces/${user.uid}`;
      const chatPath = `chatThreads/${user.uid}`;
      try {
        const [wsSnap, chatSnap] = await Promise.all([
          getDoc(doc(db, 'workspaces', user.uid)),
          getDoc(doc(db, 'chatThreads', user.uid)),
        ]);

        if (wsSnap.exists()) {
          const data = wsSnap.data();
          if (typeof data.researchGoal === 'string') {
            setResearchGoal(data.researchGoal);
          }
          if (typeof data.payloadJson === 'string') {
            try {
              const parsed = JSON.parse(data.payloadJson);
              if (Array.isArray(parsed.claims)) {
                setClaims(parsed.claims);
                if (parsed.claims[0]?.id) {
                  setSelectedClaimId(parsed.claims[0].id);
                }
              }
              if (Array.isArray(parsed.withdrawals)) {
                setWithdrawals(parsed.withdrawals);
              }
              if (Array.isArray(parsed.preflightLogs)) {
                setPreflightLogs(parsed.preflightLogs);
              }
              if (Array.isArray(parsed.externalLogs)) {
                setExternalLogs(parsed.externalLogs);
              }
              if (Array.isArray(parsed.connectedSources)) {
                setConnectedSources(parsed.connectedSources);
              }
              if (Array.isArray(parsed.executionRuns)) {
                setExecutionRuns(parsed.executionRuns);
              }
              if (parsed.synthesisReport) {
                setSynthesisReport(parsed.synthesisReport);
              }
              if (parsed.arenaState) {
                setArenaState(parsed.arenaState);
              }
            } catch {
              // Ignore malformed JSON
            }
          }
        }

        if (chatSnap.exists()) {
          const cData = chatSnap.data();
          if (typeof cData.messagesJson === 'string') {
            try {
              const parsedMsgs = JSON.parse(cData.messagesJson);
              if (Array.isArray(parsedMsgs)) {
                setChatMessages(parsedMsgs);
              }
            } catch {
              // Ignore malformed JSON
            }
          }
        }

        hydratedUidRef.current = user.uid;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, wsPath || chatPath);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !currentUser || hydratedUidRef.current !== currentUser.uid) return;
    if (!currentUser.emailVerified || !currentUser.email) return;

    const timer = setTimeout(async () => {
      const wsPath = `workspaces/${currentUser.uid}`;
      try {
        const payloadJson = JSON.stringify({
          claims,
          withdrawals,
          preflightLogs,
          externalLogs,
          connectedSources,
          executionRuns: executionRuns.slice(0, 20),
          synthesisReport,
          arenaState,
        });
        await setDoc(doc(db, 'workspaces', currentUser.uid), {
          ownerId: currentUser.uid,
          ownerEmail: currentUser.email,
          researchGoal: (researchGoal || 'General UM-1 Research').slice(0, 1900),
          payloadJson,
          claimCount: claims.length,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, wsPath);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    authReady,
    currentUser,
    claims,
    withdrawals,
    preflightLogs,
    externalLogs,
    connectedSources,
    executionRuns,
    synthesisReport,
    arenaState,
    researchGoal,
  ]);

  useEffect(() => {
    if (!authReady || !currentUser || hydratedUidRef.current !== currentUser.uid) return;
    if (!currentUser.emailVerified) return;

    const timer = setTimeout(async () => {
      const chatPath = `chatThreads/${currentUser.uid}`;
      try {
        const messagesJson = JSON.stringify(chatMessages.slice(-60));
        await setDoc(doc(db, 'chatThreads', currentUser.uid), {
          ownerId: currentUser.uid,
          activeAgentRole,
          activeModel,
          messagesJson,
          messageCount: chatMessages.length,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, chatPath);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [authReady, currentUser, chatMessages, activeAgentRole, activeModel]);

  const handleAuthAction = async () => {
    setAuthErrorBanner(null);
    if (currentUser) {
      await signOutResearcher();
      return;
    }
    try {
      await signInWithGoogleResearcher();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in popup closed or blocked.';
      setAuthErrorBanner(msg);
    }
  };

  const handleRequestNewClaim = () => {
    setOpenModalOnRegistry(true);
    setActiveTab('registry');
  };

  const handleAddClaim = (newClaim: ClaimExperimentRecord) => {
    setClaims((prev) => [newClaim, ...prev]);
    setSelectedClaimId(newClaim.id);
    setOpenModalOnRegistry(false);
  };

  const handleRegisterArenaHypothesisAsClaim = (
    hypothesis: ArenaHypothesis,
    goal: string
  ): string => {
    const newClaim = arenaHypothesisToUM1Claim(hypothesis, goal, claims.length);
    setClaims((prev) => [newClaim, ...prev]);
    setSelectedClaimId(newClaim.id);
    return newClaim.id;
  };

  const handleSourceIngested = (
    record: ConnectedSourceRecord,
    mode: 'auto-register-all' | 'prefill-form-only'
  ) => {
    const nextSources = [record, ...connectedSources];
    setConnectedSources(nextSources);

    const ext = record.extraction;
    if (ext.researchGoal) {
      setResearchGoal(ext.researchGoal);
    }
    if (ext.suggestedSearchQuery) {
      setAutoFilledSearchQuery(ext.suggestedSearchQuery);
    }
    if (ext.programmeSlug) {
      setAutoFilledProgrammeSlug(ext.programmeSlug);
    }
    if (ext.manuscriptExcerpt) {
      setAutoFilledManuscriptExcerpt(ext.manuscriptExcerpt);
    }

    // Automatically refresh cross-domain corpus synthesis whenever a source is ingested
    const report = buildCorpusSynthesisAndDiscoveries(
      nextSources.map((s) => ({
        id: s.id,
        sourceType: s.sourceType,
        identifier: s.identifier,
        title: s.title,
        domain: s.extraction.claimDraft.domain,
        excerpt: s.extraction.manuscriptExcerpt,
      })),
      ext.researchGoal || researchGoal
    );
    setSynthesisReport(report);

    if (mode === 'prefill-form-only') {
      setPrefillExtraction(ext);
      setOpenModalOnRegistry(true);
      setActiveTab('registry');
      return;
    }

    const claimId = `CLM-${101 + claims.length}`;
    const expId = `EXP-${String(1 + claims.length).padStart(3, '0')}`;
    const cd = ext.claimDraft;

    const extractedPremises: PremiseDependencyItem[] = ext.premiseItems.map((p, idx) => ({
      id: `DEP-${claimId}-${idx + 1}`,
      kind: p.kind,
      statement: p.statement,
      sourceCitation: p.sourceCitation,
      hasSupportingVerdict: p.hasSupportingVerdict,
      independentlyRederived: p.independentlyRederived,
      isLeafTranscription: p.isLeafTranscription,
    }));

    const endsInUnrederived = extractedPremises.some(
      (p) => p.isLeafTranscription && !p.independentlyRederived
    );

    const newClaim: ClaimExperimentRecord = {
      id: claimId,
      expId,
      title: cd.title,
      domain: cd.domain || 'General Research',
      lifecycleState: 'scoped',
      target: cd.target,
      source: cd.source,
      uncertainty: cd.uncertainty || 'Declared in source specification',
      priorLiterature: cd.priorLiterature || cd.source,
      dataSplits: cd.dataSplits || 'Declared in method specification',
      replicationPlan: cd.replicationPlan || cd.method,
      independenceBoundary: cd.independenceBoundary || `Independence level ${cd.independence}`,
      noveltyBudget: cd.noveltyBudget,
      predictionClass: cd.predictionClass,
      question: cd.question,
      motivation: cd.motivation,
      falsifiablePrediction: cd.falsifiablePrediction,
      method: cd.method,
      successFailureCriteria: cd.successFailureCriteria,
      oneSidednessPass: cd.oneSidednessPass,
      oneSidednessFail: cd.oneSidednessFail,
      premiseDependencies: [],
      dependencyLedgerItems: extractedPremises,
      computeBudget: cd.computeBudget,
      killCriterion: cd.killCriterion,
      computeBudgetAndKill: `${cd.computeBudget}; ${cd.killCriterion}`,
      invariantFirstNote: cd.invariantFirstNote,
      lensesDeclared: ['L0-spine', 'L3-invariant', 'L6-dictionary', 'L9-adversarial'],
      verdictOutcome: 'inconclusive',
      howCouldThisBeWrong: cd.howCouldThisBeWrong,
      rungAudits: [0, 1, 2, 3, 4, 5].map((r) => ({
        rung: r as VerificationRung,
        completed: r <= cd.verificationRung,
        howCouldThisBeWrongAtStage:
          r === 0
            ? ext.rungStageNotes.rung0Statement || cd.howCouldThisBeWrong
            : r === 1
              ? ext.rungStageNotes.rung1Source || ''
              : r === 2
                ? ext.rungStageNotes.rung2Machine || ''
                : '',
        evidenceArtifactSummary:
          r === 0
            ? `Registered from ${record.title} (${record.identifier})`
            : r === 1
              ? `Source mined via UM-1 Ingestion Agent (${record.sourceType})`
              : '',
        updatedAt: new Date().toISOString(),
      })),
      tierHistory: [
        {
          id: `TLOG-${claimId}-INIT`,
          claimId,
          previousTier: cd.tier,
          newTier: cd.tier,
          direction: 'raised',
          justification: `Initial tier registration at ${cd.tier} from ingested source ${record.title} (UM-1.1).`,
          timestamp: new Date().toISOString(),
        },
      ],
      sha256Manifest: `sha256:ingested-${record.id.toLowerCase()}`,
      preflight: {
        P1_sourceComplete: true,
        P2_smokeTest: false,
        P3_premiseDependenciesChecked: !endsInUnrederived,
        P4_oneSidednessStated: true,
        P5_invariantFirstChecked: true,
        P6_computeBudgetDeclared: true,
        P7_spendCapNamed: true,
        spendCapUsd: cd.spendCapUsd || 25,
      },
      gradingInput: {
        track: cd.track,
        tier: cd.tier,
        recordLabel: cd.recordLabel,
        independence: cd.independence,
        hasDiscriminatingComparison: false,
        postulationKind: 'constraint-led',
        postulationValidatedByNewIndependentTests: false,
        unreportedParameterSelection: false,
        ledgerEndsInUnrederivedTranscription: endsInUnrederived,
        overrideStatus: 'NONE',
        supportInRecord: 'C',
        verificationRung: cd.verificationRung,
        independentRoutesCount: 1,
        kernelCheckedOrClosedLedger: false,
        exactArithmeticCertified: false,
        toolVerdicts: [],
        externalVerification: {
          executed: false,
          verifierAgent: 'None',
          auditedLocallyClaimByClaim: false,
          supportedGrade: 'C',
          auditNotes: 'Not yet dispatched to external verification agent.',
        },
      },
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setClaims((prev) => [newClaim, ...prev]);
    setSelectedClaimId(newClaim.id);
    setPrefillExtraction(ext);
  };

  const handleLoadPresetCorpus = () => {
    const goal =
      'Establish cross-domain structural isomorphisms between Jacobian singular ideals (Singular), 2-Selmer parity involutions (Lean 4), and exact Hasse-Weil rational fiber invariants (Python 3).';
    setResearchGoal(goal);
    setAutoFilledSearchQuery('2-Selmer rank parity Jacobian discriminant ideal Milnor multiplicity');
    setAutoFilledProgrammeSlug('frontier-algebraic-spectral-bridge');

    const presetSources: ConnectedSourceRecord[] = [
      {
        id: 'SRC-PRESET-1',
        sourceType: 'arxiv',
        identifier: 'arXiv:2502.18864',
        title: 'Exact Modular Verification of Selmer Rank Parity for Mordell-Weil Fibre Families',
        url: 'https://arxiv.org/abs/2502.18864',
        ingestedAt: new Date().toISOString(),
        extraction: {
          sourceSummary: {
            sourceType: 'arxiv',
            title: 'Exact Modular Verification of Selmer Rank Parity for Mordell-Weil Fibre Families',
            citation: 'arXiv:2502.18864',
            detectedDomain: 'Arithmetic Geometry & Number Theory',
          },
          researchGoal: goal,
          programmeSlug: 'frontier-algebraic-spectral-bridge',
          suggestedSearchQuery: '2-Selmer rank parity Mordell-Weil fibre families',
          manuscriptExcerpt:
            'Proves over Q that the 2-Selmer parity character matches the global root number across admissible Weierstrass cubic fibres.',
          claimDraft: {
            title: 'Weierstrass Cubic Discriminant & Mod-2 Selmer Parity Identity',
            domain: 'Arithmetic Geometry & Commutative Algebra',
            track: 'F',
            tier: 'Full',
            recordLabel: '[D]',
            independence: 'I2',
            independenceBoundary: 'Independent verification across Lean 4, Singular 4.4, and Python 3 Exact Q',
            noveltyBudget: 'independently_motivated',
            predictionClass: 'prediction',
            verificationRung: 2,
            target:
              'Vanishing of Sylvester resultant R_x(f, ∂_x f) = 0 at nodal cubic y^2 = x^3 - 3x + 2 and exact parity conservation (a + 2b) mod 2 = a mod 2.',
            source: 'arXiv:2502.18864 + Singular/Mathlib4 Formal Corpus',
            uncertainty: 'Exact symbolic / integer arithmetic over Q and Z (0 floats)',
            priorLiterature: 'arXiv:2502.18864; Dokchitser-Dokchitser Parity Theorem',
            dataSplits: 'Exhaustive prime conductor family 5 <= p <= 37 and nodal specialization',
            replicationPlan:
              'Verify Gröbner basis std(J) in Singular, formal parity involution in Lean 4, and resultant/Hasse bounds in Python 3.',
            question:
              'Does the Jacobian singular ideal J = <f, ∂_x f, ∂_y f> over Q isolate the exact bifurcation fiber while preserving mod-2 parity?',
            motivation:
              'Unifies commutative algebra discriminant ideals with formal dependent type theory and exact rational arithmetic.',
            falsifiablePrediction:
              'Singular std(J) yields [y, x-1] with dim=0, vdim=1; Python resultant R(f, f_x) = 0; Lean 4 kernel certifies parity involution with 0 sorry.',
            method:
              'Execute Singular Buchberger Gröbner basis, Python 3 exact rational Sylvester resultant, and Lean 4 omega/ring proof.',
            successFailureCriteria:
              'PASS if all three tools return exit code 0 with exact arithmetic; FAIL on any nonzero resultant or unsolved Lean 4 goal.',
            oneSidednessPass:
              'Establishes Rung 4/3 formal + symbolic survival across two independent algebraic engines.',
            oneSidednessFail:
              'Refutes nodal localization or exposes an un-re-derived transcription error.',
            computeBudget: '1 CPU hour max (headless deterministic runs < 5s)',
            killCriterion: 'Abort immediately if std(J) is the unit ideal <1> or Lean 4 reports sorry.',
            invariantFirstNote:
              'Check single cheap invariant first: univariate discriminant resultant R_x(x^3 - 3x + 2, 3x^2 - 3) = 0 over Q.',
            spendCapUsd: 25,
            howCouldThisBeWrong:
              'Characteristic 2 or 3 reduction could collapse the Weierstrass partial derivatives; verified over char 0 (Q) and primes p >= 5.',
          },
          premiseItems: [
            {
              kind: 'primary_transcription',
              statement:
                'Weierstrass cubic specialization f(x,y) = y^2 - x^3 + 3x - 2 has Jacobian ideal J = <f, -3x^2+3, 2y> in Q[x,y].',
              sourceCitation: 'arXiv:2502.18864 §2.1',
              independentlyRederived: true,
              isLeafTranscription: true,
              hasSupportingVerdict: true,
            },
            {
              kind: 'assumption',
              statement:
                'Base field characteristic is 0 (or prime p >= 5) so 2 and 3 are invertible in the coordinate ring.',
              sourceCitation: 'Singular ring R = 0, (x,y), dp',
              independentlyRederived: true,
              isLeafTranscription: false,
              hasSupportingVerdict: true,
            },
          ],
          rungStageNotes: {
            rung0Statement: 'Statement registered with explicit one-sidedness and invariant-first check.',
            rung1Source: 'Primary equations transcribed and independently re-derived in Q[x,y].',
            rung2Machine: 'Ready for Singular + Python + Lean 4 multi-tool execution.',
          },
        },
      },
      {
        id: 'SRC-PRESET-2',
        sourceType: 'github',
        identifier: 'Singular/Singular-Ideals',
        title: 'Koszul Syzygy Modules & Gröbner Bases for Polynomial Conservation Laws',
        url: 'https://github.com/Singular/Singular',
        ingestedAt: new Date().toISOString(),
        extraction: {
          sourceSummary: {
            sourceType: 'github',
            title: 'Koszul Syzygy Modules & Gröbner Bases for Polynomial Conservation Laws',
            citation: 'github:Singular/Singular-Ideals',
            detectedDomain: 'Commutative Algebra & Symbolic Computation',
          },
          researchGoal: goal,
          programmeSlug: 'frontier-algebraic-spectral-bridge',
          suggestedSearchQuery: 'Singular Groebner basis Koszul syzygy module Milnor number',
          manuscriptExcerpt:
            'Computes reduced Gröbner bases std(I), Krull dimension dim(G), and first syzygy modules syz(I) over exact rational rings.',
          claimDraft: {
            title: 'Koszul Syzygy Module & Quotient Multiplicity Certification',
            domain: 'Commutative Algebra (Singular)',
            track: 'F',
            tier: 'Standard',
            recordLabel: '[D]',
            independence: 'I2',
            independenceBoundary: 'Singular 4.4 + Python Exact Q',
            noveltyBudget: 'independently_motivated',
            predictionClass: 'prediction',
            verificationRung: 2,
            target: 'Gröbner basis and syzygy generators of cyclic quadric ideal I = <x^2-yz, y^2-xz, z^2-xy>',
            source: 'github:Singular/Singular-Ideals',
            uncertainty: 'Exact rational coefficient arithmetic over Q',
            priorLiterature: 'Cox, Little, OShea — Ideals, Varieties, and Algorithms',
            dataSplits: 'Degree reverse lexicographic ordering (dp) over Q[x,y,z]',
            replicationPlan: 'Run std(I), dim(std(I)), deg(std(I)), and syz(I) in Singular Lab.',
            question: 'Does the cyclic quadric ideal define a 1-dimensional degree-3 projective curve with 2 syzygy generators?',
            motivation: 'Bridges algebraic syzygies with gauge redundancy identities.',
            falsifiablePrediction: 'dim(std(I)) = 1 and deg(std(I)) = 3 over Q.',
            method: 'Buchberger algorithm in Singular 4.4.',
            successFailureCriteria: 'PASS if dim=1, deg=3; FAIL otherwise.',
            oneSidednessPass: 'Certifies exact syzygy structure.',
            oneSidednessFail: 'Demonstrates unexpected primary decomposition component.',
            computeBudget: '0.5 CPU hours',
            killCriterion: 'Abort if degree exceeds 12.',
            invariantFirstNote: 'Check S_3 permutation symmetry of generators before Buchberger reduction.',
            spendCapUsd: 15,
            howCouldThisBeWrong: 'Monomial ordering sensitivity if lp is used instead of dp.',
          },
          premiseItems: [],
          rungStageNotes: {
            rung0Statement: 'Registered cyclic quadric syzygy claim.',
            rung1Source: 'Generators verified under S_3 symmetry.',
            rung2Machine: 'Singular script ready.',
          },
        },
      },
      {
        id: 'SRC-PRESET-3',
        sourceType: 'text',
        identifier: 'mathlib4_spectral_parity.lean',
        title: 'Lean 4 Formal Verification of Parity Involutions & Non-Negative Quadratic Edge Forms',
        ingestedAt: new Date().toISOString(),
        extraction: {
          sourceSummary: {
            sourceType: 'text',
            title: 'Lean 4 Formal Verification of Parity Involutions & Non-Negative Quadratic Edge Forms',
            citation: 'mathlib4_spectral_parity.lean',
            detectedDomain: 'Formal Type Theory & Spectral Graph Theory (Lean 4)',
          },
          researchGoal: goal,
          programmeSlug: 'frontier-algebraic-spectral-bridge',
          suggestedSearchQuery: 'Lean 4 Mathlib omega ring tactic formal verification',
          manuscriptExcerpt:
            'Formalizes mod-2 parity conservation and discrete Laplacian edge energy non-negativity in Lean 4 with zero sorry axioms.',
          claimDraft: {
            title: 'Lean 4 Kernel Proof of Mod-2 Parity Involution & Edge Energy Identity',
            domain: 'Formal Verification (Lean 4)',
            track: 'F',
            tier: 'Full',
            recordLabel: '[MV]',
            independence: 'I3',
            independenceBoundary: 'Lean 4 Kernel Typechecker + Python Exact Test',
            noveltyBudget: 'independently_motivated',
            predictionClass: 'prediction',
            verificationRung: 4,
            target: 'Formal theorems selmer_parity_involution and edge_energy_nonneg in Lean 4',
            source: 'mathlib4_spectral_parity.lean',
            uncertainty: 'Kernel-verified deductive proof (0 sorry, 0 admit)',
            priorLiterature: 'Mathlib4 Data.ZMod.Basic & Tactic.Omega',
            dataSplits: 'Universal quantification over Nat and Int',
            replicationPlan: 'Run in Lean 4 Execution Lab and verify exit code 0.',
            question: 'Are the parity involution and quadratic expansion theorems kernel-verified without sorry?',
            motivation: 'Provides Rung 4 formal kernel anchor for the cross-domain bridge.',
            falsifiablePrediction: 'Lean 4 kernel accepts both theorems with 0 unsolved goals.',
            method: 'Lean 4 `omega` and `ring` decision procedures.',
            successFailureCriteria: 'PASS on exit code 0 with 0 sorry; FAIL if any goal remains.',
            oneSidednessPass: 'Establishes Rung 4 Kernel certification.',
            oneSidednessFail: 'Identifies an unprovable arithmetic step.',
            computeBudget: '0.1 CPU hours',
            killCriterion: 'Abort on tactic timeout.',
            invariantFirstNote: 'Check mod-2 reduction on boundary case a=0, b=1.',
            spendCapUsd: 10,
            howCouldThisBeWrong: 'Natural number subtraction truncation if Nat is used instead of Int for signed differences.',
          },
          premiseItems: [],
          rungStageNotes: {
            rung0Statement: 'Formal theorem statement typed.',
            rung1Source: 'Mathlib imports verified.',
            rung2Machine: 'Lean 4 kernel check ready.',
          },
        },
      },
    ];

    setConnectedSources(presetSources);
    const report = buildCorpusSynthesisAndDiscoveries(
      presetSources.map((s) => ({
        id: s.id,
        sourceType: s.sourceType,
        identifier: s.identifier,
        title: s.title,
        domain: s.extraction.claimDraft.domain,
        excerpt: s.extraction.manuscriptExcerpt,
      })),
      goal
    );
    setSynthesisReport(report);

    // Also register the primary claim if no claims exist yet
    if (claims.length === 0) {
      const cd = presetSources[0].extraction.claimDraft;
      const newClaim: ClaimExperimentRecord = {
        id: 'CLM-101',
        expId: 'EXP-001',
        title: cd.title,
        domain: cd.domain,
        lifecycleState: 'exploring',
        target: cd.target,
        source: cd.source,
        uncertainty: cd.uncertainty,
        priorLiterature: cd.priorLiterature,
        dataSplits: cd.dataSplits,
        replicationPlan: cd.replicationPlan,
        independenceBoundary: cd.independenceBoundary,
        noveltyBudget: cd.noveltyBudget,
        predictionClass: cd.predictionClass,
        question: cd.question,
        motivation: cd.motivation,
        falsifiablePrediction: cd.falsifiablePrediction,
        method: cd.method,
        successFailureCriteria: cd.successFailureCriteria,
        oneSidednessPass: cd.oneSidednessPass,
        oneSidednessFail: cd.oneSidednessFail,
        premiseDependencies: [],
        dependencyLedgerItems: presetSources[0].extraction.premiseItems.map((p, idx) => ({
          id: `DEP-CLM-101-${idx + 1}`,
          kind: p.kind,
          statement: p.statement,
          sourceCitation: p.sourceCitation,
          hasSupportingVerdict: p.hasSupportingVerdict,
          independentlyRederived: p.independentlyRederived,
          isLeafTranscription: p.isLeafTranscription,
        })),
        computeBudget: cd.computeBudget,
        killCriterion: cd.killCriterion,
        computeBudgetAndKill: `${cd.computeBudget}; ${cd.killCriterion}`,
        invariantFirstNote: cd.invariantFirstNote,
        lensesDeclared: ['L0-spine', 'L3-invariant', 'L6-dictionary', 'L9-adversarial'],
        verdictOutcome: 'confirmed',
        howCouldThisBeWrong: cd.howCouldThisBeWrong,
        rungAudits: [0, 1, 2, 3, 4, 5].map((r) => ({
          rung: r as VerificationRung,
          completed: r <= 2,
          howCouldThisBeWrongAtStage:
            r === 0
              ? presetSources[0].extraction.rungStageNotes.rung0Statement
              : r === 1
                ? presetSources[0].extraction.rungStageNotes.rung1Source
                : r === 2
                  ? presetSources[0].extraction.rungStageNotes.rung2Machine
                  : '',
          evidenceArtifactSummary: r <= 2 ? `Verified via 3-Domain Study Corpus` : '',
          updatedAt: new Date().toISOString(),
        })),
        tierHistory: [
          {
            id: 'TLOG-CLM-101-INIT',
            claimId: 'CLM-101',
            previousTier: 'Full',
            newTier: 'Full',
            direction: 'raised',
            justification: 'Initial registration from 3-Domain Frontier Study Corpus.',
            timestamp: new Date().toISOString(),
          },
        ],
        sha256Manifest: 'sha256:preset-frontier-corpus-manifest',
        preflight: {
          P1_sourceComplete: true,
          P2_smokeTest: true,
          P3_premiseDependenciesChecked: true,
          P4_oneSidednessStated: true,
          P5_invariantFirstChecked: true,
          P6_computeBudgetDeclared: true,
          P7_spendCapNamed: true,
          spendCapUsd: 25,
        },
        gradingInput: {
          track: 'F',
          tier: 'Full',
          recordLabel: '[D]',
          independence: 'I2',
          hasDiscriminatingComparison: true,
          postulationKind: 'constraint-led',
          postulationValidatedByNewIndependentTests: true,
          unreportedParameterSelection: false,
          ledgerEndsInUnrederivedTranscription: false,
          overrideStatus: 'NONE',
          supportInRecord: 'B',
          verificationRung: 2,
          independentRoutesCount: 2,
          kernelCheckedOrClosedLedger: false,
          exactArithmeticCertified: true,
          toolVerdicts: [],
          externalVerification: {
            executed: false,
            verifierAgent: 'None',
            auditedLocallyClaimByClaim: false,
            supportedGrade: 'B',
            auditNotes: 'Ready for multi-tool execution in Lean 4, Singular, and Python.',
          },
        },
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setClaims([newClaim]);
      setSelectedClaimId('CLM-101');
    }
  };

  const handlePromoteBridgeToClaim = (bridge: CrossDomainPatternBridge) => {
    const claimId = `CLM-${101 + claims.length}`;
    const expId = `EXP-${String(1 + claims.length).padStart(3, '0')}`;
    const newClaim: ClaimExperimentRecord = {
      id: claimId,
      expId,
      title: bridge.title,
      domain: `${bridge.sourceDomain} ↔ ${bridge.targetDomain}`,
      lifecycleState: 'exploring',
      target: bridge.sharedInvariant,
      source: bridge.sourceCorpusIds.join(', ') || 'Cross-Domain Synthesis Corpus',
      uncertainty: 'Exact symbolic / formal kernel verification (0 floats)',
      priorLiterature: bridge.sourceCorpusIds.join(', ') || 'Study Corpus Synthesis',
      dataSplits: 'Cross-domain dictionary verification across Lean 4, Singular, and Python',
      replicationPlan:
        'Execute Lean 4 formal proof, Singular Gröbner/syzygy script, and Python exact Q-arithmetic test.',
      independenceBoundary: 'I3 Cross-Domain Independent Route (Singular + Lean 4 + Python)',
      noveltyBudget: 'independently_motivated',
      predictionClass: 'prediction',
      question: bridge.falsifiableConjecture,
      motivation: bridge.structuralIsomorphism,
      falsifiablePrediction: bridge.oneSidednessPass,
      method: `Apply ${bridge.um1LensApplied} dictionary and verify invariants in Lean 4, Singular, and Python 3.`,
      successFailureCriteria: `PASS: ${bridge.oneSidednessPass} | FAIL: ${bridge.oneSidednessFail}`,
      oneSidednessPass: bridge.oneSidednessPass,
      oneSidednessFail: bridge.oneSidednessFail,
      premiseDependencies: [],
      dependencyLedgerItems: bridge.dictionaryMapping.map((d, idx) => ({
        id: `DEP-${claimId}-${idx + 1}`,
        kind: 'assumption',
        statement: `Dictionary map: ${d.domainAConcept} ↔ ${d.domainBConcept} (preserves ${d.invariantPreserved})`,
        sourceCitation: bridge.sourceCorpusIds[0] || 'Cross-Domain Synthesis',
        hasSupportingVerdict: true,
        independentlyRederived: true,
        isLeafTranscription: false,
      })),
      computeBudget: '1 CPU hour max',
      killCriterion: bridge.oneSidednessFail,
      computeBudgetAndKill: `1 CPU hour max; ${bridge.oneSidednessFail}`,
      invariantFirstNote: bridge.sharedInvariant,
      lensesDeclared: ['L0-spine', 'L3-invariant', 'L6-dictionary'],
      verdictOutcome: 'confirmed',
      howCouldThisBeWrong:
        'Cross-domain dictionary could fail at degenerate boundary parameters; check Singular std(J) and Lean 4 kernel proof.',
      rungAudits: [0, 1, 2, 3, 4, 5].map((r) => ({
        rung: r as VerificationRung,
        completed: r <= 2,
        howCouldThisBeWrongAtStage:
          r === 0 ? `Dictionary domain mismatch: ${bridge.sharedInvariant}` : '',
        evidenceArtifactSummary: r <= 2 ? `Promoted from Cross-Domain Bridge ${bridge.id}` : '',
        updatedAt: new Date().toISOString(),
      })),
      tierHistory: [
        {
          id: `TLOG-${claimId}-INIT`,
          claimId,
          previousTier: 'Full',
          newTier: 'Full',
          direction: 'raised',
          justification: `Promoted from Cross-Domain Pattern Bridge ${bridge.id}.`,
          timestamp: new Date().toISOString(),
        },
      ],
      sha256Manifest: `sha256:bridge-${bridge.id.toLowerCase()}`,
      preflight: {
        P1_sourceComplete: true,
        P2_smokeTest: true,
        P3_premiseDependenciesChecked: true,
        P4_oneSidednessStated: true,
        P5_invariantFirstChecked: true,
        P6_computeBudgetDeclared: true,
        P7_spendCapNamed: true,
        spendCapUsd: 30,
      },
      gradingInput: {
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
        supportInRecord: 'B',
        verificationRung: 2,
        independentRoutesCount: 2,
        kernelCheckedOrClosedLedger: false,
        exactArithmeticCertified: true,
        toolVerdicts: [],
        externalVerification: {
          executed: false,
          verifierAgent: 'None',
          auditedLocallyClaimByClaim: false,
          supportedGrade: 'B',
          auditNotes: 'Promoted from Cross-Domain Discovery Engine.',
        },
      },
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setClaims((prev) => [newClaim, ...prev]);
    setSelectedClaimId(newClaim.id);
  };

  const handleOpenBridgeInExecutionLab = (
    bridge: CrossDomainPatternBridge,
    runtime: ExecutionRuntime
  ) => {
    setExecLabRuntime(runtime);
    setExecLabTitle(`${bridge.title.slice(0, 48)} (${runtime.toUpperCase()})`);
    setExecLabCode(
      runtime === 'lean4'
        ? bridge.lean4Template
        : runtime === 'singular'
          ? bridge.singularTemplate
          : bridge.pythonTemplate
    );
    setActiveTab('execution');
  };

  const handlePromoteLedgerRowToClaim = (row: LakatosianLedgerRow) => {
    const newClaim = lakatosianRowToUM1Claim(row);
    setClaims((prev) => {
      const filtered = prev.filter((c) => c.id !== newClaim.id);
      return [newClaim, ...filtered];
    });
    setSelectedClaimId(newClaim.id);
    setActiveTab('registry');
  };

  const handleOpenSieveScriptInExecutionLab = (
    runtime: ExecutionRuntime,
    code: string,
    title: string
  ) => {
    setExecLabRuntime(runtime);
    setExecLabCode(code);
    setExecLabTitle(title);
    setActiveTab('execution');
  };

  const handleLoadAllIrhAuditClaims = () => {
    const report = buildEpistemicMachineReport(connectedSources);
    const irhClaims = report.lakatosianProblemShiftLedger.map((r) => lakatosianRowToUM1Claim(r));
    setClaims((prev) => {
      const existingIds = new Set(irhClaims.map((c) => c.id));
      const remaining = prev.filter((c) => !existingIds.has(c.id));
      return [...irhClaims, ...remaining];
    });
    if (irhClaims[0]) {
      setSelectedClaimId(irhClaims[0].id);
    }
    setActiveTab('registry');
  };

  const handleAttachToolVerdictToClaim = (
    claimId: string,
    verdict: ToolVerdictQuote,
    _runtime: ExecutionRuntime
  ) => {
    setClaims((prev) =>
      prev.map((c) => {
        if (c.id !== claimId) return c;
        const nextVerdicts = [
          ...c.gradingInput.toolVerdicts.filter((v) => v.toolName !== verdict.toolName),
          verdict,
        ];
        const audit = evaluateToolVerdictsUM24(nextVerdicts);
        const distinctPassingTools = audit.distinctValidTools.length;
        const verdictIsValidExecuted = audit.validTools.some((v) => v === verdict);
        const isKernelToolPass = verdictIsValidExecuted && isFormalKernelTool(verdict);
        const nextHashes =
          verdictIsValidExecuted && verdict.outputHash
            ? Array.from(new Set([...(c.gradingInput.archivedOutputHashes || []), verdict.outputHash]))
            : c.gradingInput.archivedOutputHashes || [];
        const hasExactArithmetic =
          (verdictIsValidExecuted && verdict.exactArithmetic) ||
          c.gradingInput.exactArithmeticCertified;
        const ledgerClosed =
          !c.gradingInput.ledgerEndsInUnrederivedTranscription &&
          !c.gradingInput.hasCitedElsewherePremise &&
          c.preflight.P3_premiseDependenciesChecked &&
          c.dependencyLedgerItems.length > 0 &&
          (c.gradingInput.kernelCheckedOrClosedLedger ||
            c.dependencyLedgerItems.every((item) => item.independentlyRederived));
        const isComputational4DPass =
          verdictIsValidExecuted &&
          !isKernelToolPass &&
          distinctPassingTools >= 2 &&
          hasExactArithmetic &&
          ledgerClosed &&
          nextHashes.length > 0;
        const nextRung = (
          !verdictIsValidExecuted
            ? c.gradingInput.verificationRung
            : isKernelToolPass || isComputational4DPass
              ? Math.max(c.gradingInput.verificationRung, 4)
              : distinctPassingTools >= 2
                ? Math.max(c.gradingInput.verificationRung, 3)
                : Math.max(c.gradingInput.verificationRung, 2)
        ) as VerificationRung;

        return {
          ...c,
          verdictOutcome: verdictIsValidExecuted ? 'confirmed' : c.verdictOutcome,
          preflight: {
            ...c.preflight,
            P2_smokeTest: verdictIsValidExecuted ? true : c.preflight.P2_smokeTest,
          },
          gradingInput: {
            ...c.gradingInput,
            recordLabel:
              isKernelToolPass || isComputational4DPass ? '[MV]' : c.gradingInput.recordLabel,
            toolVerdicts: nextVerdicts,
            independentRoutesCount: Math.max(
              c.gradingInput.independentRoutesCount,
              distinctPassingTools
            ),
            exactArithmeticCertified: hasExactArithmetic,
            kernelCheckedOrClosedLedger:
              isKernelToolPass ||
              isComputational4DPass ||
              c.gradingInput.kernelCheckedOrClosedLedger,
            rung4Kind: isKernelToolPass
              ? '4K'
              : isComputational4DPass
                ? c.gradingInput.rung4Kind || '4D'
                : c.gradingInput.rung4Kind,
            archivedOutputHashes: nextHashes,
            verificationRung: nextRung,
          },
        };
      })
    );
  };

  const handleUpdateClaimRecord = (updated: ClaimExperimentRecord) => {
    setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleUpdateLifecycle = (claimId: string, nextState: ProblemLifecycleState) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === claimId ? { ...c, lifecycleState: nextState } : c))
    );
  };

  const handleChangeTier = (claimId: string, newTier: TierType, justification: string) => {
    setClaims((prev) =>
      prev.map((c) => {
        if (c.id !== claimId) return c;
        const check = validateTierTransition(c.gradingInput.tier, newTier, justification);
        if (!check.valid || check.direction === 'unchanged') return c;
        return {
          ...c,
          gradingInput: {
            ...c.gradingInput,
            tier: newTier,
          },
          tierHistory: [
            {
              id: `TLOG-${claimId}-${c.tierHistory.length + 1}`,
              claimId,
              previousTier: c.gradingInput.tier,
              newTier,
              direction: check.direction,
              justification,
              timestamp: new Date().toISOString(),
            },
            ...c.tierHistory,
          ],
        };
      })
    );
  };

  const handleUpdateRungAndAudit = (
    claimId: string,
    newRung: VerificationRung,
    updatedAudits: RungStageAudit[],
    globalHowWrong: string
  ) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === claimId
          ? applyManualRungAndAuditUpdate(c, newRung, updatedAudits, globalHowWrong)
          : c
      )
    );
  };

  const handleUpdateDependencyLedger = (
    claimId: string,
    updatedItems: PremiseDependencyItem[],
    updatedParentClaimIds: string[],
    p3Checked: boolean
  ) => {
    const endsInUnrederivedLeaf = updatedItems.some(
      (item) => item.isLeafTranscription && !item.independentlyRederived
    );
    const hasCitedElsewhere = updatedItems.some(
      (item) =>
        item.status === 'CITED-ELSEWHERE' ||
        (!item.independentlyRederived && /\bcited[- ]elsewhere\b/i.test(item.sourceCitation))
    );
    const closedByLedger = !endsInUnrederivedLeaf && !hasCitedElsewhere && updatedItems.length > 0 && p3Checked;
    setClaims((prev) =>
      prev.map((c) =>
        c.id === claimId
          ? {
              ...c,
              dependencyLedgerItems: updatedItems,
              premiseDependencies: updatedParentClaimIds,
              preflight: {
                ...c.preflight,
                P3_premiseDependenciesChecked: p3Checked,
              },
              gradingInput: {
                ...c.gradingInput,
                ledgerEndsInUnrederivedTranscription: endsInUnrederivedLeaf,
                hasCitedElsewherePremise: hasCitedElsewhere,
                kernelCheckedOrClosedLedger:
                  c.gradingInput.kernelCheckedOrClosedLedger || closedByLedger,
                rung4Kind:
                  c.gradingInput.rung4Kind || (closedByLedger ? '4D' : undefined),
              },
            }
          : c
      )
    );
  };

  const handleUpdateClaimGradingAndPreflight = (
    claimId: string,
    gradingInput: ClaimGradingInput,
    preflight: PreflightChecklist
  ) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === claimId ? { ...c, gradingInput, preflight } : c))
    );
  };

  const handleLogPreflightRun = (entry: PreflightAuditLogEntry) => {
    setPreflightLogs((prev) => [entry, ...prev]);
  };

  const handleExecuteExternalVerification = (
    claimId: string,
    agent: 'Manus' | 'Gemini 4 (Argon)' | 'Academia Co-Scientist',
    hlreSkillVersion: string,
    spendCapUsd: number,
    userApprovedOutwardDispatch: boolean
  ) => {
    const target = claims.find((c) => c.id === claimId);
    if (!target) return;
    const { logEntry } = buildAndAuditExternalVerification(
      target,
      claims,
      agent,
      hlreSkillVersion,
      spendCapUsd,
      userApprovedOutwardDispatch
    );
    setExternalLogs((prev) => [logEntry, ...prev]);
    setClaims((prev) =>
      prev.map((c) =>
        c.id === claimId
          ? {
              ...c,
              gradingInput: {
                ...c.gradingInput,
                externalVerification: {
                  executed: true,
                  verifierAgent: agent,
                  auditedLocallyClaimByClaim: logEntry.locallyAuditedClaimByClaim,
                  supportedGrade:
                    logEntry.recommendedGrade === 'A' ||
                    logEntry.recommendedGrade === 'B' ||
                    logEntry.recommendedGrade === 'C' ||
                    logEntry.recommendedGrade === 'D' ||
                    logEntry.recommendedGrade === 'F1' ||
                    logEntry.recommendedGrade === 'F2' ||
                    logEntry.recommendedGrade === 'F3'
                      ? logEntry.recommendedGrade
                      : 'C',
                  auditNotes: logEntry.summaryVerdict,
                },
              },
            }
          : c
      )
    );
  };

  const handleToggleLocalAuditCheck = (logId: string, checkId: string) => {
    setExternalLogs((prev) =>
      prev.map((log) => {
        if (log.id !== logId) return log;
        const nextChecks = log.claimChecks.map((chk) =>
          chk.checkId === checkId
            ? { ...chk, localAuditVerified: !chk.localAuditVerified }
            : chk
        );
        const allVerified = nextChecks.every((chk) => chk.localAuditVerified);
        return {
          ...log,
          claimChecks: nextChecks,
          locallyAuditedClaimByClaim: allVerified,
        };
      })
    );
  };

  const handleExecuteRetraction = (
    targetClaimId: string,
    entryData: Omit<
      WithdrawalEntry,
      'id' | 'timestamp' | 'transitiveDependents' | 'demotionApplied'
    >
  ) => {
    const dependents = findTransitiveDependents(targetClaimId, claims);
    const { updatedClaims } = applyRetractionAndDemote(targetClaimId, claims);
    setClaims(updatedClaims);

    const newWithdrawal: WithdrawalEntry = {
      ...entryData,
      id: `WDR-00${withdrawals.length + 1}`,
      timestamp: new Date().toISOString(),
      transitiveDependents: dependents,
      demotionApplied: `${targetClaimId} marked CONTRADICTED; ${
        dependents.length > 0
          ? `dependents (${dependents.join(', ')}) mechanically demoted to INCOMPLETE-EVIDENCE`
          : 'zero downstream dependents affected'
      }.`,
    };
    setWithdrawals((prev) => [newWithdrawal, ...prev]);
  };

  const handleRestoreClaim = (claimId: string, restoringVerdict?: ToolVerdictQuote) => {
    const target = claims.find((c) => c.id === claimId);
    if (!target) return;
    const outcome = restoreClaimWithExecutedVerdict(target, restoringVerdict);
    setRestoreStatusBanner({ ok: outcome.restored, message: outcome.reason });
    if (!outcome.restored) {
      return;
    }
    setClaims((prev) => prev.map((c) => (c.id === claimId ? outcome.claim : c)));
  };

  const isUm1SubTab =
    activeTab === 'registry' ||
    activeTab === 'dependencies' ||
    activeTab === 'grading' ||
    activeTab === 'ladder' ||
    activeTab === 'withdrawals' ||
    activeTab === 'handoff';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setOpenModalOnRegistry(false);
            setActiveTab('coscientist');
          }}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Co-Scientist · Frontier Discovery
        </a>

        {/* Zone 2: Single-Line Workspace Navigation Links */}
        <nav
          className="flex items-center gap-4 lg:gap-5 text-xs sm:text-sm font-medium text-slate-600 overflow-x-auto"
          aria-label="Primary Workspace Navigation"
        >
          <button
            type="button"
            onClick={() => {
              setOpenModalOnRegistry(false);
              setActiveTab('coscientist');
            }}
            data-testid="nav-tab-studio"
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'coscientist'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Agent Studio
          </button>

          <button
            type="button"
            onClick={() => {
              setOpenModalOnRegistry(false);
              setActiveTab('arena');
            }}
            data-testid="nav-tab-arena"
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'arena'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Hypothesis Arena
          </button>

          <button
            type="button"
            onClick={() => {
              setOpenModalOnRegistry(false);
              setActiveTab('sieve');
            }}
            data-testid="nav-tab-sieve"
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'sieve'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            5-Layer Epistemic Sieve
          </button>

          <button
            type="button"
            onClick={() => {
              setOpenModalOnRegistry(false);
              setActiveTab('corpus');
            }}
            data-testid="nav-tab-corpus"
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'corpus'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Corpus &amp; Discovery
          </button>

          <button
            type="button"
            onClick={() => {
              setOpenModalOnRegistry(false);
              setActiveTab('execution');
            }}
            data-testid="nav-tab-execution"
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'execution'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Execution Lab
          </button>

          <button
            type="button"
            onClick={() => {
              setOpenModalOnRegistry(false);
              setActiveTab(isUm1SubTab ? activeTab : 'registry');
            }}
            data-testid="nav-tab-registry"
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              isUm1SubTab
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            UM-1 Claims &amp; Audit
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleAuthAction}
            data-testid="firebase-auth-button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {currentUser ? (
              <>
                <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentUser.email?.split('@')[0]}</span>
                <LogOut className="w-3 h-3 text-slate-500 ml-1" />
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-blue-600" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </div>
      </header>

      {authErrorBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs font-mono text-amber-800 flex items-center justify-between">
          <span>Authentication notice: {authErrorBanner}</span>
          <button
            type="button"
            onClick={() => setAuthErrorBanner(null)}
            className="underline hover:text-amber-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Contextual UM-1 Sub-Navigation Bar when viewing Claims / Audit / Rungs */}
      {isUm1SubTab && (
        <div className="bg-white border-b border-slate-200 px-6 py-2">
          <div className="max-w-[1360px] mx-auto flex items-center gap-4 text-xs font-medium text-slate-600 overflow-x-auto">
            <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
              UM-1 Protocol Views:
            </span>
            {(
              [
                { id: 'registry', label: 'Claims & EXP Registry' },
                { id: 'dependencies', label: 'Premises (P3)' },
                { id: 'grading', label: 'Preflight (P1–P7) & Grade' },
                { id: 'ladder', label: 'Rung 0–5 Ladder' },
                { id: 'withdrawals', label: 'Withdrawals' },
                { id: 'handoff', label: 'External Audit & RESUME.md' },
              ] as const
            ).map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setOpenModalOnRegistry(false);
                  setActiveTab(sub.id);
                }}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === sub.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-6">
        {activeTab === 'coscientist' && (
          <CoScientistHubView
            claims={claims}
            selectedClaimId={selectedClaimId}
            onSelectClaim={setSelectedClaimId}
            onUpdateClaim={handleUpdateClaimRecord}
            researchGoal={researchGoal}
            onUpdateResearchGoal={setResearchGoal}
            chatMessages={chatMessages}
            onUpdateChatMessages={setChatMessages}
            activeAgentRole={activeAgentRole}
            onSelectAgentRole={setActiveAgentRole}
            activeModel={activeModel}
            onSelectModel={setActiveModel}
            onRequestNewClaim={handleRequestNewClaim}
            onNavigateTab={(tab) => {
              setOpenModalOnRegistry(false);
              setActiveTab(tab);
            }}
            connectedSources={connectedSources}
            onSourceIngested={handleSourceIngested}
            autoFilledSearchQuery={autoFilledSearchQuery}
            synthesisReport={synthesisReport}
            onLoadPresetCorpus={handleLoadPresetCorpus}
            onOpenExecutionRuntime={(rt) => {
              setExecLabRuntime(rt);
              setExecLabCode(undefined);
              setExecLabTitle(undefined);
              setActiveTab('execution');
            }}
          />
        )}

        {activeTab === 'arena' && (
          <HypothesisArenaView
            arenaState={arenaState}
            onUpdateArenaState={setArenaState}
            researchGoal={researchGoal}
            onUpdateResearchGoal={setResearchGoal}
            onRegisterHypothesisAsClaim={handleRegisterArenaHypothesisAsClaim}
            onNavigateToClaimRegistry={() => {
              setOpenModalOnRegistry(false);
              setActiveTab('registry');
            }}
          />
        )}

        {activeTab === 'sieve' && (
          <EpistemicMachineView
            connectedSources={connectedSources}
            onPromoteLedgerRowToClaim={handlePromoteLedgerRowToClaim}
            onOpenScriptInExecutionLab={handleOpenSieveScriptInExecutionLab}
            onLoadAllIrhAuditClaims={handleLoadAllIrhAuditClaims}
          />
        )}

        {activeTab === 'corpus' && (
          <CorpusDiscoveryView
            connectedSources={connectedSources}
            researchGoal={researchGoal}
            synthesisReport={synthesisReport}
            onUpdateSynthesisReport={setSynthesisReport}
            onSourceIngested={handleSourceIngested}
            onLoadPresetCorpus={handleLoadPresetCorpus}
            onPromoteBridgeToClaim={handlePromoteBridgeToClaim}
            onOpenBridgeInExecutionLab={handleOpenBridgeInExecutionLab}
          />
        )}

        {activeTab === 'execution' && (
          <ExecutionLabView
            key={`${execLabRuntime}-${execLabTitle || 'default'}`}
            claims={claims}
            selectedClaimId={selectedClaimId}
            onSelectClaim={setSelectedClaimId}
            executionRuns={executionRuns}
            onRecordExecutionRun={(run) => setExecutionRuns((prev) => [run, ...prev])}
            onAttachToolVerdictToClaim={handleAttachToolVerdictToClaim}
            initialRuntime={execLabRuntime}
            initialCode={execLabCode}
            initialTitle={execLabTitle}
            onRequestNewClaim={handleRequestNewClaim}
          />
        )}

        {activeTab === 'registry' && (
          <ClaimRegistryView
            key={`${openModalOnRegistry ? 'modal-open' : 'modal-default'}-${
              prefillExtraction?.claimDraft.title || 'empty'
            }`}
            claims={claims}
            selectedClaimId={selectedClaimId}
            onSelectClaim={setSelectedClaimId}
            onAddClaim={handleAddClaim}
            onUpdateLifecycle={handleUpdateLifecycle}
            onChangeTier={handleChangeTier}
            defaultOpenModal={openModalOnRegistry}
            prefillExtraction={prefillExtraction}
            connectedSources={connectedSources}
            onSourceIngested={handleSourceIngested}
          />
        )}

        {activeTab === 'ladder' && (
          <VerificationLadderView
            claims={claims}
            selectedClaimId={selectedClaimId}
            onSelectClaim={setSelectedClaimId}
            onUpdateRungAndAudit={handleUpdateRungAndAudit}
            onRequestNewClaim={handleRequestNewClaim}
          />
        )}

        {activeTab === 'dependencies' && (
          <DependencyLedgerView
            claims={claims}
            selectedClaimId={selectedClaimId}
            onSelectClaim={setSelectedClaimId}
            onUpdateDependencyLedger={handleUpdateDependencyLedger}
            onRequestNewClaim={handleRequestNewClaim}
          />
        )}

        {activeTab === 'grading' && (
          <GradingPreflightView
            claims={claims}
            selectedClaimId={selectedClaimId}
            preflightLogs={preflightLogs}
            onSelectClaim={setSelectedClaimId}
            onUpdateClaimGradingAndPreflight={handleUpdateClaimGradingAndPreflight}
            onLogPreflightRun={handleLogPreflightRun}
            onRequestNewClaim={handleRequestNewClaim}
          />
        )}

        {activeTab === 'withdrawals' && (
          <WithdrawalLedgerView
            claims={claims}
            withdrawals={withdrawals}
            executionRuns={executionRuns}
            restoreStatusBanner={restoreStatusBanner}
            onExecuteRetraction={handleExecuteRetraction}
            onRestoreClaim={handleRestoreClaim}
            onRequestNewClaim={handleRequestNewClaim}
          />
        )}

        {activeTab === 'handoff' && (
          <HandoffDepositionView
            key={`${autoFilledProgrammeSlug}-${autoFilledManuscriptExcerpt.length}`}
            claims={claims}
            withdrawals={withdrawals}
            externalLogs={externalLogs}
            onExecuteExternalVerification={handleExecuteExternalVerification}
            onToggleLocalAuditCheck={handleToggleLocalAuditCheck}
            onRequestNewClaim={handleRequestNewClaim}
            autoFilledProgrammeSlug={autoFilledProgrammeSlug}
            autoFilledManuscriptExcerpt={autoFilledManuscriptExcerpt}
          />
        )}
      </main>
    </div>
  );
}
