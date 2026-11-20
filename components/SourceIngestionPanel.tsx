'use client';

import React, { useRef, useState } from 'react';
import type { AutoFillExtractionPayload, IngestedSourceMetadata } from '@/app/api/coscientist/ingest/route';
export type { AutoFillExtractionPayload, IngestedSourceMetadata };
import {
  CheckCircle2,
  FileCode2,
  FileText,
  FolderGit2,
  BookOpen,
  Sparkles,
  Upload,
  ArrowRight,
  Edit3,
} from 'lucide-react';

export interface ConnectedSourceRecord {
  id: string;
  sourceType: 'github' | 'arxiv' | 'pdf' | 'text';
  identifier: string;
  title: string;
  url?: string;
  ingestedAt: string;
  extraction: AutoFillExtractionPayload;
}

interface SourceIngestionPanelProps {
  connectedSources: ConnectedSourceRecord[];
  onSourceIngested: (
    record: ConnectedSourceRecord,
    mode: 'auto-register-all' | 'prefill-form-only'
  ) => void;
  compact?: boolean;
}

type InputChannel = 'github' | 'arxiv' | 'file';

export default function SourceIngestionPanel({
  connectedSources,
  onSourceIngested,
  compact = false,
}: SourceIngestionPanelProps) {
  const [channel, setChannel] = useState<InputChannel>('github');
  const [githubInput, setGithubInput] = useState('');
  const [arxivInput, setArxivInput] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileType, setSelectedFileType] = useState<'pdf' | 'text'>('text');
  const [fileTextContent, setFileTextContent] = useState<string>('');
  const [pdfBase64Content, setPdfBase64Content] = useState<string>('');

  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<{
    extraction: AutoFillExtractionPayload;
    metadata: IngestedSourceMetadata;
    agentModel: string;
  } | null>(() =>
    connectedSources[0]
      ? {
          extraction: connectedSources[0].extraction,
          metadata: {
            sourceType: connectedSources[0].sourceType,
            identifier: connectedSources[0].identifier,
            title: connectedSources[0].title,
            rawExcerpt: connectedSources[0].extraction.manuscriptExcerpt,
            url: connectedSources[0].url,
          },
          agentModel: 'Co-Scientist Ingestion Agent',
        }
      : null
  );
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setSelectedFileName(file.name);

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      setSelectedFileType('pdf');
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = typeof reader.result === 'string' ? reader.result : '';
        const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
        setPdfBase64Content(base64);
        setFileTextContent(`PDF Upload: ${file.name} (${Math.round(file.size / 1024)} KB)`);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFileType('text');
      setPdfBase64Content('');
      const text = await file.text();
      setFileTextContent(text);
    }
  };

  const handleRunExtraction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAppliedToast(null);

    let payload: {
      sourceType: 'github' | 'arxiv' | 'pdf' | 'text';
      urlOrIdentifier?: string;
      fileName?: string;
      fileContentText?: string;
      pdfBase64?: string;
    };

    if (channel === 'github') {
      if (!githubInput.trim()) {
        setErrorMsg('Enter a GitHub repository URL (e.g. https://github.com/owner/repo) or owner/repo.');
        return;
      }
      payload = {
        sourceType: 'github',
        urlOrIdentifier: githubInput.trim(),
      };
    } else if (channel === 'arxiv') {
      if (!arxivInput.trim()) {
        setErrorMsg('Enter an arXiv paper link (e.g. https://arxiv.org/abs/2502.18864) or arXiv ID.');
        return;
      }
      payload = {
        sourceType: 'arxiv',
        urlOrIdentifier: arxivInput.trim(),
      };
    } else {
      if (!selectedFileName && !fileTextContent.trim()) {
        setErrorMsg('Upload a PDF (.pdf) or text/code file (.txt, .md, .tex, .py, .lean, .bib) first.');
        return;
      }
      payload = {
        sourceType: selectedFileType,
        fileName: selectedFileName || 'document.txt',
        fileContentText: fileTextContent,
        pdfBase64: selectedFileType === 'pdf' ? pdfBase64Content : undefined,
      };
    }

    setIsExtracting(true);
    try {
      const res = await fetch('/api/coscientist/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Failed to extract source fields.');
      } else if (data.extraction && data.ingestedMetadata) {
        setLatestResult({
          extraction: data.extraction,
          metadata: data.ingestedMetadata,
          agentModel: data.agentModel || 'gemini-4-hydrogen',
        });

        // If inside compact modal mode, immediately pre-fill the form!
        if (compact) {
          const rec: ConnectedSourceRecord = {
            id: `SRC-${Date.now()}`,
            sourceType: data.ingestedMetadata.sourceType,
            identifier: data.ingestedMetadata.identifier,
            title: data.ingestedMetadata.title,
            url: data.ingestedMetadata.url,
            ingestedAt: new Date().toISOString(),
            extraction: data.extraction,
          };
          onSourceIngested(rec, 'prefill-form-only');
          setAppliedToast(`Auto-filled form slots from ${data.ingestedMetadata.identifier}`);
        }
      }
    } catch {
      setErrorMsg('Network error while contacting the Ingestion & Auto-Fill Agent.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyExtraction = (mode: 'auto-register-all' | 'prefill-form-only') => {
    if (!latestResult) return;
    const record: ConnectedSourceRecord = {
      id: `SRC-${Date.now()}`,
      sourceType: latestResult.metadata.sourceType,
      identifier: latestResult.metadata.identifier,
      title: latestResult.metadata.title,
      url: latestResult.metadata.url,
      ingestedAt: new Date().toISOString(),
      extraction: latestResult.extraction,
    };
    onSourceIngested(record, mode);
    setAppliedToast(
      mode === 'auto-register-all'
        ? `Auto-filled Research Goal, Claim & EXP record, ${latestResult.extraction.premiseItems.length} Premise nodes (P3), Rung 0–2 analyses, and Manuscript slots.`
        : `Pre-filled Claim & EXP Registration form from ${latestResult.metadata.identifier}.`
    );
  };

  return (
    <div className="space-y-4">
      {/* Channel Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Source Ingestion Type">
          <button
            type="button"
            role="tab"
            aria-selected={channel === 'github'}
            onClick={() => {
              setChannel('github');
              setErrorMsg(null);
            }}
            data-testid="ingest-tab-github"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              channel === 'github'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>GitHub Repo</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={channel === 'arxiv'}
            onClick={() => {
              setChannel('arxiv');
              setErrorMsg(null);
            }}
            data-testid="ingest-tab-arxiv"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              channel === 'arxiv'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>arXiv Paper Link</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={channel === 'file'}
            onClick={() => {
              setChannel('file');
              setErrorMsg(null);
            }}
            data-testid="ingest-tab-file"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              channel === 'file'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF / .tex / .md / .txt</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-600" />
          Agent Auto-Fills App Slots
        </span>
      </div>

      {/* Input Form per Channel */}
      <form onSubmit={handleRunExtraction} className="space-y-3">
        {channel === 'github' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={githubInput}
              onChange={(e) => setGithubInput(e.target.value)}
              placeholder="https://github.com/owner/repo or owner/repo"
              data-testid="ingest-github-input"
              className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={isExtracting}
              data-testid="ingest-submit-btn"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isExtracting ? 'Analyzing Repo...' : 'Connect & Auto-Fill'}</span>
            </button>
          </div>
        )}

        {channel === 'arxiv' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={arxivInput}
              onChange={(e) => setArxivInput(e.target.value)}
              placeholder="https://arxiv.org/abs/2502.18864 or 2502.18864"
              data-testid="ingest-arxiv-input"
              className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={isExtracting}
              data-testid="ingest-submit-btn"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isExtracting ? 'Fetching Paper...' : 'Fetch & Auto-Fill'}</span>
            </button>
          </div>
        )}

        {channel === 'file' && (
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.tex,.bib,.py,.lean,.json,.csv"
                onChange={handleFileChange}
                data-testid="ingest-file-input"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                data-testid="ingest-file-trigger"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-md text-xs text-slate-700 transition-colors"
              >
                {selectedFileType === 'pdf' ? (
                  <FileText className="w-4 h-4 text-rose-600" />
                ) : (
                  <FileCode2 className="w-4 h-4 text-blue-600" />
                )}
                <span className="font-medium">
                  {selectedFileName
                    ? `Selected: ${selectedFileName}`
                    : 'Choose PDF (.pdf) or Text/Code File (.txt, .md, .tex, .py, .lean, .bib)'}
                </span>
              </button>

              <button
                type="submit"
                disabled={isExtracting}
                data-testid="ingest-submit-btn"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isExtracting ? 'Reading File...' : 'Extract & Auto-Fill'}</span>
              </button>
            </div>

            {!compact && (
              <textarea
                rows={2}
                value={selectedFileType === 'pdf' ? '' : fileTextContent}
                onChange={(e) => {
                  setSelectedFileType('text');
                  setFileTextContent(e.target.value);
                  if (!selectedFileName) setSelectedFileName('pasted-snippet.tex');
                }}
                placeholder="Or paste raw LaTeX (.tex), Markdown (.md), abstract, or code snippet directly here..."
                data-testid="ingest-raw-textarea"
                className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
              />
            )}
          </div>
        )}
      </form>

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
          {errorMsg}
        </div>
      )}

      {appliedToast && (
        <div
          data-testid="ingest-applied-toast"
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-center gap-2 font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{appliedToast}</span>
        </div>
      )}

      {/* Extracted Slot Preview Card (Full Studio View) */}
      {!compact && latestResult && (
        <div
          data-testid="ingest-extraction-preview"
          className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
            <div>
              <div className="text-[11px] font-mono uppercase text-blue-700">
                Extracted by {latestResult.agentModel} · {latestResult.metadata.sourceType.toUpperCase()}
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                {latestResult.extraction.claimDraft.title}
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-600">
              Track {latestResult.extraction.claimDraft.track} · Tier{' '}
              {latestResult.extraction.claimDraft.tier} ·{' '}
              {latestResult.extraction.claimDraft.independence}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-white border border-slate-200 rounded">
              <div className="font-semibold text-slate-500 text-[11px] uppercase font-mono">
                Auto-Fill Slot: Research Goal &amp; Target
              </div>
              <p className="text-slate-900 mt-1">{latestResult.extraction.claimDraft.target}</p>
              <p className="text-slate-500 mt-1 font-mono text-[11px]">
                Source: {latestResult.extraction.claimDraft.source}
              </p>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded">
              <div className="font-semibold text-slate-500 text-[11px] uppercase font-mono">
                Auto-Fill Slot: Hypothesis &amp; Prediction
              </div>
              <p className="text-slate-900 mt-1">{latestResult.extraction.claimDraft.question}</p>
              <p className="text-slate-600 mt-1">
                {latestResult.extraction.claimDraft.falsifiablePrediction}
              </p>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded">
              <div className="font-semibold text-slate-500 text-[11px] uppercase font-mono">
                Auto-Fill Slot: UM-1.4 One-Sidedness &amp; Invariant
              </div>
              <p className="text-slate-800 mt-1">
                <strong className="text-emerald-700">PASS:</strong>{' '}
                {latestResult.extraction.claimDraft.oneSidednessPass}
              </p>
              <p className="text-slate-800 mt-0.5">
                <strong className="text-rose-700">FAIL:</strong>{' '}
                {latestResult.extraction.claimDraft.oneSidednessFail}
              </p>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded">
              <div className="font-semibold text-slate-500 text-[11px] uppercase font-mono">
                Auto-Fill Slot: Premise Ledger ({latestResult.extraction.premiseItems.length} Nodes) &amp; Rung Audit
              </div>
              <ul className="mt-1 space-y-1 text-slate-700">
                {latestResult.extraction.premiseItems.slice(0, 2).map((p, idx) => (
                  <li key={idx} className="truncate">
                    • [{p.kind}] {p.statement}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => handleApplyExtraction('prefill-form-only')}
              data-testid="ingest-prefill-form-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Review in Pre-Filled Claim Form</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyExtraction('auto-register-all')}
              data-testid="ingest-apply-all-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
            >
              <span>Auto-Fill All App Slots &amp; Register Claim</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Connected Sources History */}
      {!compact && connectedSources.length > 0 && (
        <div className="pt-3 border-t border-slate-200 space-y-2">
          <div className="text-xs font-semibold text-slate-700">
            Connected Sources ({connectedSources.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {connectedSources.map((src) => (
              <div
                key={src.id}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between gap-2 text-xs"
              >
                <div className="truncate">
                  <div className="font-mono font-semibold text-slate-900 truncate">
                    [{src.sourceType.toUpperCase()}] {src.identifier}
                  </div>
                  <div className="text-slate-500 truncate">{src.title}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onSourceIngested(src, 'prefill-form-only')}
                  data-testid="connected-source-refill-btn"
                  className="px-2.5 py-1 text-[11px] font-mono text-blue-700 bg-blue-50 hover:bg-blue-100 rounded shrink-0"
                >
                  Re-Fill Form
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
