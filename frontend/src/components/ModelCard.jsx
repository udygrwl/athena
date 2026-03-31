import { useState } from 'react'

const PROVIDER_COLORS = {
  anthropic: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-700/40', badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-200' },
  google:    { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-700/40',   badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200'     },
  openai:    { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700/40', badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'  },
}
const DEFAULT_COLORS = { bg: 'bg-slate-50 dark:bg-slate-800/40', border: 'border-slate-200 dark:border-slate-700/40', badge: 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300' }

function getProvider(modelId) {
  if (modelId.startsWith('claude')) return 'anthropic'
  if (modelId.startsWith('gemini')) return 'google'
  if (modelId.startsWith('gpt') || modelId.startsWith('o')) return 'openai'
  return null
}

export default function ModelCard({ result, roundKey, revealed = true }) {
  const [expanded, setExpanded] = useState(true)
  const provider = getProvider(result.model)
  const colors = PROVIDER_COLORS[provider] || DEFAULT_COLORS

  const displayName = revealed
    ? (result.anon_label ? `${result.model_name} (${result.anon_label})` : result.model_name)
    : (result.anon_label || result.model_name)

  const subtitle = roundKey === 'round1'
    ? `Critiquing: ${result.critiqued?.join(', ')}`
    : null

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap text-left">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
            {displayName}
          </span>
          {subtitle && <span className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</span>}
        </div>
        <span className="text-slate-400 dark:text-slate-600 text-sm ml-2 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {result.content}
          </div>
        </div>
      )}
    </div>
  )
}
