import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { confirmSource } from '@/lib/grounding-confirmer';
import {
  ARENA_PERSONAS,
  buildRoundRobinMatchups,
  evaluateDefeaterCriterion,
  evaluateFalsifiabilityCriterion,
  type ArenaCitation,
  type ArenaCriterionScores,
  type ArenaHypothesis,
  type ArenaPersona,
  type ArenaPremiseItem,
} from '@/lib/hypothesis-arena';
import type { DependencyNodeKind, IndependenceLevel, VerificationRung } from '@/lib/um1-engine';

const MODEL_ID = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function normalizePersona(raw: string, fallbackIdx: number): ArenaPersona {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('skeptic') || lower.includes('adversar')) return 'Skeptic/Adversary';
  if (lower.includes('synth')) return 'Synthesizer';
  if (lower.includes('domain') || lower.includes('special')) return 'Domain Specialist';
  if (lower.includes('gen')) return 'Generator';
  return ARENA_PERSONAS[fallbackIdx % ARENA_PERSONAS.length];
}

function normalizeIndependence(raw: string): IndependenceLevel {
  if (raw === 'I0' || raw === 'I1' || raw === 'I2' || raw === 'I3' || raw === 'I4') {
    return raw;
  }
  return 'I1';
}

function normalizeNodeKind(raw: string): DependencyNodeKind {
  if (
    raw === 'observation' ||
    raw === 'choice' ||
    raw === 'assumption' ||
    raw === 'primary_transcription' ||
    raw === 'claim_premise'
  ) {
    return raw;
  }
  return 'assumption';
}

function clampRung(n: number): VerificationRung {
  const rounded = Math.round(Number.isFinite(n) ? n : 1);
  if (rounded <= 0) return 0;
  if (rounded >= 5) return 5;
  return rounded as VerificationRung;
}

function clampScore(n: number): number {
  const val = Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(10, Number(val.toFixed(1))));
}

async function fetchGoogleSearchCitations(
  ai: GoogleGenAI,
  query: string
): Promise<{ citations: ArenaCitation[]; groundingNote: string }> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `Find peer-reviewed papers, arXiv preprints, technical documentation, or authoritative scientific benchmarks directly relevant to: "${query}". Summarize the most authoritative verifiable findings briefly.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const seen = new Set<string>();
    const citations: ArenaCitation[] = [];
    for (const chunk of chunks) {
      const uri = chunk.web?.uri;
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        // LLM-suggested & Search-suggested sources MUST stay verified: false until confirmSource verifies HTTP 200 + text support
        citations.push({
          title: chunk.web?.title || uri,
          uri,
          verified: false,
          confirmationStatus: 'UNVERIFIED',
        });
      }
    }
    return {
      citations,
      groundingNote: response.text || '',
    };
  } catch {
    return { citations: [], groundingNote: '' };
  }
}

async function confirmCandidateCitations(
  candidates: ArenaCitation[],
  claimText: string
): Promise<ArenaCitation[]> {
  return Promise.all(
    candidates.map(async (c) => {
      const result = await confirmSource({
        uri: c.uri,
        citedPassage: c.snippet || claimText,
        claimText,
      });
      if (result.verified && result.um24bQuote) {
        return {
          ...c,
          verified: true,
          confirmationStatus: 'VERIFIED' as const,
          confirmationReason: result.reason,
          um24bQuote: result.um24bQuote,
        };
      }
      return {
        ...c,
        verified: false,
        confirmationStatus: 'FAILED' as const,
        confirmationReason: result.reason,
        um24bQuote: null,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body as { action?: 'generate' | 'judge' | 'confirm_source' };

    if (action === 'confirm_source') {
      const { uri, citedPassage, claimText } = body as {
        uri?: string;
        citedPassage?: string;
        claimText?: string;
      };
      if (!uri || !uri.trim()) {
        return NextResponse.json(
          { error: 'A source URI is required for confirmSource verification.' },
          { status: 400 }
        );
      }
      const confirmation = await confirmSource({
        uri: uri.trim(),
        citedPassage,
        claimText,
      });
      return NextResponse.json(confirmation);
    }

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not configured on the server. Set GEMINI_API_KEY for live multi-agent generation, or use the Worked Example tournament mode.',
        },
        { status: 503 }
      );
    }

    if (action === 'generate') {
      const { researchGoal } = body as { researchGoal?: string };
      if (!researchGoal || !researchGoal.trim()) {
        return NextResponse.json(
          { error: 'A research goal is required to generate Arena hypotheses.' },
          { status: 400 }
        );
      }

      const cleanGoal = researchGoal.trim();

      // Step 1: Ground research goal via Google Search tool first (stays verified: false until confirmSource runs)
      const goalGrounding = await fetchGoogleSearchCitations(ai, cleanGoal);

      // Step 2: Generate 4 competing persona hypotheses with strict premise ledgers & UM-4.1a defeaters
      const generationPrompt = `You are orchestrating the UM-1 Co-Scientist Hypothesis Arena for the following research goal:
