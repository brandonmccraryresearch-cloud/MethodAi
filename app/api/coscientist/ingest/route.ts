import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export interface IngestedSourceMetadata {
  sourceType: 'github' | 'arxiv' | 'pdf' | 'text';
  identifier: string;
  title: string;
  rawExcerpt: string;
  url?: string;
}

export interface AutoFillExtractionPayload {
  sourceSummary: {
    sourceType: 'github' | 'arxiv' | 'pdf' | 'text';
    title: string;
    citation: string;
    detectedDomain: string;
  };
  researchGoal: string;
  programmeSlug: string;
  suggestedSearchQuery: string;
  manuscriptExcerpt: string;
  claimDraft: {
    title: string;
    domain: string;
    track: 'F' | 'E';
    tier: 'Lite' | 'Standard' | 'Full';
    recordLabel: '[MV]' | '[D]' | '[C]';
    independence: 'I0' | 'I1' | 'I2' | 'I3' | 'I4';
    independenceBoundary: string;
    noveltyBudget: 'independently_motivated' | 'weakly_motivated' | 'introduced_to_fit';
    predictionClass: 'prediction' | 'accommodation' | 'retrodiction' | 'exploratory finding';
    verificationRung: 0 | 1 | 2 | 3 | 4 | 5;
    target: string;
    source: string;
    uncertainty: string;
    priorLiterature: string;
    dataSplits: string;
    replicationPlan: string;
    question: string;
    motivation: string;
    falsifiablePrediction: string;
    method: string;
    successFailureCriteria: string;
    oneSidednessPass: string;
    oneSidednessFail: string;
    computeBudget: string;
    killCriterion: string;
    invariantFirstNote: string;
    spendCapUsd: number;
    howCouldThisBeWrong: string;
  };
  premiseItems: Array<{
    kind: 'observation' | 'choice' | 'assumption' | 'primary_transcription';
    statement: string;
    sourceCitation: string;
    independentlyRederived: boolean;
    isLeafTranscription: boolean;
    hasSupportingVerdict: boolean;
  }>;
  rungStageNotes: {
    rung0Statement: string;
    rung1Source: string;
    rung2Machine: string;
  };
}

function parseArxivId(input: string): string | null {
  const trimmed = input.trim();
  const absMatch = trimmed.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v\d+)?|[a-z\-]+\/[0-9]{7})/i);
  if (absMatch) return absMatch[1].replace(/\.pdf$/i, '');
  const prefixMatch = trimmed.match(/^arxiv:\s*([0-9]{4}\.[0-9]{4,5}(?:v\d+)?|[a-z\-]+\/[0-9]{7})$/i);
  if (prefixMatch) return prefixMatch[1];
  const bareMatch = trimmed.match(/^([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)$/);
  if (bareMatch) return bareMatch[1];
  return null;
}

function parseGithubRepo(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\/+$/, '');
  const urlMatch = trimmed.match(/github\.com\/([A-Za-z0-9_.\-]+)\/([A-Za-z0-9_.\-]+)/i);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/i, '') };
  }
  const slugMatch = trimmed.match(/^([A-Za-z0-9_.\-]+)\/([A-Za-z0-9_.\-]+)$/);
  if (slugMatch && !trimmed.includes('.org') && !trimmed.includes('arxiv')) {
    return { owner: slugMatch[1], repo: slugMatch[2] };
  }
  return null;
}

