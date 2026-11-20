import { createHash } from 'node:crypto';

export interface SearchGroundingSource {
  title: string;
  uri: string;
  verified: false;
}

export interface UM24bQuote {
  verbatimPassage: string;
  uri: string;
  retrievedAt: string;
  httpStatus: number;
  sha256: string;
}

export interface ConfirmSourceResult {
  verified: boolean;
  uri: string;
  httpStatus?: number;
  retrievedAt: string;
  reason: string;
  um24bQuote: UM24bQuote | null;
}

export type SourceFetcher = (
  input: string,
  init?: RequestInit
) => Promise<{
  status: number;
  text: () => Promise<string>;
}>;

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'over',
  'under',
  'are',
  'was',
  'were',
  'have',
  'has',
  'not',
  'but',
  'can',
  'may',
  'all',
  'any',
  'use',
  'using',
  'via',
]);

function stripHtmlToPlainText(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSignificant(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9_]{3,}/g) || [];
  const unique = new Set<string>();
  for (const tok of matches) {
    if (!STOPWORDS.has(tok)) unique.add(tok);
  }
  return Array.from(unique);
}

function extractSupportingPassage(
  documentText: string,
  citedPassage: string,
  claimText?: string
): { supported: boolean; verbatimPassage: string; matchRatio: number } {
  const cleanDoc = documentText.replace(/\s+/g, ' ').trim();
  if (cleanDoc.length < 25) {
    return { supported: false, verbatimPassage: '', matchRatio: 0 };
  }

  const target = (citedPassage || '').trim();
  const fallbackClaim = (claimText || '').trim();
  const probe = target.length >= 10 ? target : fallbackClaim;
  if (!probe) {
    return { supported: false, verbatimPassage: '', matchRatio: 0 };
  }

  // 1. Direct case-insensitive verbatim substring check
  const lowerDoc = cleanDoc.toLowerCase();
  const lowerProbe = probe.toLowerCase();
  const directIdx = lowerDoc.indexOf(lowerProbe);
  if (directIdx !== -1) {
    const start = Math.max(0, directIdx);
    const end = Math.min(cleanDoc.length, directIdx + Math.max(probe.length, 180));
    return {
      supported: true,
      verbatimPassage: cleanDoc.slice(start, end).trim(),
      matchRatio: 1,
    };
  }

  // 2. Sentence/window token overlap against returned text
  const queryTokens = tokenizeSignificant(
    target && fallbackClaim ? `${target} ${fallbackClaim}` : probe
  );
  if (queryTokens.length === 0) {
    return { supported: false, verbatimPassage: '', matchRatio: 0 };
  }

  const sentences = cleanDoc
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);

  const windows: string[] = [];
  if (sentences.length > 0) {
    for (let i = 0; i < sentences.length; i++) {
      windows.push(sentences[i]);
      if (i + 1 < sentences.length) {
        windows.push(`${sentences[i]} ${sentences[i + 1]}`);
      }
    }
  } else {
    for (let i = 0; i < cleanDoc.length; i += 180) {
      windows.push(cleanDoc.slice(i, i + 320));
    }
  }

  let bestWindow = '';
  let bestCount = 0;
  let bestRatio = 0;

  for (const win of windows) {
    const winLower = win.toLowerCase();
    let hits = 0;
    for (const tok of queryTokens) {
      if (winLower.includes(tok)) hits += 1;
    }
    const ratio = hits / queryTokens.length;
    if (hits > bestCount || (hits === bestCount && ratio > bestRatio)) {
      bestCount = hits;
      bestRatio = ratio;
      bestWindow = win;
    }
  }

  const requiredHits = queryTokens.length <= 2 ? queryTokens.length : Math.min(3, queryTokens.length);
  const supported = bestCount >= requiredHits && bestRatio >= 0.45;

  return {
    supported,
    verbatimPassage: supported ? bestWindow.slice(0, 420).trim() : '',
    matchRatio: Number(bestRatio.toFixed(2)),
  };
}

/**
 * UM-2.4b Grounding Confirmer:
 * Fetches a source URI, requires HTTP 200, checks that the returned text
 * actually supports the cited passage, and returns a UM-2.4b quote
 * (verbatim passage + URI + retrieval timestamp).
 *
 * ONLY this code path may ever mark a source `verified: true`.
 */
export async function confirmSource(params: {
  uri: string;
  citedPassage?: string;
  claimText?: string;
  fetcher?: SourceFetcher;
}): Promise<ConfirmSourceResult> {
  const retrievedAt = new Date().toISOString();
  const rawUri = (params.uri || '').trim();

  if (!/^https?:\/\/\S+/i.test(rawUri)) {
    return {
      verified: false,
      uri: rawUri,
      retrievedAt,
      reason: 'Invalid source URI: only http(s) URIs can be verified.',
      um24bQuote: null,
    };
  }

  const fetcher: SourceFetcher =
    params.fetcher ||
    ((url, init) =>
      fetch(url, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(7000),
      }));

  try {
    const res = await fetcher(rawUri, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'UM1-Research-Workbench/3.1 (Grounding Confirmer)',
        Accept: 'text/html,text/plain,application/json,*/*',
      },
    });

    if (res.status !== 200) {
      return {
        verified: false,
        uri: rawUri,
        httpStatus: res.status,
        retrievedAt,
        reason: `HTTP ${res.status} returned (HTTP 200 required for UM-2.4b source confirmation).`,
        um24bQuote: null,
      };
    }

    const bodyRaw = await res.text();
    const plainText = stripHtmlToPlainText(bodyRaw);
    const support = extractSupportingPassage(
      plainText,
      params.citedPassage || '',
      params.claimText
    );

    if (!support.supported || !support.verbatimPassage) {
      return {
        verified: false,
        uri: rawUri,
        httpStatus: 200,
        retrievedAt,
        reason: `HTTP 200 returned, but fetched text did not sufficiently support the cited passage (matchRatio=${support.matchRatio}).`,
        um24bQuote: null,
      };
    }

    const sha256 = createHash('sha256')
      .update(`${rawUri}\n${retrievedAt}\n${support.verbatimPassage}`)
      .digest('hex');

    return {
      verified: true,
      uri: rawUri,
      httpStatus: 200,
      retrievedAt,
      reason: `UM-2.4b verified (HTTP 200, passage support ratio=${support.matchRatio}).`,
      um24bQuote: {
        verbatimPassage: support.verbatimPassage,
        uri: rawUri,
        retrievedAt,
        httpStatus: 200,
        sha256,
      },
    };
  } catch (err) {
    return {
      verified: false,
      uri: rawUri,
      retrievedAt,
      reason: `Fetch failed during UM-2.4b verification: ${
        err instanceof Error ? err.message : 'Network error'
      }`,
      um24bQuote: null,
    };
  }
}
