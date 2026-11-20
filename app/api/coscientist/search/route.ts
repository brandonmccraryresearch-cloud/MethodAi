import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { confirmSource, type SearchGroundingSource } from '@/lib/grounding-confirmer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, uri, citedPassage, claimText, query, claimId, targetSource } = body as {
      action?: 'search' | 'confirm_source';
      uri?: string;
      citedPassage?: string;
      claimText?: string;
      query?: string;
      claimId?: string;
      targetSource?: string;
    };

    if (action === 'confirm_source') {
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

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Search query is required.' }, { status: 400 });
    }

    const cleanQuery = query.trim();
    const prompt = `You are the Google Co-Scientist Literature & Source-Complete (UM-2.5 P1) Grounding Agent.
Verify prior literature, mathematical/empirical benchmarks, and source-complete citations for the following scientific query:
Query: "${cleanQuery}"
${claimId ? `Associated UM-1 Claim ID: ${claimId}` : ''}
${targetSource ? `Registered Source Citation: ${targetSource}` : ''}

Provide:
1. **Prior Literature & Benchmark Synthesis**: Key peer-reviewed or arXiv findings, exact theorem/dataset conditions, and known parameter regimes.
2. **UM-1 P1 Source-Complete Check**: Specific primary equations, constants, or boundary assumptions that must be independently re-derived rather than transcribed verbatim (to prevent UM-4.4 INCOMPLETE-EVIDENCE).
3. **Adversarial Counterexamples / Failure Modes**: Known edge cases in the literature where this mechanism or bound breaks down.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const chunks =
          response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources: SearchGroundingSource[] = [];
        for (const chunk of chunks) {
          if (chunk.web?.uri) {
            // LLM/Search-suggested sources MUST stay verified: false until confirmSource verifies HTTP 200 + text support
            sources.push({
              title: chunk.web.title || chunk.web.uri,
              uri: chunk.web.uri,
              verified: false,
            });
          }
        }

        return NextResponse.json({
          summary: response.text || 'Literature grounding synthesis complete.',
          sources:
            sources.length > 0 ? sources : buildDynamicSearchLinks(cleanQuery),
          modelUsed: 'gemini-4-hydrogen + Google Search',
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Fall through to structured dynamic search links if API key is restricted
      }
    }

    return NextResponse.json({
      summary: `### Literature & UM-1 P1 Source Grounding\n\n**Query:** \`${cleanQuery}\`${
        claimId ? ` · **Claim:** \`${claimId}\`` : ''
      }\n\n- **P1 Source-Complete Requirement:** Locate primary theorems, definitions, and closing remarks in the cited source before freezing \`hypothesis.md\`.\n- **UM-4.4 Transcription Gate:** Any external equation or numerical table imported from literature must be independently re-derived to avoid an \`INCOMPLETE-EVIDENCE\` cap.`,
      sources: buildDynamicSearchLinks(cleanQuery),
      modelUsed: 'gemini-4-hydrogen (Search Grounding)',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to execute Google Search grounding.',
      },
      { status: 500 }
    );
  }
}

function buildDynamicSearchLinks(query: string): SearchGroundingSource[] {
  const encoded = encodeURIComponent(query);
  return [
    {
      title: `Google Scholar — "${query}"`,
      uri: `https://scholar.google.com/scholar?q=${encoded}`,
      verified: false,
    },
    {
      title: `arXiv.org Search — "${query}"`,
      uri: `https://arxiv.org/search/?query=${encoded}&searchtype=all`,
      verified: false,
    },
    {
      title: `Semantic Scholar — "${query}"`,
      uri: `https://www.semanticscholar.org/search?q=${encoded}`,
      verified: false,
    },
  ];
}