async function fetchArxivMetadata(arxivId: string): Promise<IngestedSourceMetadata> {
  const apiUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`;
  try {
    const res = await fetch(apiUrl, { headers: { 'User-Agent': 'aistudio-build' } });
    const xml = await res.text();

    const entryBlock = xml.split('<entry>')[1] || xml;
    const titleMatch = entryBlock.match(/<title>([\s\S]*?)<\/title>/i);
    const summaryMatch = entryBlock.match(/<summary>([\s\S]*?)<\/summary>/i);
    const authorMatches = [...entryBlock.matchAll(/<name>([\s\S]*?)<\/name>/gi)].map((m) =>
      m[1].trim()
    );
    const categoryMatch = entryBlock.match(/<arxiv:primary_category[^>]*term="([^"]+)"/i);

    const title = titleMatch
      ? titleMatch[1].replace(/\s+/g, ' ').trim()
      : `arXiv:${arxivId}`;
    const summary = summaryMatch
      ? summaryMatch[1].replace(/\s+/g, ' ').trim()
      : '';
    const authors = authorMatches.slice(0, 6).join(', ');
    const category = categoryMatch ? categoryMatch[1] : 'STEM';

    const rawExcerpt = [
      `arXiv ID: arXiv:${arxivId}`,
      `URL: https://arxiv.org/abs/${arxivId}`,
      `Title: ${title}`,
      authors ? `Authors: ${authors}` : '',
      `Primary Category: ${category}`,
      summary ? `Abstract:\n${summary}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      sourceType: 'arxiv',
      identifier: `arXiv:${arxivId}`,
      title,
      rawExcerpt,
      url: `https://arxiv.org/abs/${arxivId}`,
    };
  } catch {
    return {
      sourceType: 'arxiv',
      identifier: `arXiv:${arxivId}`,
      title: `arXiv Preprint ${arxivId}`,
      rawExcerpt: `arXiv ID: arXiv:${arxivId}\nURL: https://arxiv.org/abs/${arxivId}`,
      url: `https://arxiv.org/abs/${arxivId}`,
    };
  }
}

