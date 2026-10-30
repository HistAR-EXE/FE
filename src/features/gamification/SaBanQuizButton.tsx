import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { gamificationApi } from './api'
import { DISCOVERY_RECORDED_EVENT } from './discoveryRouting'
import { SA_BAN_QUEST_KEY, SA_BAN_QUIZ } from './saBanFragment'
import { getFriendlyErrorMessage } from '../../shared/api/errorMessages'

export function SaBanQuizButton({ locationId, className, children }: { locationId: string; className: string; children: ReactNode }) {
    const [open, setOpen] = useState(false)
    return <>
        <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
        {open && createPortal(<SaBanQuiz locationId={locationId} onClose={() => setOpen(false)} />, document.body)}
    </>
}

function SaBanQuiz({ locationId, onClose }: { locationId: string; onClose: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null)
    const submitting = useRef(false)
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)
    const [message, setMessage] = useState('')
    useEffect(() => { dialog.current?.showModal() }, [])
    async function answer(optionId: string) {
        if (submitting.current || done) return
        submitting.current = true
        setBusy(true)
        setMessage('')
        try {
            const result = await gamificationApi.claimChapterBonus(locationId, SA_BAN_QUEST_KEY, optionId)
            setDone(true)
            setMessage(result.alreadyClaimed ? 'Bạn đã hoàn thành câu hỏi này rồi.' : `Chính xác! +${result.awarded} điểm chương Sa bàn.`)
            window.dispatchEvent(new CustomEvent(DISCOVERY_RECORDED_EVENT, {
                detail: { recordKey: SA_BAN_QUEST_KEY, recorded: true, locationId },
            }))
        } catch (error) {
            setMessage(getFriendlyErrorMessage(error, 'quest'))
        } finally {
            submitting.current = false
            setBusy(false)
        }
    }
    return <dialog ref={dialog} onClose={onClose} aria-labelledby="sa-ban-quiz-title" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl bg-white p-6 text-[#0F1B33] shadow-2xl backdrop:bg-black/50">
        <div className="flex items-center justify-between gap-4">
            <h2 id="sa-ban-quiz-title" className="text-xl font-black">Câu hỏi Sa bàn</h2>
            <button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Đóng câu hỏi" className="min-h-11 min-w-11 rounded-xl hover:bg-slate-100">✕</button>
        </div>
        <p className="my-5 font-bold">{SA_BAN_QUIZ.prompt}</p>
        <div className="grid gap-3">{SA_BAN_QUIZ.options.map(option => <button key={option.id} type="button" disabled={busy || done} onClick={() => void answer(option.id)} className="min-h-12 rounded-xl border border-blue-200 p-3 text-left font-bold hover:bg-blue-50 disabled:opacity-60">{option.label}</button>)}</div>
        <p role="status" className="mt-4 text-sm">{busy ? 'Đang kiểm tra đáp án…' : message}</p>
    </dialog>
}
