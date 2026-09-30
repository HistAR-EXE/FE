import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { minigameApi, type Minigame } from '../features/minigames/api'
import { useAuth } from '../shared/auth/useAuth'
import { emitEvent } from '../lib/pilotEvents'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

type FinishProps = { score: number; onSubmit: () => void; submitting: boolean; submitted: boolean }

function FinishBanner({ score, onSubmit, submitting, submitted }: FinishProps) {
  return (
    <div className="mt-8 p-6 rounded-3xl border border-[#fe951c]/40 bg-[#fe951c]/10">
      <p className="text-lg font-black text-white">
        Điểm: <span className="text-[#fdb438]">{score}</span>/100
      </p>
      {submitted ? (
        <p className="mt-2 text-sm text-gray-300">Đã lưu tiến trình.</p>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] text-black font-black text-xs uppercase tracking-widest disabled:opacity-50"
        >
          <MaterialIcon name="save" className="text-base" />
          {submitting ? 'Đang lưu…' : 'Lưu điểm'}
        </button>
      )}
    </div>
  )
}

function QuizTimedGame({
  config,
  onDone,
}: {
  config: Record<string, unknown>
  onDone: (score: number) => void
}) {
  const questions = (config.questions as { prompt: string; options: string[]; correctIndex: number }[]) ?? []
  const timeLimitSec = (config.timeLimitSec as number) ?? 90
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSec)

  useEffect(() => {
    if (done) return
    const t = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(t)
          setDone(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [done])

  useEffect(() => {
    if (done && questions.length > 0) {
      onDone(Math.round((correct / questions.length) * 100))
    }
  }, [done, correct, questions.length, onDone])

  const q = questions[idx]
  if (!q) return <p className="text-gray-400">Không có câu hỏi.</p>

  const pick = (optionIndex: number) => {
    if (done) return
    if (optionIndex === q.correctIndex) setCorrect((c) => c + 1)
    if (idx + 1 >= questions.length) setDone(true)
    else setIdx((i) => i + 1)
  }

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
        Câu {Math.min(idx + 1, questions.length)}/{questions.length} · {secondsLeft}s
      </p>
      <p className="text-lg font-bold text-white mb-6">{q.prompt}</p>
      <div className="space-y-3">
        {q.options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => pick(i)}
            disabled={done}
            className="w-full text-left px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:border-[#388cf1]/50 text-white font-medium"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function MemoryPairsGame({
  config,
  onDone,
}: {
  config: Record<string, unknown>
  onDone: (score: number) => void
}) {
  const pairs = (config.pairs as { id: string; label: string }[]) ?? []
  const cards = useMemo(
    () => shuffle(pairs.flatMap((p) => [p, p]).map((p, i) => ({ ...p, key: `${p.id}-${i}` }))),
    [pairs],
  )
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [lock, setLock] = useState(false)

  useEffect(() => {
    if (pairs.length > 0 && matched.size === pairs.length) {
      const movesPenalty = Math.max(0, flipped.length - pairs.length * 2)
      const score = Math.max(40, 100 - movesPenalty * 3)
      onDone(score)
    }
  }, [matched.size, pairs.length, flipped.length, onDone])

  const click = (index: number) => {
    if (lock || matched.has(cards[index].id)) return
    if (flipped.includes(index)) return
    const next = [...flipped, index]
    setFlipped(next)
    if (next.length === 2) {
      const [a, b] = next
      if (cards[a].id === cards[b].id) {
        setMatched((m) => new Set(m).add(cards[a].id))
        setFlipped([])
      } else {
        setLock(true)
        window.setTimeout(() => {
          setFlipped([])
          setLock(false)
        }, 700)
      }
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((c, i) => {
        const show = flipped.includes(i) || matched.has(c.id)
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => click(i)}
            className={`min-h-[72px] rounded-xl border text-xs font-bold p-2 ${
              show ? 'border-[#fe951c]/50 bg-[#fe951c]/20 text-white' : 'border-white/10 bg-black/40 text-transparent'
            }`}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
}

function TimelineOrderGame({
  config,
  onDone,
}: {
  config: Record<string, unknown>
  onDone: (score: number) => void
}) {
  const items = (config.items as string[]) ?? []
  const [order, setOrder] = useState<number[]>(() => items.map((_, i) => i))
  const [checked, setChecked] = useState(false)

  const move = (from: number, dir: -1 | 1) => {
    if (checked) return
    const to = from + dir
    if (to < 0 || to >= order.length) return
    const next = [...order]
    ;[next[from], next[to]] = [next[to], next[from]]
    setOrder(next)
  }

  const check = () => {
    setChecked(true)
    let ok = 0
    order.forEach((v, i) => {
      if (v === i) ok++
    })
    onDone(Math.round((ok / Math.max(items.length, 1)) * 100))
  }

  return (
    <div>
      {config.hint ? <p className="text-sm text-gray-400 mb-4">{String(config.hint)}</p> : null}
      <ol className="space-y-2">
        {order.map((itemIdx, pos) => (
          <li key={itemIdx} className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5">
            <span className="text-[#fdb438] font-black w-6">{pos + 1}.</span>
            <span className="flex-1 text-white font-medium">{items[itemIdx]}</span>
            {!checked && (
              <div className="flex gap-1">
                <button type="button" onClick={() => move(pos, -1)} className="p-1 text-gray-400 hover:text-white">
                  <MaterialIcon name="arrow_upward" />
                </button>
                <button type="button" onClick={() => move(pos, 1)} className="p-1 text-gray-400 hover:text-white">
                  <MaterialIcon name="arrow_downward" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      {!checked && (
        <button
          type="button"
          onClick={check}
          className="mt-6 px-5 py-3 rounded-xl bg-[#388cf1] text-white font-black text-xs uppercase tracking-widest"
        >
          Kiểm tra
        </button>
      )}
    </div>
  )
}

function SpotDiffGame({
  config,
  onDone,
}: {
  config: Record<string, unknown>
  onDone: (score: number) => void
}) {
  const leftItems = (config.leftItems as string[]) ?? []
  const diffIndices = (config.diffIndices as number[]) ?? []
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [checked, setChecked] = useState(false)

  const toggle = (i: number) => {
    if (checked) return
    setPicked((prev) => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
  }

  const check = () => {
    setChecked(true)
    const target = new Set(diffIndices)
    let hits = 0
    picked.forEach((i) => {
      if (target.has(i)) hits++
    })
    const falsePos = [...picked].filter((i) => !target.has(i)).length
    const missed = diffIndices.filter((i) => !picked.has(i)).length
    const score = Math.max(
      0,
      Math.round(((hits - falsePos - missed) / Math.max(diffIndices.length, 1)) * 100),
    )
    onDone(Math.min(100, Math.max(0, score)))
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-2">{String(config.leftTitle ?? 'A')}</p>
      <ul className="space-y-2 mb-6">
        {leftItems.map((line, i) => (
          <li
            key={line}
            className={`p-3 rounded-xl border cursor-pointer ${
              picked.has(i) ? 'border-[#fe951c] bg-[#fe951c]/10' : 'border-white/10 bg-white/5'
            }`}
            onClick={() => toggle(i)}
            onKeyDown={(e) => e.key === 'Enter' && toggle(i)}
            role="button"
            tabIndex={0}
          >
            <span className="text-white text-sm">{line}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mb-4">Chọn các dòng khác biệt so với phiên bản ban đêm ({String(config.rightTitle ?? 'B')}).</p>
      {!checked && (
        <button type="button" onClick={check} className="px-5 py-3 rounded-xl bg-[#388cf1] text-white font-black text-xs uppercase">
          Xác nhận
        </button>
      )}
    </div>
  )
}

function MatchTermsGame({
  config,
  onDone,
}: {
  config: Record<string, unknown>
  onDone: (score: number) => void
}) {
  const terms = (config.terms as string[]) ?? []
  const definitions = (config.definitions as string[]) ?? []
  const answerKey = (config.answerKey as number[]) ?? terms.map((_, i) => i)
  const [map, setMap] = useState<Record<number, number>>(() =>
    Object.fromEntries(terms.map((_, i) => [i, i])),
  )
  const [checked, setChecked] = useState(false)

  const check = () => {
    setChecked(true)
    let ok = 0
    terms.forEach((_, i) => {
      if (map[i] === answerKey[i]) ok++
    })
    onDone(Math.round((ok / Math.max(terms.length, 1)) * 100))
  }

  return (
    <div className="space-y-4">
      {terms.map((term, i) => (
        <div key={term} className="p-4 rounded-2xl border border-white/10 bg-white/5">
          <p className="text-white font-bold mb-2">{term}</p>
          <select
            disabled={checked}
            value={map[i]}
            onChange={(e) => setMap((m) => ({ ...m, [i]: Number(e.target.value) }))}
            className="w-full bg-[#0B1120] border border-white/20 rounded-xl px-3 py-2 text-white text-sm"
          >
            {definitions.map((d, j) => (
              <option key={d} value={j}>
                {d}
              </option>
            ))}
          </select>
        </div>
      ))}
      {!checked && (
        <button type="button" onClick={check} className="px-5 py-3 rounded-xl bg-[#388cf1] text-white font-black text-xs uppercase">
          Nối thuật ngữ
        </button>
      )}
    </div>
  )
}

function CompassChoiceGame({
  config,
  onDone,
}: {
  config: Record<string, unknown>
  onDone: (score: number) => void
}) {
  const choices = (config.choices as { id: string; label: string; correct: boolean }[]) ?? []
  const [picked, setPicked] = useState<string | null>(null)

  const pick = (id: string, correct: boolean) => {
    if (picked) return
    setPicked(id)
    onDone(correct ? 100 : 25)
  }

  return (
    <div>
      <p className="text-white leading-relaxed mb-6">{String(config.scenario ?? '')}</p>
      <div className="grid gap-3">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={!!picked}
            onClick={() => pick(c.id, c.correct)}
            className={`text-left px-4 py-3 rounded-2xl border font-medium ${
              picked === c.id
                ? c.correct
                  ? 'border-green-500/50 bg-green-500/10 text-green-200'
                  : 'border-red-500/50 bg-red-500/10 text-red-200'
                : 'border-white/10 bg-white/5 text-white hover:border-[#388cf1]/40'
            }`}
          >
            <MaterialIcon name="explore" className="text-[#fdb438] mr-2 align-middle text-base" />
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function StationGamePage() {
  const {
    siteCode: siteCodeParam,
    code: stationCode = 'ST01',
    gameId = '',
  } = useParams<{ siteCode?: string; code: string; gameId: string }>()
  const siteCode = (siteCodeParam || 'cu-chi').trim().toLowerCase()
  const { isAuthenticated } = useAuth()
  const [game, setGame] = useState<Minigame | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    setGame(null)
    setFinalScore(null)
    setSubmitted(false)
    minigameApi
      .listForStation(siteCode, stationCode)
      .then((list) => {
        if (cancelled) return
        const found = list.find((g) => g.id === gameId) ?? list[0] ?? null
        setGame(found)
        if (!found) setLoadError('Không tìm thấy mini-game cho trạm này.')
      })
      .catch(() => {
        if (!cancelled) setLoadError('Không tải được mini-game.')
      })
    return () => {
      cancelled = true
    }
  }, [siteCode, stationCode, gameId])

  const onDone = useCallback((score: number) => {
    setFinalScore(score)
  }, [])

  const saveScore = async () => {
    if (!game || finalScore == null || !isAuthenticated) return
    setSubmitting(true)
    try {
      await minigameApi.submit(game.id, finalScore)
      emitEvent('game_completed', {
        stationCode,
        payload: { minigameId: game.id, score: finalScore, gameType: game.gameType },
      })
      setSubmitted(true)
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false)
    }
  }

  const renderer = useMemo(() => {
    if (!game) return null
    const cfg = game.config
    switch (game.gameType) {
      case 'QUIZ_TIMED':
        return <QuizTimedGame config={cfg} onDone={onDone} />
      case 'MEMORY_PAIRS':
        return <MemoryPairsGame config={cfg} onDone={onDone} />
      case 'TIMELINE_ORDER':
        return <TimelineOrderGame config={cfg} onDone={onDone} />
      case 'SPOT_DIFF':
        return <SpotDiffGame config={cfg} onDone={onDone} />
      case 'MATCH_TERMS':
        return <MatchTermsGame config={cfg} onDone={onDone} />
      case 'COMPASS_CHOICE':
        return <CompassChoiceGame config={cfg} onDone={onDone} />
      default:
        return <p className="text-gray-400">Loại game chưa hỗ trợ: {game.gameType}</p>
    }
  }, [game, onDone])

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link
          to="/quests"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white"
        >
          <MaterialIcon name="arrow_back" className="text-base" /> Quest
        </Link>

        <header className="mt-6 mb-8">
          <span className="px-3 py-1 rounded-full bg-[#388cf1]/10 border border-[#388cf1]/40 text-[#388cf1] text-[10px] font-black uppercase tracking-widest">
            B6 · Mini-game
          </span>
          <h1 className="mt-4 text-2xl font-black">{game?.title ?? 'Đang tải…'}</h1>
          <p className="mt-2 text-sm text-gray-400">
            Trạm {stationCode}
            {game?.bestScore != null ? ` · Kỷ lục: ${game.bestScore}` : ''}
          </p>
        </header>

        {loadError && <p className="text-red-400">{loadError}</p>}
        {renderer}

        {finalScore != null && (
          <FinishBanner
            score={finalScore}
            onSubmit={saveScore}
            submitting={submitting}
            submitted={submitted}
          />
        )}

        {!isAuthenticated && finalScore != null && (
          <p className="mt-4 text-sm text-gray-500">
            <Link to="/login" className="text-[#388cf1] underline">
              Đăng nhập
            </Link>{' '}
            để lưu điểm lên server.
          </p>
        )}
      </div>
    </div>
  )
}
