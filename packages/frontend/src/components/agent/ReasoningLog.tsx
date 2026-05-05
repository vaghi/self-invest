import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, Coins } from 'lucide-react';
import type { AIAnalysis } from '@self-invest/shared';
import { formatDistanceToNow } from 'date-fns';

interface ReasoningLogProps {
  analyses: AIAnalysis[];
}

const ANALYSIS_LABELS: Record<string, string> = {
  market_scan: 'Market Scan',
  trade_decision: 'Trade Decision',
  risk_check: 'Risk Check',
  news_digest: 'News Digest',
};

const PROVIDER_COLORS: Record<string, string> = {
  claude: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  openai: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  grok: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ollama: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  lmstudio: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    confidence > 0.7
      ? 'bg-green-500'
      : confidence >= 0.4
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-surface-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-xs font-mono ${
          confidence > 0.7
            ? 'text-green-400'
            : confidence >= 0.4
              ? 'text-yellow-400'
              : 'text-red-400'
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}

function LogEntry({ analysis }: { analysis: AIAnalysis }) {
  const [expanded, setExpanded] = useState(false);

  const providerStyle =
    PROVIDER_COLORS[analysis.provider] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  const totalTokens = analysis.tokensUsed.input + analysis.tokensUsed.output;

  return (
    <div className="border border-surface-700 rounded-lg bg-surface-850 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-800 transition"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-500 font-mono shrink-0 w-28">
          {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
        </span>

        {/* Provider + Model badge */}
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium shrink-0 ${providerStyle}`}
        >
          {analysis.provider}/{analysis.model}
        </span>

        {/* Analysis type */}
        <span className="text-xs text-brand-400 font-medium shrink-0">
          {ANALYSIS_LABELS[analysis.analysisType] ?? analysis.analysisType}
        </span>

        {/* Confidence */}
        <div className="ml-auto">
          <ConfidenceBar confidence={analysis.confidence} />
        </div>
      </button>

      {/* Expanded reasoning */}
      {expanded && (
        <div className="border-t border-surface-700 px-4 py-3 space-y-3">
          {/* Reasoning */}
          <div className="flex items-start gap-2">
            <Brain className="h-4 w-4 text-brand-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {analysis.reasoning}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 pt-1 border-t border-surface-700">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Coins className="h-3.5 w-3.5" />
              <span>
                {totalTokens.toLocaleString()} tokens
                <span className="text-gray-600 ml-1">
                  ({analysis.tokensUsed.input.toLocaleString()} in / {analysis.tokensUsed.output.toLocaleString()} out)
                </span>
              </span>
            </div>

            <span className="text-xs text-gray-500">
              ${analysis.costUsd}
            </span>

            <span className="text-xs text-gray-600">
              {analysis.latencyMs.toLocaleString()}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReasoningLog({ analyses }: ReasoningLogProps) {
  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        AI Reasoning Log
      </h3>

      {analyses.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No analyses yet. Start the agent to begin.
        </p>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
          {analyses.map((a) => (
            <LogEntry key={a.id} analysis={a} />
          ))}
        </div>
      )}
    </div>
  );
}
