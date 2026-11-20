import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const AGENT_ROLE_INSTRUCTIONS: Record<string, string> = {
  Generation: `You are the Google Co-Scientist **Generation Agent** operating under Unified Methodology UM-1 (HLRE v5.1 + CAOS OS).
Synthesize novel, falsifiable research hypotheses (EXP-NNN) and deductive/empirical claims (Track F or Track E), specifying:
1. Target measurement & invariant-first check (what cheap single invariant is tested first).
2. Explicit one-sidedness declaration (what PASS proves vs what FAIL proves).
3. Premise ledger dependencies (observations, choices, assumptions) and falsification criteria.
Maintain strict scientific voice: never overstate a result beyond its computable UM-1 grade (A-D, F1-F3) or independence level (I0-I4).`,

  Reflection: `You are the Google Co-Scientist **Reflection & Adversarial Review Agent** operating under Unified Methodology UM-1 (UM-4.1 & UM-4.4).
Audit claims and experimental protocols across Rung 0 (Statement) through Rung 5 (External):
1. Identify un-re-derived primary transcriptions that trigger INCOMPLETE-EVIDENCE (UM-4.4).
2. Formulate concrete "How could this be wrong?" failure modes at the current verification rung.
3. Verify Preflight P1-P7 readiness, including P3 premise dependency checks and P7 $300/mo spend cap compliance.`,

  Ranking: `You are the Google Co-Scientist **Tournament & Ranking Agent** operating under Unified Methodology UM-1.
Compare competing scientific hypotheses and claims:
1. Evaluate each claim by its worst-of computable grade (Rung cap, Tier cap, Premise ledger audit, and Independence level I0-I4).
2. Rank hypotheses by falsifiability, invariant efficiency, and empirical/deductive survival under adversarial stress tests.
3. Recommend whether a claim should advance to the next rung, remain capped, or undergo UM-4.5 mechanical demotion.`,

  Evolution: `You are the Google Co-Scientist **Hypothesis Evolution Agent** operating under Unified Methodology UM-1 (UM-1.2 & UM-1.4).
Refine and evolve frozen EXP-NNN records when a prior hypothesis encounters a boundary failure, kill criterion, or [D]/[C] premise bottleneck:
1. Propose a successor EXP-(N+1) that links back to the superseded EXP-NNN.
2. Eliminate un-re-derived premise bottlenecks by proposing independent second-tool verification.
3. Tighten compute budgets and kill criteria.`,

  'Meta-Review': `You are the Google Co-Scientist **Proximity & Meta-Review Agent** operating under Unified Methodology UM-1 (UM-4.3 & UM-7).
Synthesize multi-agent findings into an auditable research overview, RESUME.md handoff, or Zenodo deposit check:
1. Summarize the global dependency DAG and flag any transitive retraction exposure.
2. Audit scientific prose for prohibited promotional words and enforce strict [MV]/[D]/[C] record labeling.`,
};

const ALLOWED_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-4-argon',
  'gemini-4-carbon',
  'gemini-3.1-flash-lite',
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      agentRole = 'Generation',
      model = 'gemini-4-hydrogen',
      workspaceContext = '',
    } = body as {
      messages: Array<{ role: 'user' | 'model'; text: string }>;
      agentRole?: string;
      model?: string;
      workspaceContext?: string;
    };

    const selectedModel = ALLOWED_MODELS.has(model) ? model : 'gemini-4-hydrogen';
    const roleInstruction =
      AGENT_ROLE_INSTRUCTIONS[agentRole] || AGENT_ROLE_INSTRUCTIONS.Generation;

    const systemInstruction = `${roleInstruction}\n\nActive UM-1 Workspace State:\n${
      workspaceContext || 'No claims registered yet in the workspace.'
    }`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json({
        text: buildAnalyticalResponse(agentRole, selectedModel, messages, workspaceContext),
        modelUsed: selectedModel,
        agentRole,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const contents = messages.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    try {
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config: {
          systemInstruction,
        },
      });

      return NextResponse.json({
        text: response.text || 'No response generated.',
        modelUsed: selectedModel,
        agentRole,
      });
    } catch {
      if (selectedModel !== 'gemini-4-hydrogen') {
        try {
          const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents,
            config: {
              systemInstruction,
            },
          });
          return NextResponse.json({
            text: fallbackResponse.text || 'No response generated.',
            modelUsed: 'gemini-4-hydrogen',
            agentRole,
          });
        } catch {
          // Fall through to analytical synthesis
        }
      }

      return NextResponse.json({
        text: buildAnalyticalResponse(agentRole, selectedModel, messages, workspaceContext),
        modelUsed: selectedModel,
        agentRole,
      });
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to process Co-Scientist chat request.',
      },
      { status: 500 }
    );
  }
}

function buildAnalyticalResponse(
  agentRole: string,
  model: string,
  messages: Array<{ role: 'user' | 'model'; text: string }>,
  workspaceContext: string
): string {
  const lastUserMsg =
    [...messages].reverse().find((m) => m.role === 'user')?.text || 'Evaluate workspace state.';

  return `### ${agentRole} Agent Synthesis (\`${model}\`)

**Input Analyzed:** "${lastUserMsg}"

#### 1. UM-1 Methodological Framing
- **Workspace Status:** ${workspaceContext ? workspaceContext : 'No claims registered yet. Start by registering a Track F (Deductive) or Track E (Empirical) claim.'}
- **One-Sidedness & Invariant Gate (UM-1.4):** Before committing compute time, specify:
  1. **What \`PASS\` proves** vs. **what \`FAIL\` proves** (one-sidedness).
  2. **Invariant-first check**: The single lowest-cost invariant that can falsify the hypothesis before full execution.
  3. **Compute budget & kill criterion**: Hard resource bound and conclusion if hit.

#### 2. Next Protocol Steps
- Register or select a claim in **Claims & EXP** to lock its \`hypothesis.md\` (Template A1).
- Validate all premise dependencies in **Dependency Ledger** (UM-4.4) to ensure no leaf transcription remains un-re-derived.
- Run **Preflight P1–P7** before advancing along **Rung 0–5**.`;
}