async function fetchGithubMetadata(owner: string, repo: string): Promise<IngestedSourceMetadata> {
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;

  let description = '';
  let language = '';
  let topics: string[] = [];
  let defaultBranch = 'main';
  let readmeText = '';
  let fileList: string[] = [];

  try {
    const [repoRes, readmeRes, contentsRes] = await Promise.all([
      fetch(repoUrl, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'aistudio-build',
        },
      }),
      fetch(readmeUrl, {
        headers: {
          Accept: 'application/vnd.github.raw+json',
          'User-Agent': 'aistudio-build',
        },
      }),
      fetch(contentsUrl, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'aistudio-build',
        },
      }),
    ]);

    if (repoRes.ok) {
      const repoJson = await repoRes.json();
      description = repoJson.description || '';
      language = repoJson.language || '';
      topics = Array.isArray(repoJson.topics) ? repoJson.topics : [];
      defaultBranch = repoJson.default_branch || 'main';
    }

    if (readmeRes.ok) {
      const rawReadme = await readmeRes.text();
      readmeText = rawReadme.slice(0, 12000);
    }

    if (contentsRes.ok) {
      const items = await contentsRes.json();
      if (Array.isArray(items)) {
        fileList = items
          .slice(0, 35)
          .map((item: { name?: string; type?: string }) => `${item.name} (${item.type})`);
      }
    }
  } catch {
    // Graceful fallback if rate-limited
  }

  const rawExcerpt = [
    `GitHub Repository: ${owner}/${repo}`,
    `URL: https://github.com/${owner}/${repo}`,
    description ? `Description: ${description}` : '',
    language ? `Primary Language: ${language}` : '',
    topics.length > 0 ? `Topics: ${topics.join(', ')}` : '',
    `Default Branch: ${defaultBranch}`,
    fileList.length > 0 ? `Repository Files: ${fileList.join(', ')}` : '',
    readmeText ? `README Content:\n${readmeText}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    sourceType: 'github',
    identifier: `${owner}/${repo}`,
    title: description ? `${owner}/${repo} — ${description}` : `${owner}/${repo}`,
    rawExcerpt,
    url: `https://github.com/${owner}/${repo}`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sourceType,
      urlOrIdentifier,
      fileName,
      fileContentText,
      pdfBase64,
    } = body as {
      sourceType?: 'github' | 'arxiv' | 'pdf' | 'text';
      urlOrIdentifier?: string;
      fileName?: string;
      fileContentText?: string;
      pdfBase64?: string;
    };

    let ingested: IngestedSourceMetadata;

    if (sourceType === 'arxiv' || (urlOrIdentifier && parseArxivId(urlOrIdentifier))) {
      const id = parseArxivId(urlOrIdentifier || '') || (urlOrIdentifier || '').trim();
      ingested = await fetchArxivMetadata(id);
    } else if (sourceType === 'github' || (urlOrIdentifier && parseGithubRepo(urlOrIdentifier))) {
      const parsed = parseGithubRepo(urlOrIdentifier || '');
      if (!parsed) {
        return NextResponse.json(
          { error: 'Please provide a valid GitHub repository URL (e.g. https://github.com/owner/repo) or owner/repo.' },
          { status: 400 }
        );
      }
      ingested = await fetchGithubMetadata(parsed.owner, parsed.repo);
    } else if (sourceType === 'pdf' && pdfBase64) {
      ingested = {
        sourceType: 'pdf',
        identifier: fileName || 'uploaded-paper.pdf',
        title: (fileName || 'Uploaded Scientific PDF').replace(/\.pdf$/i, ''),
        rawExcerpt: fileContentText || `PDF Document: ${fileName || 'document.pdf'}`,
      };
    } else if (fileContentText && fileContentText.trim()) {
      ingested = {
        sourceType: 'text',
        identifier: fileName || 'uploaded-document.txt',
        title: (fileName || 'Uploaded Research Document').replace(/\.[a-z0-9]+$/i, ''),
        rawExcerpt: fileContentText.slice(0, 24000),
      };
    } else {
      return NextResponse.json(
        { error: 'Provide a GitHub repo link, arXiv paper link/ID, PDF upload, or text/LaTeX/Markdown file.' },
        { status: 400 }
      );
    }

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

        const extractionPrompt = `You are the Google Co-Scientist UM-1 Ingestion & Auto-Fill Agent.
Analyze the following ingested research source (${ingested.sourceType.toUpperCase()}: "${ingested.identifier}") and return a JSON object with keys:
- researchGoal (string)
- programmeSlug (string)
- suggestedSearchQuery (string)
- manuscriptExcerpt (string)
- claimDraft: { title, domain, track ("F" or "E"), tier ("Lite"|"Standard"|"Full"), recordLabel ("[MV]"|"[D]"|"[C]"), independence ("I0".."I4"), independenceBoundary, noveltyBudget, predictionClass, verificationRung (0..5), target, source, uncertainty, priorLiterature, dataSplits, replicationPlan, question, motivation, falsifiablePrediction, method, successFailureCriteria, oneSidednessPass, oneSidednessFail, computeBudget, killCriterion, invariantFirstNote, spendCapUsd (number 1..300), howCouldThisBeWrong }
- premiseItems: Array of { kind ("observation"|"choice"|"assumption"|"primary_transcription"), statement, sourceCitation, independentlyRederived (boolean), isLeafTranscription (boolean), hasSupportingVerdict (boolean) }
- rungStageNotes: { rung0Statement, rung1Source, rung2Machine }

Source Metadata & Content:
${ingested.rawExcerpt.slice(0, 6000)}`;

        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
        if (ingested.sourceType === 'pdf' && pdfBase64) {
          parts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
            },
          });
        }
        parts.push({ text: extractionPrompt });

        const genPromise = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
          },
        });

        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 3500)
        );

        const response = await Promise.race([genPromise, timeoutPromise]);

        if (response) {
          const rawJson = (response.text ?? '').trim();
          if (rawJson) {
            const parsed = JSON.parse(rawJson);
            const normalized = normalizeExtractionPayload(parsed, ingested);
            return NextResponse.json({
              extraction: normalized,
              ingestedMetadata: ingested,
              agentModel: 'Co-Scientist Ingestion Agent (Gemini)',
            });
          }
        }
      } catch {
        // Fall through to deterministic source analyzer if API call fails or times out
      }
    }

    const fallbackExtraction = buildDeterministicExtraction(ingested);
    return NextResponse.json({
      extraction: fallbackExtraction,
      ingestedMetadata: ingested,
      agentModel: 'UM-1 Structured Source Parser',
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to ingest and parse source.',
      },
      { status: 500 }
    );
  }
}

