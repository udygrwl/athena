import { useState, useEffect } from 'react'
import NavBar from './components/NavBar'
import JudgeSetup from './components/JudgeSetup'
import JudgeChat from './components/JudgeChat'
import DebateResults from './components/DebateResults'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const ROUND_PROGRESS = { round0: 25, round1: 50, round2: 75, verdict: 100 }

// stages: setup | judge_chat | debating | results | verdict_chat
export default function App() {
  // ── theme ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('athena-theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('athena-theme', theme)
  }, [theme])
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // ── models ─────────────────────────────────────────────────────────────────
  const [models, setModels] = useState([])
  const [modelsError, setModelsError] = useState(null)
  useEffect(() => {
    fetch(`${API}/api/models`)
      .then(r => r.json())
      .then(d => setModels(d.models))
      .catch(() => setModelsError(`Could not reach backend at ${API}. Make sure the backend is running.`))
  }, [])

  // ── stage + session state ──────────────────────────────────────────────────
  const [stage, setStage] = useState('setup')
  const [judgeModel, setJudgeModel] = useState(null)
  const [judgeModelName, setJudgeModelName] = useState(null)

  // debate state
  const [debateTopic, setDebateTopic] = useState(null)
  const [advocateModels, setAdvocateModels] = useState([])
  const [useThinking, setUseThinking] = useState(false)
  const [rounds, setRounds] = useState({})
  const [status, setStatus] = useState('')
  const [currentRound, setCurrentRound] = useState(null)
  const [progress, setProgress] = useState(0)
  const [debateState, setDebateState] = useState(null)

  const getModelName = (id) => models.find(m => m.id === id)?.name || id

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleStartJudgeChat = (judgeId) => {
    setJudgeModel(judgeId)
    setJudgeModelName(getModelName(judgeId))
    setStage('judge_chat')
  }

  const handleDebateReady = (topic, advocates, thinking) => {
    setDebateTopic(topic)
    setAdvocateModels(advocates)
    setUseThinking(thinking)
    setRounds({}); setStatus(''); setCurrentRound(null); setProgress(0); setDebateState('running')
    setStage('debating')

    fetch(`${API}/api/debate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        advocate_models: advocates,
        judge_model: judgeModel,
        use_thinking: thinking,
      }),
    }).then(response => {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const processChunk = ({ done, value }) => {
        if (done) { setDebateState('done'); setStage('results'); return }
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n'); buffer = parts.pop()
        for (const part of parts) {
          if (!part.trim()) continue
          const lines = part.split('\n')
          let eventType = 'message', dataStr = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7)
            if (line.startsWith('data: '))  dataStr  = line.slice(6)
          }
          if (!dataStr) continue
          try {
            const payload = JSON.parse(dataStr)
            if (eventType === 'status')   { setStatus(payload.message); setCurrentRound(payload.round) }
            else if (eventType === 'done') { setDebateState('done'); setStage('results'); setStatus(''); setCurrentRound(null); setProgress(100) }
            else if (eventType === 'anon_map') { /* stored in rounds for access */ setRounds(prev => ({ ...prev, _anon_map: payload.mapping })) }
            else { setRounds(prev => ({ ...prev, [eventType]: payload })); setProgress(ROUND_PROGRESS[eventType] ?? 0) }
          } catch (e) { console.error('Parse error:', e) }
        }
        reader.read().then(processChunk)
      }
      reader.read().then(processChunk)
    }).catch(err => { setDebateState('error'); setStatus(`Error: ${err.message}`); setStage('results') })
  }

  // Build full transcript for post-debate chat (revealed model names)
  const buildTranscript = () => {
    const parts = []
    const fmt = (roundData, title) => {
      if (!roundData?.results) return
      parts.push(`=== ${title} ===`)
      for (const r of roundData.results) {
        parts.push(`[${r.model_name} / ${r.anon_label}]:\n${r.content}`)
      }
    }
    fmt(rounds.round0, 'ROUND 0: INITIAL POSITIONS')
    fmt(rounds.round1, 'ROUND 1: CRITIQUES')
    fmt(rounds.round2, 'ROUND 2: REVISED POSITIONS')
    return parts.join('\n\n')
  }

  // ── render ─────────────────────────────────────────────────────────────────
  const bg   = 'bg-slate-50 dark:bg-[#0f1117]'
  const text = 'text-slate-800 dark:text-slate-200'

  return (
    <div className={`min-h-screen flex flex-col ${bg} ${text}`}>
      <NavBar theme={theme} onToggleTheme={toggleTheme} />

      {modelsError && (
        <div className="max-w-3xl mx-auto px-6 pt-4 w-full">
          <div className="rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 px-4 py-3 text-red-700 dark:text-red-300 text-sm">
            {modelsError}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6 w-full">

        {stage === 'setup' && (
          <JudgeSetup models={models} onStart={handleStartJudgeChat} />
        )}

        {(stage === 'judge_chat' || stage === 'debating' || stage === 'results' || stage === 'verdict_chat') && (
          <JudgeChat
            judgeModel={judgeModel}
            judgeModelName={judgeModelName}
            models={models}
            onDebateReady={handleDebateReady}
          />
        )}

        {(stage === 'debating' || stage === 'results') && (
          <DebateResults
            rounds={rounds}
            status={status}
            currentRound={currentRound}
            debateState={debateState}
            progress={progress}
            onDiscussWithJudge={debateState === 'done' ? () => setStage('verdict_chat') : null}
          />
        )}

        {stage === 'verdict_chat' && (
          <>
            <DebateResults
              rounds={rounds}
              status={status}
              currentRound={currentRound}
              debateState={debateState}
              progress={progress}
              onDiscussWithJudge={null}
            />
            <JudgeChat
              judgeModel={judgeModel}
              judgeModelName={judgeModelName}
              models={models}
              onDebateReady={() => {}}
              postDebate={true}
              transcript={buildTranscript()}
              verdict={rounds.verdict?.content || ''}
            />
          </>
        )}

      </main>
    </div>
  )
}
