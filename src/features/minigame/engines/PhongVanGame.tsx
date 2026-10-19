// src/features/minigame/engines/PhongVanGame.tsx
// Phỏng vấn nhân chứng: kể lại điều đã học, nhắc đủ các chủ đề. Gõ hoặc nói (nhận giọng của trình duyệt).

import { useEffect, useState } from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import type { EngineProps } from '../engineTypes'
import { buzz, sfx } from '../sfx'

type BrowserSpeech = {
    lang: string
    start: () => void
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
    onend: (() => void) | null
}

export function PhongVanGame({ view, submit, onResolved, say }: EngineProps) {
    const [text, setText] = useState('')
    const [listening, setListening] = useState(false)
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)
    const topics = view.topics ?? []

    useEffect(() => {
        say({ text: 'Em kể lại cho chị nghe những gì em đã thấy dưới địa đạo nhé. Nhớ nhắc đủ các chủ đề bên dưới.' })
    }, [say])

    const listen = () => {
        const host = window as Window & {
            SpeechRecognition?: new () => BrowserSpeech
            webkitSpeechRecognition?: new () => BrowserSpeech
        }
        const Speech = host.SpeechRecognition ?? host.webkitSpeechRecognition
        if (!Speech) {
            say({ text: 'Trình duyệt này chưa nhận giọng nói. Em gõ giúp chị nhé.', mood: 'surprised' })
            return
        }
        const recognition = new Speech()
        recognition.lang = 'vi-VN'
        recognition.onresult = (event) => {
            const said = event.results[0]?.[0]?.transcript ?? ''
            setText((prev) => (prev ? `${prev} ${said}` : said))
        }
        recognition.onend = () => setListening(false)
        setListening(true)
        recognition.start()
    }

    const send = async () => {
        if (!text.trim() || busy || done) return
        setBusy(true)
        const outcome = await submit({ transcript: text })
        setBusy(false)
        if (outcome.kind !== 'done') return
        setDone(true)
        if (outcome.result.stars >= 3) {
            sfx.win()
            buzz([30, 40, 60])
            say({ text: 'Em kể đủ cả rồi. Cảm ơn em đã lắng nghe!' })
        } else if (outcome.result.stars > 0) {
            sfx.good()
            say({ text: 'Em nhớ được kha khá rồi, còn thiếu vài chủ đề thôi.', mood: 'surprised' })
        } else {
            sfx.lose()
            say({ text: 'Chị chưa nghe thấy chủ đề nào. Em thử kể lại nhé.', mood: 'surprised' })
        }
        window.setTimeout(() => onResolved(outcome.result), 1200)
    }

    return (
        <div className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-[#0275FB]/10 sm:p-5">
            <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Chủ đề cần nhắc</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {topics.map((topic) => (
                        <span key={topic.label} className="inline-flex items-center gap-1 rounded-full bg-[#DCEBFF] px-3 py-1.5 text-xs font-black text-[#0275FB]">
                            <MaterialIcon name="chat" className="text-sm" /> {topic.label}
                        </span>
                    ))}
                </div>
            </div>
            <textarea
                value={text}
                disabled={busy || done}
                onChange={(event) => setText(event.target.value)}
                className="min-h-32 w-full rounded-2xl border-2 border-[#0275FB]/15 bg-[#F2F7FF] px-4 py-3 text-sm text-[#0F1B33] outline-none focus:border-[#0275FB]"
                placeholder="Ví dụ: Bếp Hoàng Cầm giấu khói bằng rãnh dẫn… (gõ không dấu cũng được)"
                data-testid="phong-van-text"
            />
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={busy || done || listening}
                    onClick={listen}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border-2 border-[#0275FB]/20 bg-white px-4 text-sm font-black text-[#0275FB] disabled:opacity-50"
                >
                    <MaterialIcon name={listening ? 'graphic_eq' : 'mic'} className="text-lg" /> {listening ? 'Đang nghe…' : 'Nói'}
                </button>
                <button
                    type="button"
                    disabled={busy || done || !text.trim()}
                    onClick={() => void send()}
                    data-testid="phong-van-send"
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0275FB] text-sm font-black text-white shadow-[0_5px_0_#0159C2] disabled:bg-slate-300 disabled:shadow-none"
                >
                    <MaterialIcon name="send" className="text-lg" /> {busy ? 'Đang gửi…' : 'Gửi câu trả lời'}
                </button>
            </div>
        </div>
    )
}
