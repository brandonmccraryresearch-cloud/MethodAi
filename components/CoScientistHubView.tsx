'use client';

import React, { useRef, useState } from 'react';
import Markdown from 'react-markdown';
import CoScientist3DScene from './CoScientist3DScene';
import SourceIngestionPanel, { type ConnectedSourceRecord } from './SourceIngestionPanel';
import {
  type ClaimExperimentRecord,
  type VerificationRung,
  computeUM1Grade,
  VERIFICATION_LADDER_SPECS,
} from '@/lib/um1-engine';
import {
  type CorpusSynthesisReport,
  type ExecutionRuntime,
} from '@/lib/frontier-discovery';
import {
  ArrowRightLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Code2,
  Compass,
  ExternalLink,
  FolderGit2,
  Globe,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';

export type CoScientistAgentRole =
  | 'Supervisor'
  | 'Generation'
  | 'Reflection'
  | 'Ranking'
  | 'Evolution'
  | 'Proximity'
  | 'Meta-Review';

export type CoScientistModelId =
  | 'gemini-4-hydrogen'
  | 'gemini-4-argon'
  | 'gemini-4-carbon'
  | 'gemini-decision-1';

export interface GroundingSourceItem {
  title: string;
  uri: string;
}

export interface CoScientistChatMessage {
  id: string;
  role: 'user' | 'assistant';
  agentRole: CoScientistAgentRole;
  model: string;
  content: string;
  timestamp: string;
  sources?: GroundingSourceItem[];
}

interface CoScientistHubViewProps {
  claims: ClaimExperimentRecord[];
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  onUpdateClaim: (updated: ClaimExperimentRecord) => void;
  researchGoal: string;
  onUpdateResearchGoal: (goal: string) => void;
  chatMessages: CoScientistChatMessage[];
  onUpdateChatMessages: React.Dispatch<React.SetStateAction<CoScientistChatMessage[]>>;
  activeAgentRole: CoScientistAgentRole;
  onSelectAgentRole: (role: CoScientistAgentRole) => void;
  activeModel: CoScientistModelId;
  onSelectModel: (model: CoScientistModelId) => void;
  onRequestNewClaim: () => void;
  onNavigateTab: (
    tab:
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
      | 'handoff'
  ) => void;
  connectedSources: ConnectedSourceRecord[];
  onSourceIngested: (
    record: ConnectedSourceRecord,
    mode: 'auto-register-all' | 'prefill-form-only'
  ) => void;
  autoFilledSearchQuery?: string;
  synthesisReport?: CorpusSynthesisReport | null;
  onLoadPresetCorpus?: () => void;
  onOpenExecutionRuntime?: (runtime: ExecutionRuntime) => void;
}

const AGENT_ROLES: {
  role: CoScientistAgentRole;
  shortDesc: string;
}[] = [
  {
    role: 'Generation',
    shortDesc: 'Cross-Domain Conjecture & Isomorphism Discovery',
  },
  {
    role: 'Reflection',
    shortDesc: 'Lean 4, Singular & Python Formalizer + P3 Audit',
  },
  {
    role: 'Meta-Review',
    shortDesc: 'Study Corpus Literature Synthesis & Gap Matrix',
  },
  {
    role: 'Ranking',
    shortDesc: 'UM-1 Grade (A–D, F1–F3) & Invariant-First Scorer',
  },
  {
    role: 'Evolution',
    shortDesc: 'Boundary Stress-Testing & Counterexample Search',
  },
  {
    role: 'Supervisor',
    shortDesc: 'Research Programme Orchestration & Spend Cap',
  },
];

const MODEL_OPTIONS: {
  id: CoScientistModelId;
  label: string;
}[] = [
  { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (Fast Synthesis)' },
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon (STEM & Proof)' },
  { id: 'gemini-4-carbon', label: 'Gemini 4 Carbon (Deep Audit)' },
  { id: 'gemini-decision-1', label: 'Gemini Decision 1 (Rubric)' },
];

type StudioPanelMode = 'dialogue' | 'ingest' | 'search' | 'lattice3d';

export default function CoScientistHubView({
  claims,
  selectedClaimId,
  onSelectClaim,
  onUpdateClaim,
  researchGoal,
  onUpdateResearchGoal,
  chatMessages,
  onUpdateChatMessages,
  activeAgentRole,
  onSelectAgentRole,
  activeModel,
  onSelectModel,
  onRequestNewClaim,
  onNavigateTab,
  connectedSources,
  onSourceIngested,
  autoFilledSearchQuery = '',
  synthesisReport,
  onLoadPresetCorpus,
  onOpenExecutionRuntime,
}: CoScientistHubViewProps) {
  const [studioMode, setStudioMode] = useState<StudioPanelMode>('dialogue');
  const [goalDraft, setGoalDraft] = useState(researchGoal);
  const [goalSavedToast, setGoalSavedToast] = useState(false);

  const activeClaim = claims.find((c) => c.id === selectedClaimId) || claims[0];

  // Google Search Grounding state
  const [searchQuery, setSearchQuery] = useState(autoFilledSearchQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSummary, setSearchSummary] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<GroundingSourceItem[]>([]);
  const [searchModelUsed, setSearchModelUsed] = useState<string>('');
  const [p1LoggedNotice, setP1LoggedNotice] = useState<string | null>(null);

  // Multi-Turn Chat state
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const msgSeqRef = useRef(1);

  const handleStudioSourceIngested = (
    record: ConnectedSourceRecord,
    mode: 'auto-register-all' | 'prefill-form-only'
  ) => {
    if (record.extraction.researchGoal) {
      setGoalDraft(record.extraction.researchGoal);
    }
    if (record.extraction.suggestedSearchQuery) {
      setSearchQuery(record.extraction.suggestedSearchQuery);
    }
    onSourceIngested(record, mode);
  };

  const handleSaveResearchGoal = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateResearchGoal(goalDraft.trim());
    setGoalSavedToast(true);
    setTimeout(() => setGoalSavedToast(false), 2000);
  };

  const handleAdvanceClaimRung = (claimId: string) => {
    const target = claims.find((c) => c.id === claimId);
    if (!target || target.gradingInput.verificationRung >= 5) return;
    const nextRung = (target.gradingInput.verificationRung + 1) as VerificationRung;
    onUpdateClaim({
      ...target,
      gradingInput: {
        ...target.gradingInput,
        verificationRung: nextRung,
        kernelCheckedOrClosedLedger:
          nextRung >= 4 ? true : target.gradingInput.kernelCheckedOrClosedLedger,
      },
      rungAudits: target.rungAudits.map((ra) =>
        ra.rung === nextRung
          ? {
              ...ra,
              completed: true,
              updatedAt: new Date().toISOString(),
            }
          : ra
      ),
    });
  };

  const handleExecuteLiteratureSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setP1LoggedNotice(null);
    try {
      const res = await fetch('/api/coscientist/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          claimId: activeClaim?.id,
          domain: activeClaim?.domain,
        }),
      });
      const data = await res.json();
      setSearchSummary(data.summary || 'No literature synthesis returned.');
      setSearchSources(Array.isArray(data.sources) ? data.sources : []);
      setSearchModelUsed(data.modelUsed || 'gemini-4-hydrogen');
    } catch {
      setSearchSummary(
        'Error executing literature search grounding. Verify network or server route.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogSearchToP1 = () => {
    if (!activeClaim || !searchSummary) return;
    const citationList =
      searchSources.length > 0
        ? searchSources.map((s) => `${s.title} (${s.uri})`).join('; ')
        : `Literature Search Grounding for "${searchQuery}"`;

    onUpdateClaim({
      ...activeClaim,
      priorLiterature: `${activeClaim.priorLiterature}; [Grounded P1]: ${citationList.slice(0, 280)}`,
      preflight: {
        ...activeClaim.preflight,
        P1_sourceComplete: true,
      },
    });
    setP1LoggedNotice(
      `Preflight P1 (Source-Complete) certified on ${activeClaim.id} (${activeClaim.expId}) with ${searchSources.length} grounded source(s).`
    );
  };

  const submitAgentPrompt = async (promptText: string) => {
    if (!promptText.trim() || isChatLoading) return;
    const trimmed = promptText.trim();
    const seq = msgSeqRef.current++;
    const isoNow = new Date().toISOString();
    const userMessage: CoScientistChatMessage = {
      id: `MSG-${seq}-U`,
      role: 'user',
      agentRole: activeAgentRole,
      model: activeModel,
      content: trimmed,
      timestamp: isoNow,
    };

    const nextHistory = [...chatMessages, userMessage];
    onUpdateChatMessages(nextHistory);
    setChatInput('');
    setIsChatLoading(true);

    const corpusSummary =
      connectedSources.length > 0
        ? connectedSources
            .map((s) => `[${s.sourceType.toUpperCase()}] ${s.identifier}: ${s.title}`)
            .join('; ')
        : 'No corpus sources connected yet.';

    const claimContextSummary = activeClaim
      ? `Active Claim ${activeClaim.id} (${activeClaim.expId}): "${activeClaim.title}", Track=${
          activeClaim.gradingInput.track
        }, Tier=${activeClaim.gradingInput.tier}, Rung=${
          activeClaim.gradingInput.verificationRung
        }, Grade=${computeUM1Grade(activeClaim.gradingInput).finalGrade}, InvariantNote="${
          activeClaim.invariantFirstNote
        }", ToolVerdicts=${activeClaim.gradingInput.toolVerdicts.length}. Study Corpus: ${corpusSummary}`
      : `Study Corpus (${connectedSources.length}): ${corpusSummary}. No active claim selected yet.`;

    try {
      const res = await fetch('/api/coscientist/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({
            role: m.role,
            content: m.content,
            agentRole: m.agentRole,
          })),
          agentRole: activeAgentRole,
          model: activeModel,
          researchGoal,
          claimContextSummary,
        }),
      });
      const data = await res.json();
      const assistantMessage: CoScientistChatMessage = {
        id: `MSG-${seq}-A`,
        role: 'assistant',
        agentRole: activeAgentRole,
        model: data.modelUsed || activeModel,
        content: data.reply || 'Agent completed analysis without text output.',
        timestamp: new Date().toISOString(),
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      onUpdateChatMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errMessage: CoScientistChatMessage = {
        id: `MSG-${seq}-ERR`,
        role: 'assistant',
        agentRole: activeAgentRole,
        model: activeModel,
        content: 'Network error communicating with `/api/coscientist/chat`. Please retry.',
        timestamp: new Date().toISOString(),
      };
      onUpdateChatMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAgentPrompt(chatInput);
  };

  return (
    <div className="space-y-6">
      {/* Agent-First Frontier Command Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-mono text-blue-700">
                Agent-First Frontier Scientific Discovery &amp; Formal Verification Platform · UM-1
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Literature Synthesis, Cross-Domain Pattern Discovery &amp; Formal Execution (Lean 4 · Singular · Python)
              </h1>
            </div>

            {connectedSources.length === 0 && onLoadPresetCorpus && (
              <button
                type="button"
                onClick={onLoadPresetCorpus}
                data-testid="studio-load-preset-corpus-btn"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load 3-Domain Study Corpus</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveResearchGoal} className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-semibold text-slate-600 shrink-0 hidden sm:inline">
              Research Objective:
            </span>
            <input
              type="text"
              aria-label="Research Objective"
              data-testid="studio-research-goal-input"
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              placeholder="Enter your frontier research question or cross-domain hypothesis (e.g., Jacobian singular ideals ↔ 2-Selmer parity ↔ spectral operators)..."
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {goalSavedToast ? 'Saved' : 'Set Objective'}
            </button>
          </form>
        </div>

        {/* 4 Core Frontier Capabilities Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-md flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                01. 5-Layer Epistemic Sieve
              </div>
              <div className="text-[11px] text-slate-600 truncate">
                Ologs · Bond Guards · Sheaf AGM · IRH v94 Audit
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('sieve')}
              data-testid="goto-epistemic-sieve-btn"
              className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors whitespace-nowrap shrink-0"
            >
              5-Layer Sieve →
            </button>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                02. Study Corpus &amp; Discovery
              </div>
              <div className="text-[11px] text-slate-600 truncate">
                {connectedSources.length} source(s) ·{' '}
                {synthesisReport
                  ? `${synthesisReport.crossDomainBridges.length} bridges`
                  : 'Synthesize papers & repos'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('corpus')}
              data-testid="goto-corpus-discovery-btn"
              className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-slate-300 rounded transition-colors whitespace-nowrap shrink-0"
            >
              Corpus →
            </button>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                03. Lean 4 · Singular · Python
              </div>
              <div className="text-[11px] text-slate-600 truncate">
                Kernel proofs, Gröbner bases &amp; exact Q
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('execution')}
              data-testid="goto-execution-lab-btn"
              className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-slate-300 rounded transition-colors whitespace-nowrap shrink-0"
            >
              Exec Lab →
            </button>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                04. UM-1 Claims &amp; Rung 0–5
              </div>
              <div className="text-[11px] text-slate-600 truncate">
                {claims.length} claim(s) · HLRE v5.1 + CAOS OS
              </div>
            </div>
            <button
              type="button"
              onClick={onRequestNewClaim}
              data-testid="studio-new-claim-button"
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors whitespace-nowrap shrink-0"
            >
              + New Claim
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace: Left Agent Studio | Right Corpus, Execution & Claims Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Focused Mode Switcher */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          {/* Sub-Toolbar Mode Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-1" role="tablist" aria-label="Studio Workspace Mode">
              <button
                type="button"
                role="tab"
                aria-selected={studioMode === 'dialogue'}
                onClick={() => setStudioMode('dialogue')}
                data-testid="tab-studio-dialogue"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  studioMode === 'dialogue'
                    ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Co-Scientist Research Agent</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={studioMode === 'ingest'}
                onClick={() => setStudioMode('ingest')}
                data-testid="tab-studio-ingest"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  studioMode === 'ingest'
                    ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Ingest GitHub / arXiv / PDF / .tex</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={studioMode === 'search'}
                onClick={() => setStudioMode('search')}
                data-testid="tab-studio-search"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  studioMode === 'search'
                    ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Literature Search (P1)</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={studioMode === 'lattice3d'}
                onClick={() => setStudioMode('lattice3d')}
                data-testid="tab-studio-3d"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  studioMode === 'lattice3d'
                    ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>3D Rung Lattice</span>
              </button>
            </div>
          </div>

          {/* Mode A: Multi-Turn Co-Scientist Research & Discovery Agent (Default Agent-First View) */}
          {studioMode === 'dialogue' && (
            <div className="p-5 flex flex-col h-[540px]">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-1.5">
                  {AGENT_ROLES.map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => onSelectAgentRole(item.role)}
                      title={item.shortDesc}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                        activeAgentRole === item.role
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {item.role}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    aria-label="Select Gemini Model"
                    value={activeModel}
                    onChange={(e) => onSelectModel(e.target.value as CoScientistModelId)}
                    className="px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  {chatMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onUpdateChatMessages([])}
                      aria-label="Clear dialogue history"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col justify-between p-4 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-blue-700">
                        Active Specialist Role: {activeAgentRole} —{' '}
                        {AGENT_ROLES.find((r) => r.role === activeAgentRole)?.shortDesc}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Autonomous Co-Scientist Agent Ready
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Ask the Co-Scientist Agent to synthesize your study corpus, discover
                        cross-domain mathematical isomorphisms (UM-2.6 Lens 6), formulate a
                        falsifiable `EXP-NNN` hypothesis, or write formal verification scripts in{' '}
                        <strong>Lean 4</strong>, <strong>Singular</strong>, and{' '}
                        <strong>Python 3 (Exact Q)</strong>.
                      </p>
                    </div>

                    {/* 1-Click Frontier Agent Task Launchers */}
                    <div className="space-y-2 pt-3 border-t border-slate-200">
                      <div className="text-[11px] font-mono text-slate-500">
                        1-Click Frontier Research &amp; Discovery Prompts:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          {
                            label: 'Synthesize Corpus & Cross-Domain Patterns',
                            prompt:
                              'Synthesize our current Study Corpus and identify a cross-domain structural isomorphism (UM-2.6 Lens 6 Reformulation Dictionary) with a shared mathematical invariant and falsifiable prediction.',
                          },
                          {
                            label: 'Generate Lean 4 Formal Theorem & Proof',
                            prompt:
                              'Formulate the primary invariant of our active research objective as a self-contained Lean 4 theorem using Mathlib tactics (`omega`, `ring`, `simp`) with zero `sorry` placeholders for Rung 4 certification.',
                          },
                          {
                            label: 'Construct Singular Gröbner & Syzygy Script',
                            prompt:
                              'Construct a Singular 4.4 commutative algebra script over char 0 (`ring R = 0, (x,y,z), dp;`) to compute the Jacobian singular locus ideal `std(J)`, Krull dimension `dim(G)`, and first syzygy module `syz(I)`.',
                          },
                          {
                            label: 'Design Python Exact-Q Falsification Script',
                            prompt:
                              'Write an exact-arithmetic Python 3 (`fractions.Fraction` / `sympy.Rational`) verification script under UM-2.3 (zero floats) with explicit PASS/FAIL one-sidedness and kill criterion.',
                          },
                        ].map((starter, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => submitAgentPrompt(starter.prompt)}
                            data-testid={`agent-starter-prompt-${idx}`}
                            className="p-2.5 text-left bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded text-xs transition-colors"
                          >
                            <div className="font-semibold text-slate-900">{starter.label}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {starter.prompt}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-lg text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white ml-10'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 mr-6'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between text-[11px] font-mono mb-1.5 ${
                          msg.role === 'user' ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        <span className="font-semibold">
                          {msg.role === 'user'
                            ? 'Researcher'
                            : `Co-Scientist · ${msg.agentRole} (${msg.model})`}
                        </span>
                        <span>{msg.timestamp.slice(11, 19)}</span>
                      </div>

                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <div className="markdown-body space-y-2 text-slate-800">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      )}

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                          {msg.sources.map((src, i) => (
                            <a
                              key={i}
                              href={src.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-700 hover:underline"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[200px]">{src.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendChatMessage} className="pt-3 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Ask ${activeAgentRole} Agent to synthesize literature, discover cross-domain patterns, or write Lean 4 / Singular / Python...`}
                  data-testid="coscientist-chat-input"
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  disabled={isChatLoading}
                  data-testid="coscientist-chat-send"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors shrink-0"
                >
                  {isChatLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isChatLoading ? 'Thinking...' : 'Send'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Mode B: Connect GitHub / arXiv / PDF / Text & Auto-Fill Agent */}
          {studioMode === 'ingest' && (
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Connect GitHub Repositories, arXiv Papers, PDFs, or Text Files (.txt, .md, .tex, .lean, .sing, .py)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  The Co-Scientist Ingestion Agent extracts the research goal, target measurement,
                  one-sidedness, invariant-first check, premise ledger nodes, and Rung 0–2 stage
                  analyses and auto-fills slots across the workbench.
                </p>
              </div>

              <SourceIngestionPanel
                connectedSources={connectedSources}
                onSourceIngested={handleStudioSourceIngested}
              />
            </div>
          )}

          {/* Mode C: Google Search Literature Grounding (Preflight P1) */}
          {studioMode === 'search' && (
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Primary Literature Search Grounding (Preflight P1: Source-Complete Before Compute)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Query primary sources, theorems, and experimental baselines using live Google
                  Search grounding.
                </p>
              </div>

              <form onSubmit={handleExecuteLiteratureSearch} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter theorem, arXiv identifier, or empirical baseline to verify..."
                    data-testid="literature-search-input"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  data-testid="literature-search-submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors shrink-0"
                >
                  {isSearching ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Globe className="w-3.5 h-3.5" />
                  )}
                  <span>{isSearching ? 'Searching...' : 'Search Literature'}</span>
                </button>
              </form>

              {searchSummary ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <span className="text-xs font-mono text-slate-600">
                      Synthesis ({searchModelUsed})
                    </span>
                    {activeClaim && (
                      <button
                        type="button"
                        onClick={handleLogSearchToP1}
                        data-testid="certify-p1-search-button"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Certify Preflight P1 on {activeClaim.id}</span>
                      </button>
                    )}
                  </div>

                  {p1LoggedNotice && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 font-medium">
                      {p1LoggedNotice}
                    </div>
                  )}

                  <div className="markdown-body text-xs text-slate-800 leading-relaxed space-y-2">
                    <Markdown>{searchSummary}</Markdown>
                  </div>

                  {searchSources.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-mono text-slate-500 mb-1.5">
                        Grounded Citations ({searchSources.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {searchSources.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-2 p-2 bg-white hover:bg-blue-50 border border-slate-200 rounded text-xs text-slate-700 hover:text-blue-700 transition-colors"
                          >
                            <span className="truncate font-medium">{src.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
                  Enter a query above to run live literature grounding and certify Preflight P1.
                </div>
              )}
            </div>
          )}

          {/* Mode D: 3D Verification Rung Lattice */}
          {studioMode === 'lattice3d' && (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    3D UM-1 Verification Rung Lattice (Rung 0 – Rung 5)
                  </h2>
                  <p className="text-xs text-slate-600">
                    Click any claim sphere to inspect or advance its verification rung.
                  </p>
                </div>
              </div>

              <CoScientist3DScene
                claims={claims}
                selectedClaimId={activeClaim?.id || ''}
                onSelectClaim={onSelectClaim}
                onAdvanceRung={handleAdvanceClaimRung}
              />
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Quick Execution Launchers + Active Claims & Study Corpus */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Formal & Symbolic Execution Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-blue-600" />
                <span>Formal &amp; Symbolic Runtimes</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-500">UM-2.3 / UM-2.4</span>
            </div>
            <p className="text-xs text-slate-600">
              Launch an interactive formal proof or exact symbolic verification script:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenExecutionRuntime) onOpenExecutionRuntime('lean4');
                  else onNavigateTab('execution');
                }}
                data-testid="quick-launch-lean4"
                className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded text-left transition-colors"
              >
                <div className="text-xs font-bold text-slate-900">Lean 4</div>
                <div className="text-[10px] font-mono text-blue-700 mt-0.5">Rung 4 Kernel</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenExecutionRuntime) onOpenExecutionRuntime('singular');
                  else onNavigateTab('execution');
                }}
                data-testid="quick-launch-singular"
                className="p-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded text-left transition-colors"
              >
                <div className="text-xs font-bold text-slate-900">Singular</div>
                <div className="text-[10px] font-mono text-amber-800 mt-0.5">Gröbner / Syz</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenExecutionRuntime) onOpenExecutionRuntime('python');
                  else onNavigateTab('execution');
                }}
                data-testid="quick-launch-python"
                className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded text-left transition-colors"
              >
                <div className="text-xs font-bold text-slate-900">Python 3</div>
                <div className="text-[10px] font-mono text-emerald-800 mt-0.5">Exact SymPy/Q</div>
              </button>
            </div>
          </div>

          {/* Workspace Claims List */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Workspace Claims ({claims.length})
              </h2>
              <button
                type="button"
                onClick={onRequestNewClaim}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                + Register New
              </button>
            </div>

            {claims.length === 0 ? (
              <div className="space-y-3 py-2">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Load the 3-domain study corpus, ingest a GitHub repo / arXiv paper / PDF / `.tex`
                  file, or register a claim manually:
                </p>

                <div className="flex flex-col gap-2">
                  {onLoadPresetCorpus && (
                    <button
                      type="button"
                      onClick={onLoadPresetCorpus}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Load Frontier 3-Domain Study Corpus</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStudioMode('ingest')}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-md transition-colors"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Connect GitHub / arXiv / PDF / .tex</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRequestNewClaim}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register Manual Claim / EXP</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {claims.map((claim) => {
                  const grade = computeUM1Grade(claim.gradingInput).finalGrade;
                  const selected = claim.id === activeClaim?.id;
                  const rungSpec = VERIFICATION_LADDER_SPECS[claim.gradingInput.verificationRung];
                  return (
                    <div
                      key={claim.id}
                      data-testid={`workspace-claim-card-${claim.id}`}
                      onClick={() => onSelectClaim(claim.id)}
                      className={`p-3.5 rounded-md border cursor-pointer transition-colors ${
                        selected
                          ? 'border-blue-600 bg-blue-50/40'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-900">
                          {claim.id} {claim.expId ? `· ${claim.expId}` : ''}
                        </span>
                        <span className="font-mono font-semibold text-blue-700">
                          Grade {grade}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-900 mt-1 line-clamp-1">
                        {claim.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-mono">
                        {rungSpec?.name} · Tier {claim.gradingInput.tier} ·{' '}
                        {claim.gradingInput.independence} · Tools:{' '}
                        {claim.gradingInput.toolVerdicts.length}
                      </div>

                      {selected && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateTab('execution');
                            }}
                            className="text-[11px] font-mono text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                          >
                            <Play className="w-2.5 h-2.5" /> Run Lean/Singular/Py →
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateTab('corpus');
                            }}
                            className="text-[11px] font-mono text-blue-700 hover:underline inline-flex items-center gap-0.5"
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" /> Bridges →
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateTab('dependencies');
                            }}
                            className="text-[11px] font-mono text-blue-700 hover:underline"
                          >
                            Premises ({claim.dependencyLedgerItems.length}) →
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateTab('grading');
                            }}
                            className="text-[11px] font-mono text-blue-700 hover:underline"
                          >
                            Preflight →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