function normalizeExtractionPayload(
  raw: Partial<AutoFillExtractionPayload>,
  ingested: IngestedSourceMetadata
): AutoFillExtractionPayload {
  const fallback = buildDeterministicExtraction(ingested);
  const d = raw.claimDraft || ({} as Partial<AutoFillExtractionPayload['claimDraft']>);
  const track: 'F' | 'E' = d.track === 'F' || d.track === 'E' ? d.track : fallback.claimDraft.track;
  const tier: 'Lite' | 'Standard' | 'Full' =
    d.tier === 'Lite' || d.tier === 'Standard' || d.tier === 'Full'
      ? d.tier
      : fallback.claimDraft.tier;
  const recordLabel: '[MV]' | '[D]' | '[C]' =
    d.recordLabel === '[MV]' || d.recordLabel === '[D]' || d.recordLabel === '[C]'
      ? d.recordLabel
      : fallback.claimDraft.recordLabel;
  const independence: 'I0' | 'I1' | 'I2' | 'I3' | 'I4' =
    d.independence === 'I0' ||
    d.independence === 'I1' ||
    d.independence === 'I2' ||
    d.independence === 'I3' ||
    d.independence === 'I4'
      ? d.independence
      : fallback.claimDraft.independence;

  const rungNum = Number(d.verificationRung ?? fallback.claimDraft.verificationRung);
  const verificationRung = (
    rungNum >= 0 && rungNum <= 5 ? rungNum : fallback.claimDraft.verificationRung
  ) as 0 | 1 | 2 | 3 | 4 | 5;

  return {
    sourceSummary: {
      sourceType: ingested.sourceType,
      title: d.title || ingested.title,
      citation: ingested.url || ingested.identifier,
      detectedDomain: d.domain || fallback.claimDraft.domain,
    },
    researchGoal: raw.researchGoal || fallback.researchGoal,
    programmeSlug:
      (raw.programmeSlug || fallback.programmeSlug)
        .toLowerCase()
        .replace(/[^a-z0-9\-]+/g, '-')
        .replace(/^-|-$/g, '') || 'ingested-programme',
    suggestedSearchQuery: raw.suggestedSearchQuery || fallback.suggestedSearchQuery,
    manuscriptExcerpt: raw.manuscriptExcerpt || fallback.manuscriptExcerpt,
    claimDraft: {
      title: d.title || fallback.claimDraft.title,
      domain: d.domain || fallback.claimDraft.domain,
      track,
      tier,
      recordLabel,
      independence,
      independenceBoundary: d.independenceBoundary || fallback.claimDraft.independenceBoundary,
      noveltyBudget:
        d.noveltyBudget === 'independently_motivated' ||
        d.noveltyBudget === 'weakly_motivated' ||
        d.noveltyBudget === 'introduced_to_fit'
          ? d.noveltyBudget
          : fallback.claimDraft.noveltyBudget,
      predictionClass:
        d.predictionClass === 'prediction' ||
        d.predictionClass === 'accommodation' ||
        d.predictionClass === 'retrodiction' ||
        d.predictionClass === 'exploratory finding'
          ? d.predictionClass
          : fallback.claimDraft.predictionClass,
      verificationRung,
      target: d.target || fallback.claimDraft.target,
      source: d.source || ingested.url || ingested.identifier,
      uncertainty: d.uncertainty || fallback.claimDraft.uncertainty,
      priorLiterature: d.priorLiterature || fallback.claimDraft.priorLiterature,
      dataSplits: d.dataSplits || fallback.claimDraft.dataSplits,
      replicationPlan: d.replicationPlan || fallback.claimDraft.replicationPlan,
      question: d.question || fallback.claimDraft.question,
      motivation: d.motivation || fallback.claimDraft.motivation,
      falsifiablePrediction: d.falsifiablePrediction || fallback.claimDraft.falsifiablePrediction,
      method: d.method || fallback.claimDraft.method,
      successFailureCriteria:
        d.successFailureCriteria || fallback.claimDraft.successFailureCriteria,
      oneSidednessPass: d.oneSidednessPass || fallback.claimDraft.oneSidednessPass,
      oneSidednessFail: d.oneSidednessFail || fallback.claimDraft.oneSidednessFail,
      computeBudget: d.computeBudget || fallback.claimDraft.computeBudget,
      killCriterion: d.killCriterion || fallback.claimDraft.killCriterion,
      invariantFirstNote: d.invariantFirstNote || fallback.claimDraft.invariantFirstNote,
      spendCapUsd:
        typeof d.spendCapUsd === 'number' && d.spendCapUsd >= 1 && d.spendCapUsd <= 300
          ? Math.round(d.spendCapUsd)
          : fallback.claimDraft.spendCapUsd,
      howCouldThisBeWrong: d.howCouldThisBeWrong || fallback.claimDraft.howCouldThisBeWrong,
    },
    premiseItems:
      Array.isArray(raw.premiseItems) && raw.premiseItems.length > 0
        ? raw.premiseItems.map((p) => ({
            kind:
              p.kind === 'observation' ||
              p.kind === 'choice' ||
              p.kind === 'assumption' ||
              p.kind === 'primary_transcription'
                ? p.kind
                : 'primary_transcription',
            statement: p.statement || `Extracted premise from ${ingested.identifier}`,
            sourceCitation: p.sourceCitation || ingested.url || ingested.identifier,
            independentlyRederived: Boolean(p.independentlyRederived),
            isLeafTranscription: Boolean(p.isLeafTranscription),
            hasSupportingVerdict: Boolean(p.hasSupportingVerdict),
          }))
        : fallback.premiseItems,
    rungStageNotes: {
      rung0Statement:
        raw.rungStageNotes?.rung0Statement || fallback.rungStageNotes.rung0Statement,
      rung1Source: raw.rungStageNotes?.rung1Source || fallback.rungStageNotes.rung1Source,
      rung2Machine: raw.rungStageNotes?.rung2Machine || fallback.rungStageNotes.rung2Machine,
    },
  };
}