"${cleanGoal}"

Grounded literature context discovered via Google Search:
${goalGrounding.citations.map((c, i) => `${i + 1}. ${c.title} (${c.uri})`).join('\n') || 'No direct search chunks returned yet.'}
${goalGrounding.groundingNote ? `\nSynthesis: ${goalGrounding.groundingNote.slice(0, 1200)}` : ''}

Generate EXACTLY 4 competing scientific hypotheses, one from each distinct agent persona:
1. "Generator": Bold cross-domain mechanistic hypothesis (may introduce ambitious unproven assumptions marked verified=false).
2. "Skeptic/Adversary": Falsification / boundary-obstruction hypothesis challenging naive assumptions or edge regimes.
3. "Synthesizer": Unifying bridge hypothesis reconciling multiple established mechanisms or domains.
4. "Domain Specialist": Deep domain-specific mechanism anchored in established invariants and primary literature.

For EACH hypothesis:
- \`falsifiableTest\` MUST name BOTH a concrete observable/measurable outcome AND an explicit condition that would count against / refute the hypothesis (e.g., "FAIL if ...").
- \`um41aDefeater\` MUST state a specific UM-4.1a defeater condition or regime that would falsify or defeat the hypothesis.
- List 2 to 3 explicit premises in \`premises\`. Only mark \`verified: true\` if that premise is an established theorem/observation clearly grounded in the cited literature; mark speculative, extrapolated, or unverified premises as \`verified: false\`.
- Provide a \`searchQuery\` to verify literature grounding.
- Only list \`matchedCitationIndices\` referencing indices (0-based) from the Grounded Literature list above that genuinely support that hypothesis (leave empty [] if the hypothesis is ungrounded/speculative).
- Declare honest UM-1 \`independence\` (I0..I3) and \`verificationRung\` (0..3).`;

      const genResponse = await ai.models.generateContent({
        model: MODEL_ID,
        contents: generationPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hypotheses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    persona: { type: Type.STRING },
                    title: { type: Type.STRING },
                    statement: { type: Type.STRING },
                    mechanism: { type: Type.STRING },
                    falsifiableTest: { type: Type.STRING },
                    invariantFirstCheck: { type: Type.STRING },
                    um41aDefeater: { type: Type.STRING },
                    domain: { type: Type.STRING },
                    independence: { type: Type.STRING },
                    verificationRung: { type: Type.INTEGER },
                    searchQuery: { type: Type.STRING },
                    matchedCitationIndices: {
                      type: Type.ARRAY,
                      items: { type: Type.INTEGER },
                    },
                    premises: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          kind: { type: Type.STRING },
                          statement: { type: Type.STRING },
                          sourceCitation: { type: Type.STRING },
                          verified: { type: Type.BOOLEAN },
                        },
                        required: ['kind', 'statement', 'sourceCitation', 'verified'],
                      },
                    },
                  },
                  required: [
                    'persona',
                    'title',
                    'statement',
                    'mechanism',
                    'falsifiableTest',
                    'invariantFirstCheck',
                    'um41aDefeater',
                    'domain',
                    'independence',
                    'verificationRung',
                    'premises',
                  ],
                },
              },
            },
            required: ['hypotheses'],
          },
        },
      });

      const parsed = JSON.parse(genResponse.text || '{"hypotheses":[]}') as {
        hypotheses?: Array<{
          persona: string;
          title: string;
          statement: string;
          mechanism: string;
          falsifiableTest: string;
          invariantFirstCheck: string;
          um41aDefeater?: string;
          domain: string;
          independence: string;
          verificationRung: number;
          searchQuery?: string;
          matchedCitationIndices?: number[];
          premises?: Array<{
            kind: string;
            statement: string;
            sourceCitation: string;
            verified: boolean;
          }>;
        }>;
      };

      const rawHyps = Array.isArray(parsed.hypotheses)
        ? parsed.hypotheses.slice(0, 4)
        : [];

      if (rawHyps.length < 2) {
        return NextResponse.json(
          { error: 'Model returned fewer than 2 competing hypotheses.' },
          { status: 502 }
        );
      }

      // Enrich per-hypothesis Google Search grounding and verify candidate URIs exclusively via confirmSource
      const hypotheses: ArenaHypothesis[] = await Promise.all(
        rawHyps.map(async (item, idx) => {
          const persona = normalizePersona(item.persona, idx);
          const id = `HYP-${idx + 1}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

          const matchedIndices = Array.isArray(item.matchedCitationIndices)
            ? item.matchedCitationIndices
            : [];
          let candidateCitations: ArenaCitation[] = matchedIndices
            .map((ci) => goalGrounding.citations[ci])
            .filter((c): c is ArenaCitation => Boolean(c));

          if (candidateCitations.length === 0 && item.searchQuery && item.searchQuery.trim()) {
            const perHypGrounding = await fetchGoogleSearchCitations(
              ai,
              item.searchQuery.trim()
            );
            candidateCitations = perHypGrounding.citations.slice(0, 3);
          }

          // Server-side UM-2.4b confirmer: ONLY sources returning HTTP 200 + text support become verified: true
          const confirmedCitations = await confirmCandidateCitations(
            candidateCitations,
            item.statement
          );

          const premises: ArenaPremiseItem[] = (item.premises || []).map((p, pIdx) => ({
            id: `PRM-${idx + 1}-${pIdx + 1}`,
            kind: normalizeNodeKind(p.kind),
            statement: p.statement,
            sourceCitation: p.sourceCitation || 'Unspecified',
            verified: Boolean(p.verified),
          }));

          return {
            id,
            persona,
            title: item.title,
            statement: item.statement,
            mechanism: item.mechanism,
            falsifiableTest: item.falsifiableTest,
            invariantFirstCheck: item.invariantFirstCheck,
            um41aDefeater: item.um41aDefeater || '',
            domain: item.domain || 'Frontier Research',
            independence: normalizeIndependence(item.independence),
            verificationRung: clampRung(item.verificationRung),
            premises,
            citations: confirmedCitations,
            elo: 1500,
            wins: 0,
            losses: 0,
            draws: 0,
            isWorkedExample: false,
          };
        })
      );

      const matchups = buildRoundRobinMatchups(hypotheses);

      return NextResponse.json({
        researchGoal: cleanGoal,
        hypotheses,
        matchups,
        modelUsed: `${MODEL_ID} + Google Search + UM-2.4b Confirmer`,
      });
    }

    if (action === 'judge') {
      const { researchGoal, hypothesisA, hypothesisB } = body as {
        researchGoal: string;
        hypothesisA: ArenaHypothesis;
        hypothesisB: ArenaHypothesis;
      };

      if (!hypothesisA || !hypothesisB) {
        return NextResponse.json(
          { error: 'Both hypothesisA and hypothesisB are required for judging.' },
          { status: 400 }
        );
      }

      const judgePrompt = `You are the UM-1 Scientific Tournament Judge evaluating two competing hypotheses for the research goal:
"${researchGoal}"

Score BOTH hypotheses strictly on a 0.0 to 10.0 scale across 5 criteria:
1. novelty (0-10)
2. plausibility (0-10)
3. testability (0-10) — MUST score 0 if falsifiableTest lacks an observable outcome or explicit refuting condition
4. evidenceSupport (0-10)
5. defeater (0-10) — rigor of the UM-4.1a defeater / counterexample boundary (0 if missing/vacuous)

CRITICAL UM-1 EPISTEMIC RULES:
- If a hypothesis has 0 literature citations (UNGROUNDED), its \`evidenceSupport\` score MUST NOT exceed 2.0.
- Unconfirmed citations (verified=false) carry significantly lower evidenceWeight than HTTP-200 UM-2.4b verified citations.
- If a hypothesis contains any premise marked verified=false (NOT VERIFIED), penalize \`evidenceSupport\` (<= 4.5) and \`plausibility\`.
- Never reward vacuous falsifiability statements or ungrounded speculation.

Hypothesis A (${hypothesisA.persona} — "${hypothesisA.title}"):
- Statement: ${hypothesisA.statement}
- Mechanism: ${hypothesisA.mechanism}
- Falsifiable Test: ${hypothesisA.falsifiableTest}
- Invariant-First Check: ${hypothesisA.invariantFirstCheck}
- UM-4.1a Defeater: ${hypothesisA.um41aDefeater || 'NONE STATED'}
- Citations (${hypothesisA.citations.length}): ${
        hypothesisA.citations
          .map((c) => `${c.title} [${c.uri}] (${c.verified ? 'UM-2.4b VERIFIED' : 'UNCONFIRMED'})`)
          .join('; ') || 'NONE (UNGROUNDED)'
      }
- Premises: ${hypothesisA.premises
        .map((p) => `[${p.verified ? 'VERIFIED' : 'NOT VERIFIED'}] ${p.statement}`)
        .join(' | ')}

Hypothesis B (${hypothesisB.persona} — "${hypothesisB.title}"):
- Statement: ${hypothesisB.statement}
- Mechanism: ${hypothesisB.mechanism}
- Falsifiable Test: ${hypothesisB.falsifiableTest}
- Invariant-First Check: ${hypothesisB.invariantFirstCheck}
- UM-4.1a Defeater: ${hypothesisB.um41aDefeater || 'NONE STATED'}
- Citations (${hypothesisB.citations.length}): ${
        hypothesisB.citations
          .map((c) => `${c.title} [${c.uri}] (${c.verified ? 'UM-2.4b VERIFIED' : 'UNCONFIRMED'})`)
          .join('; ') || 'NONE (UNGROUNDED)'
      }
- Premises: ${hypothesisB.premises
        .map((p) => `[${p.verified ? 'VERIFIED' : 'NOT VERIFIED'}] ${p.statement}`)
        .join(' | ')}

Provide a concise, plain-language \`judgeSummary\` explaining why the winner (or draw) prevailed across these 5 criteria.`;

      const judgeResponse = await ai.models.generateContent({
        model: MODEL_ID,
        contents: judgePrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scoresA: {
                type: Type.OBJECT,
                properties: {
                  novelty: { type: Type.NUMBER },
                  plausibility: { type: Type.NUMBER },
                  testability: { type: Type.NUMBER },
                  evidenceSupport: { type: Type.NUMBER },
                  defeater: { type: Type.NUMBER },
                },
                required: ['novelty', 'plausibility', 'testability', 'evidenceSupport', 'defeater'],
              },
              scoresB: {
                type: Type.OBJECT,
                properties: {
                  novelty: { type: Type.NUMBER },
                  plausibility: { type: Type.NUMBER },
                  testability: { type: Type.NUMBER },
                  evidenceSupport: { type: Type.NUMBER },
                  defeater: { type: Type.NUMBER },
                },
                required: ['novelty', 'plausibility', 'testability', 'evidenceSupport', 'defeater'],
              },
              judgeSummary: { type: Type.STRING },
            },
            required: ['scoresA', 'scoresB', 'judgeSummary'],
          },
        },
      });

      const parsedJudge = JSON.parse(judgeResponse.text || '{}') as {
        scoresA?: ArenaCriterionScores;
        scoresB?: ArenaCriterionScores;
        judgeSummary?: string;
      };

      const sanitizeScores = (
        s: Partial<ArenaCriterionScores> | undefined,
        hyp: ArenaHypothesis
      ): ArenaCriterionScores => {
        const hasUnverified = hyp.premises.some((p) => !p.verified);
        const isUngrounded = hyp.citations.length === 0;
        const hasConfirmedSource = hyp.citations.some((c) => c.verified === true);
        const falsEval = evaluateFalsifiabilityCriterion(hyp.falsifiableTest, hyp.statement);
        const defEval = evaluateDefeaterCriterion(hyp.um41aDefeater);

        let ev = clampScore(s?.evidenceSupport ?? 5);
        if (isUngrounded) ev = 0;
        else if (!hasConfirmedSource) ev = Math.min(ev, 4.5);
        if (hasUnverified) ev = Math.min(ev, 4.2);

        return {
          novelty: clampScore(s?.novelty ?? 5),
          plausibility: clampScore(s?.plausibility ?? 5),
          testability: falsEval.score === 0 ? 0 : clampScore(s?.testability ?? 5),
          evidenceSupport: ev,
          defeater: defEval === 0 ? 0 : clampScore(s?.defeater ?? 5),
        };
      };

      return NextResponse.json({
        scoresA: sanitizeScores(parsedJudge.scoresA, hypothesisA),
        scoresB: sanitizeScores(parsedJudge.scoresB, hypothesisB),
        judgeSummary:
          parsedJudge.judgeSummary ||
          'Evaluated on novelty, plausibility, testability, UM-1 evidence support, and UM-4.1a defeaters.',
      });
    }

    return NextResponse.json({ error: 'Unsupported Arena action.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to execute Hypothesis Arena request.',
      },
      { status: 500 }
    );
  }
}
