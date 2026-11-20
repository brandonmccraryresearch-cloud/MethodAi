import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildCorpusSynthesisAndDiscoveries,
  type CorpusSynthesisReport,
  type CrossDomainPatternBridge,
} from '@/lib/frontier-discovery';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sources?: Array<{
        id: string;
        sourceType: string;
        identifier: string;
        title: string;
        domain?: string;
        excerpt?: string;
      }>;
      researchGoal?: string;
      crossDomainTarget?: string;
    };

    const sources = Array.isArray(body.sources) ? body.sources : [];
    const researchGoal = body.researchGoal || '';
    const crossDomainTarget = body.crossDomainTarget || '';

    const baseReport = buildCorpusSynthesisAndDiscoveries(sources, researchGoal);

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            timeout: 4500,
            headers: { 'User-Agent': 'aistudio-build' },
          },
        });

        const corpusContext =
          sources.length > 0
            ? sources
                .map(
                  (s, idx) =>
                    `[${idx + 1}] (${s.sourceType.toUpperCase()}) ${s.identifier}: "${s.title}" — ${
                      s.excerpt || ''
                    }`
                )
                .join('\n')
            : 'Default Frontier Corpus: Arithmetic Geometry, Commutative Algebra (Singular), and Formal Verification (Lean 4).';

        const prompt = `You are the Google Co-Scientist Literature Synthesis & Cross-Domain Pattern Recognition Agent under Unified Methodology UM-1.
Synthesize the following Study Corpus and identify structural isomorphisms, shared mathematical invariants, and dictionary reformulations (UM-2.6 Lens 6) across domains.

Research Objective: ${researchGoal || 'Frontier cross-domain discovery and formal verification'}
Cross-Domain Focus: ${crossDomainTarget || 'Commutative Algebra (Singular) <-> Formal Type Theory (Lean 4) <-> Exact Symbolic Dynamics (Python)'}
Study Corpus:
${corpusContext}

Return a JSON object with:
- executiveSynthesis (string)
- consensusFoundations: Array of { statement, supportingSources (string[]), verificationStatus }
- openObstructions: Array of { obstruction, affectedSources (string[]), proposedResolutionRoute }
- sharedInvariants: Array of { invariantName, mathematicalForm, occurrencesAcrossCorpus }
- crossDomainBridge: { title, sourceDomain, targetDomain, structuralIsomorphism, sharedInvariant, um1LensApplied, falsifiableConjecture, oneSidednessPass, oneSidednessFail, dictionaryMapping: Array of { domainAConcept, domainBConcept, invariantPreserved } }`;

        const genPromise = ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
          },
        });

        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 4200)
        );

        const response = await Promise.race([genPromise, timeoutPromise]);
        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          const mergedBridges: CrossDomainPatternBridge[] = [...baseReport.crossDomainBridges];

          if (parsed.crossDomainBridge && parsed.crossDomainBridge.title) {
            const b = parsed.crossDomainBridge;
            mergedBridges.unshift({
              id: `BRIDGE-AI-${Date.now()}`,
              title: b.title,
              sourceDomain: b.sourceDomain || baseReport.crossDomainBridges[0].sourceDomain,
              targetDomain: b.targetDomain || baseReport.crossDomainBridges[0].targetDomain,
              sourceCorpusIds: sources.map((s) => s.identifier).slice(0, 3),
              structuralIsomorphism:
                b.structuralIsomorphism || baseReport.crossDomainBridges[0].structuralIsomorphism,
              sharedInvariant:
                b.sharedInvariant || baseReport.crossDomainBridges[0].sharedInvariant,
              um1LensApplied:
                b.um1LensApplied || 'L6 Reformulation/Dictionary + L3 Invariant-First',
              dictionaryMapping:
                Array.isArray(b.dictionaryMapping) && b.dictionaryMapping.length > 0
                  ? b.dictionaryMapping
                  : baseReport.crossDomainBridges[0].dictionaryMapping,
              falsifiableConjecture:
                b.falsifiableConjecture || baseReport.crossDomainBridges[0].falsifiableConjecture,
              oneSidednessPass:
                b.oneSidednessPass || baseReport.crossDomainBridges[0].oneSidednessPass,
              oneSidednessFail:
                b.oneSidednessFail || baseReport.crossDomainBridges[0].oneSidednessFail,
              lean4Template: baseReport.crossDomainBridges[0].lean4Template,
              singularTemplate: baseReport.crossDomainBridges[0].singularTemplate,
              pythonTemplate: baseReport.crossDomainBridges[0].pythonTemplate,
            });
          }

          const enrichedReport: CorpusSynthesisReport = {
            ...baseReport,
            executiveSynthesis: parsed.executiveSynthesis || baseReport.executiveSynthesis,
            consensusFoundations:
              Array.isArray(parsed.consensusFoundations) && parsed.consensusFoundations.length > 0
                ? parsed.consensusFoundations
                : baseReport.consensusFoundations,
            openObstructions:
              Array.isArray(parsed.openObstructions) && parsed.openObstructions.length > 0
                ? parsed.openObstructions
                : baseReport.openObstructions,
            sharedInvariants:
              Array.isArray(parsed.sharedInvariants) && parsed.sharedInvariants.length > 0
                ? parsed.sharedInvariants
                : baseReport.sharedInvariants,
            crossDomainBridges: mergedBridges,
            agentModel: 'gemini-4-hydrogen (Cross-Domain Discovery Agent)',
          };

          return NextResponse.json({ report: enrichedReport });
        }
      } catch {
        // Fall through to deterministic synthesis
      }
    }

    return NextResponse.json({ report: baseReport });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to synthesize study corpus.',
      },
      { status: 500 }
    );
  }
}