function buildDeterministicExtraction(
  ingested: IngestedSourceMetadata
): AutoFillExtractionPayload {
  const text = ingested.rawExcerpt;
  const lower = text.toLowerCase();

  // Detect LaTeX / Markdown / theorem structures if present
  const latexTitleMatch = text.match(/\\title\{([^}]+)\}/i);
  const mdHeadingMatch = text.match(/^#\s+(.+)$/m);
  const abstractMatch =
    text.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/i) ||
    text.match(/Abstract:\s*([\s\S]{20,1200})/i);
  const theoremMatch = text.match(/\\begin\{(?:theorem|lemma|proposition)\}([\s\S]*?)\\end\{(?:theorem|lemma|proposition)\}/i);

  const extractedTitle = (
    latexTitleMatch?.[1] ||
    mdHeadingMatch?.[1] ||
    ingested.title ||
    ingested.identifier
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

  const isDeductive =
    lower.includes('theorem') ||
    lower.includes('lemma') ||
    lower.includes('lean') ||
    lower.includes('coq') ||
    lower.includes('proof') ||
    lower.includes('symbolic') ||
    lower.includes('\\begin{theorem}');

  const track: 'F' | 'E' = isDeductive ? 'F' : 'E';
  const domain = isDeductive
    ? 'Formal & Mathematical Sciences'
    : lower.includes('neural') || lower.includes('transformer') || lower.includes('learning')
      ? 'Machine Learning & Empirical Systems'
      : 'Computational Science & Engineering';

  const summarySentence = (
    abstractMatch?.[1] ||
    theoremMatch?.[1] ||
    text.split('\n').filter((l) => l.trim().length > 30)[0] ||
    extractedTitle
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320);

  const sourceCitation = ingested.url || ingested.identifier;
  const slug =
    extractedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 36) || 'ingested-study';

  return {
    sourceSummary: {
      sourceType: ingested.sourceType,
      title: extractedTitle,
      citation: sourceCitation,
      detectedDomain: domain,
    },
    researchGoal: `Verify and audit the primary claims and methodology of "${extractedTitle}" (${ingested.identifier}) under UM-1 protocol.`,
    programmeSlug: slug,
    suggestedSearchQuery: `${extractedTitle} ${ingested.identifier}`,
    manuscriptExcerpt: summarySentence,
    claimDraft: {
      title: extractedTitle,
      domain,
      track,
      tier: 'Standard',
      recordLabel: track === 'F' ? '[D]' : '[C]',
      independence: ingested.sourceType === 'github' ? 'I2' : 'I1',
      independenceBoundary:
        ingested.sourceType === 'github'
          ? `Repository codebase (${ingested.identifier}) audited against independent validation script`
          : `Primary source (${ingested.identifier}) re-derived from stated equations/protocol`,
      noveltyBudget: 'independently_motivated',
      predictionClass: 'prediction',
      verificationRung: 1,
      target: theoremMatch
        ? `Formal statement verification: ${theoremMatch[1].replace(/\s+/g, ' ').trim().slice(0, 180)}`
        : `Primary measurable target and bounds reported in ${extractedTitle}`,
      source: sourceCitation,
      uncertainty:
        track === 'F'
          ? 'Exact symbolic / formal derivation (zero floating-point approximation)'
          : 'Reported confidence intervals and seed variance across held-out evaluation splits',
      priorLiterature: `${sourceCitation} (${ingested.sourceType.toUpperCase()} source ingestion)`,
      dataSplits:
        track === 'F'
          ? 'Exhaustive domain / parameter family partition declared in source'
          : 'Frozen calibration / validation / held-out evaluation split from source protocol',
      replicationPlan:
        ingested.sourceType === 'github'
          ? `Execute headless reproducibility workflow from ${sourceCitation} and cross-check outputs with independent verifier`
          : `Re-implement primary derivation/experiment from ${sourceCitation} in deterministic run.py`,
      question: `Does the core claim in "${extractedTitle}" hold under independent UM-1 re-derivation and boundary stress testing?`,
      motivation: `Ingested from ${ingested.identifier}: "${summarySentence.slice(0, 180)}"`,
      falsifiablePrediction:
        track === 'F'
          ? `Independent symbolic/kernel check reproduces the exact invariant and theorem conclusion of ${ingested.identifier}`
          : `Independent replication reproduces the target metric within stated uncertainty bounds of ${ingested.identifier}`,
      method:
        ingested.sourceType === 'github'
          ? `Inspect repository scripts in ${ingested.identifier}, run smoke tests (P2), and execute independent verification route`
          : `Extract primary equations/protocol from ${ingested.identifier}, re-derive leaf transcriptions (UM-4.4), and run deterministic validation`,
      successFailureCriteria:
        'PASS if independent re-derivation matches source target within declared tolerance; FAIL if counterexample or transcription discrepancy is found.',
      oneSidednessPass: `Confirms survival of "${extractedTitle}" on the tested domain and closes P1/P3 source-complete verification.`,
      oneSidednessFail: `Exhibits an explicit counterexample, un-re-derived transcription gap, or boundary breakdown in ${ingested.identifier}.`,
      computeBudget: '2 CPU/GPU hours max for initial replication and invariant check',
      killCriterion: 'Abort run if primary invariant check fails at Rung 1/2 or memory exceeds 16 GB.',
      invariantFirstNote: `First verify dimensional consistency, boundary case (N=1 / zero-coupling), and primary conservation invariant from ${ingested.identifier}.`,
      spendCapUsd: 40,
      howCouldThisBeWrong: `Potential unstated assumption or un-re-derived leaf transcription in ${ingested.identifier}; requires independent re-derivation under UM-4.4.`,
    },
    premiseItems: [
      {
        kind: 'primary_transcription',
        statement: `Primary statement / abstract transcription from ${ingested.identifier}: "${summarySentence.slice(0, 160)}"`,
        sourceCitation,
        independentlyRederived: false,
        isLeafTranscription: true,
        hasSupportingVerdict: true,
      },
      {
        kind: 'assumption',
        statement: `Boundary and domain regularity conditions assumed in ${extractedTitle}`,
        sourceCitation,
        independentlyRederived: true,
        isLeafTranscription: false,
        hasSupportingVerdict: true,
      },
    ],
    rungStageNotes: {
      rung0Statement: `Statement extracted from ${ingested.identifier}; verify index directions and quantifiers before freeze.`,
      rung1Source: `Source ${sourceCitation} ingested; check closing remarks and verify leaf transcriptions under UM-4.4.`,
      rung2Machine: `Configure deterministic headless script with fixed seeds to test the primary invariant of ${ingested.identifier}.`,
    },
  };
}
