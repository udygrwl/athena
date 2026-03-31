import { useState, useRef, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function JudgeChat({
  judgeModel,
  judgeModelName,
  models,
  onDebateReady,          // (topic, advocateModels, useThinking) => void
  // post-debate mode
  postDebate,             // bool
  transcript,             // string (for post-debate)
  verdict,                // string (for post-debate)
}) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [approvedTopic, setApprovedTopic] = useState(null)
  const [advocates, setAdvocates] = useState(['', '', ''])
  const [useThinking, setUseThinking] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (models.length >= 3 && advocates.every(a => a === '')) {
      setAdvocates([models[0].id, models[1].id, models[2].id])
    }
  }, [models])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const newHistory = [...messages, { role: 'user', content: text }]
    setMessages(newHistory)
    setLoading(true)

    try {
      const endpoint = postDebate ? '/api/judge/post-debate-chat' : '/api/judge/chat'
      const body = postDebate
        ? { judge_model: judgeModel, message: text, history: messages, transcript, verdict }
        : { judge_model: judgeModel, message: text, history: messages }

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      setMessages([...newHistory, { role: 'assistant', content: data.content }])

      if (data.debate_topic && !approvedTopic) {
        setApprovedTopic(data.debate_topic)
      }
    } catch (e) {
      setMessages([...newHistory, { role: 'assistant', content: `[Error: ${e.message}]` }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const setAdvocate = (i, val) => {
    const next = [...advocates]; next[i] = val; setAdvocates(next)
  }

  const canLaunch = approvedTopic && advocates.every(a => a)
  const thinkingModels = models.filter(m => m.thinking || m.reasoning)

  const inputCls = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500'

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col" style={{ minHeight: '480px' }}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {postDebate ? 'Post-debate · ' : ''}Judge
        </span>
        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{judgeModelName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ maxHeight: '420px' }}>
        {messages.length === 0 && (
          <div className="text-center text-sm text-slate-400 dark:text-slate-500 pt-8">
            {postDebate
              ? 'Ask the judge about the verdict or explore the debate further.'
              : 'Tell the judge what you want to debate. They\'ll help shape the topic.'}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-amber-600 text-white rounded-br-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Approved topic + model selector */}
      {approvedTopic && !postDebate && (
        <div className="mx-5 mb-4 rounded-lg border border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-4">
          <div>
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">✓ Debate approved</div>
            <div className="text-sm text-slate-700 dark:text-slate-200 font-medium">{approvedTopic}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i}>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Advocate {i + 1}</label>
                <select
                  value={advocates[i]}
                  onChange={e => setAdvocate(i, e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 ${inputCls}`}
                >
                  <option value="">Select...</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.thinking ? ' ✦' : ''}{m.reasoning ? ' ⚡' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            {thinkingModels.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setUseThinking(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${useThinking ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${useThinking ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Research mode <span className="text-amber-500">✦</span></span>
              </label>
            )}
            <button
              onClick={() => canLaunch && onDebateReady(approvedTopic, advocates, useThinking)}
              disabled={!canLaunch}
              className="ml-auto px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Launch Debate →
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 pb-4 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={postDebate ? 'Ask about the verdict…' : 'Tell me what you want to debate…'}
          disabled={loading}
          className={`flex-1 rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 ${inputCls}`}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  )
}
