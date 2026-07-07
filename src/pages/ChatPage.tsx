// src/pages/ChatPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { Button } from '../components/ui/Button'
import { images } from '../assets/images'
import { chatApi, normalizeChatSources, type ChatMessage, type ChatSource } from '../features/chat/api'
import { ChatSourcesBlock } from '../components/chat/ChatSourcesBlock'
import { analyticsApi } from '../features/analytics/api'
import { buildChatTimeline } from '../features/chat/chatTimeline'
import { stopActiveRecorder, voiceChatStepwise, type VoicePhase } from '../features/chat/voice'
import { locationsApi, type Character } from '../features/locations/api'
import { questRecordFromSearch, recordQuestStepEngagement } from '../features/gamification/questEngagement'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { ApiError } from '../shared/api/contracts'
import { profileApi } from '../features/profile/api'
import { ChatMessageContent } from '../shared/ui/ChatMessageContent'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'

const MESSAGE_PAGE_SIZE = 20

const VOICE_STATUS: Record<VoicePhase, string> = {
    idle: '',
    recording: '🔴 Đang thu âm... Nhấn nút Dừng để gửi câu hỏi giọng nói',
    stt: '⚡ Đang chuyển giọng nói thành văn bản RAG...',
    chat: '🧠 Trợ lý AI đang suy nghĩ sử liệu...',
    tts: '🔊 Đang tạo giọng đọc nhân vật lịch sử...',
    playing: '🟢 Đang phát lời thoại nhân vật...',
}

// CẤU HÌNH 2 ĐẠI SỨ DI SẢN CỦ CHI (AMBASSADORS FALLBACK & OVERRIDE)
interface AmbassadorPersona {
    id: string
    name: string
    era: string
    role: string
    desc: string
    avatar: string
    themeColor: string
    accentBorder: string
    badgeBg: string
    quickPrompts: string[]
}

const AMBASSADORS: Record<string, AmbassadorPersona> = {
    'chi-nam': {
        id: 'chi-nam',
        name: 'Chị Năm Du Kích',
        era: 'Củ Chi 1968',
        role: 'Đại sứ Đời sống & Nghĩa tình',
        desc: 'Người con gái kiên trung Đất Thép. Chị tường tận từng ngóc ngách hầm ngầm, sẵn sàng kể bạn nghe chuyện sinh hoạt kháng chiến và nghĩa tình quân dân.',
        avatar: '/media/characters/nu-du-kich.png',
        themeColor: 'text-[#fdb438]',
        accentBorder: 'border-[#fe951c]/60 shadow-[0_0_25px_rgba(254,149,28,0.25)]',
        badgeBg: 'bg-[#fe951c]/20 text-[#fdb438] border-[#fe951c]/40',
        quickPrompts: [
            'Chị Năm ơi, cuộc sống sinh hoạt dưới hầm ngầm thế nào?',
            'Bếp Hoàng Cầm hoạt động ra sao để nấu ăn mà không có khói?',
            'Tình quân dân vùng giải phóng Củ Chi những năm 1968 ra sao?',
            'Đèn dầu mù u dưới địa đạo được làm từ chất liệu gì?'
        ]
    },
    'anh-ba': {
        id: 'anh-ba',
        name: 'Anh Ba Chiến Sĩ',
        era: 'Củ Chi 1968',
        role: 'Đại sứ Kỹ thuật & Tác chiến',
        desc: 'Chuyên gia sa bàn và tác chiến du kích. Anh hướng dẫn chi tiết cấu trúc phòng thủ 3 tầng ngầm, bẫy chông tự tạo và nghệ thuật ngụy trang tài tình.',
        avatar: '/media/characters/nam-du-kich.png',
        themeColor: 'text-[#388cf1]',
        accentBorder: 'border-[#388cf1]/60 shadow-[0_0_25px_rgba(56,140,241,0.25)]',
        badgeBg: 'bg-[#388cf1]/20 text-cyan-300 border-[#388cf1]/40',
        quickPrompts: [
            'Anh Ba hãy phân tích cấu trúc địa đạo 3 tầng ngầm Củ Chi?',
            'Giải thích cơ chế hoạt động của bẫy chông kẹp nách du kích?',
            'Làm thế nào quân dân ta ngụy trang lỗ thông hơi ổ mối trước địch?',
            'Khí tài ngoài trời như xe tăng M41 Mỹ bị phá hủy bằng chiến thuật nào?'
        ]
    }
}

function sortChronological(items: ChatMessage[]): ChatMessage[] {
    return [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
    const map = new Map<string, ChatMessage>()
    for (const msg of existing) map.set(msg.id, msg)
    for (const msg of incoming) map.set(msg.id, msg)
    return sortChronological([...map.values()])
}

function TimelineDivider({ label }: { label: string }) {
    return (
        <div className="flex justify-center py-2">
      <span className="bg-[#1b1e2c] px-4 py-1 rounded-full text-xs font-bold text-gray-400 border border-white/10 shadow-sm">
        {label}
      </span>
        </div>
    )
}

export function ChatPage() {
    const { characterId: routeCharacterId } = useParams<{ characterId?: string }>()
    const [params] = useSearchParams()
    const locationId = params.get('locationId') ?? ''
    const personaParam = params.get('persona') // Nhận 'chi-nam' hoặc 'anh-ba' từ ExplorePage
    const initialCharacterId = routeCharacterId ?? params.get('characterId') ?? ''
    const questRecordKey = questRecordFromSearch(params)
    const questPrompt = params.get('questPrompt') ?? params.get('prompt') ?? ''

    const { isAuthenticated, user, updateUser } = useAuth()
    const questDialogueRecorded = useRef(false)
    const prefilledQuestPrompt = useRef(false)

    const [characters, setCharacters] = useState<Character[]>([])
    const [characterId, setCharacterId] = useState(initialCharacterId || personaParam || 'chi-nam')
    const [activePersonaKey, setActivePersonaKey] = useState<'chi-nam' | 'anh-ba'>(
        (personaParam === 'anh-ba' ? 'anh-ba' : 'chi-nam')
    )

    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [loadingOlder, setLoadingOlder] = useState(false)
    const [historyPage, setHistoryPage] = useState(0)
    const [hasOlder, setHasOlder] = useState(false)
    const [sending, setSending] = useState(false)
    const [chatLimitReached, setChatLimitReached] = useState(false)
    const [premiumBannerDismissed, setPremiumBannerDismissed] = useState(
        () => sessionStorage.getItem('premiumBannerDismissed') === '1',
    )
    const [upgrading, setUpgrading] = useState(false)
    const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle')
    const recorderRef = useRef<MediaRecorder | null>(null)
    const recordPromiseRef = useRef<Promise<Blob> | null>(null)
    const messagesScrollRef = useRef<HTMLDivElement | null>(null)
    const messagesEndRef = useRef<HTMLDivElement | null>(null)
    const loadMoreRef = useRef<HTMLDivElement | null>(null)
    const shouldStickToBottomRef = useRef(true)
    const chatStartedRef = useRef<string | null>(null)
    const { showToast } = useToast()

    // Chọn Persona hiển thị (Ưu tiên Đại sứ Củ Chi, fallback API)
    const currentAmbassador = useMemo(() => AMBASSADORS[activePersonaKey], [activePersonaKey])
    const apiCharacter = useMemo(() => characters.find((c) => c.id === characterId), [characters, characterId])

    const displayProfile = useMemo(() => {
        if (apiCharacter) {
            return {
                name: apiCharacter.name,
                era: apiCharacter.era,
                role: 'Nhân vật lịch sử AI',
                desc: 'AI trả lời theo ngữ cảnh di tích chuẩn RAG có nguồn minh bạch.',
                avatar: apiCharacter.portraitUrl,
                themeColor: 'text-[#fdb438]',
                accentBorder: 'border-[#fe951c]/50',
                badgeBg: 'bg-[#fe951c]/20 text-[#fdb438] border-[#fe951c]/40',
                quickPrompts: currentAmbassador.quickPrompts
            }
        }
        return currentAmbassador
    }, [apiCharacter, currentAmbassador])

    const voiceBusy = voicePhase !== 'idle' && voicePhase !== 'recording'
    const busy = sending || voiceBusy

    const handleUpgrade = async () => {
        try {
            setUpgrading(true)
            await profileApi.upgrade()
            updateUser({ tier: 'PREMIUM' })
            setChatLimitReached(false)
            showToast({ message: 'Đã nâng cấp Premium — trò chuyện không giới hạn!', type: 'success' })
        } catch (e) {
            showToast({ message: getFriendlyErrorMessage(e, 'chat'), type: 'error' })
        } finally {
            setUpgrading(false)
        }
    }

    const timeline = useMemo(() => buildChatTimeline(messages), [messages])

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior })
    }, [])

    const loadLatestMessages = useCallback(
        async (convId: string) => {
            setLoadingMessages(true)
            try {
                const page = await chatApi.getMessagesPage(convId, 0, MESSAGE_PAGE_SIZE, 'createdAt,desc')
                const chronological = sortChronological(page.items)
                setMessages(chronological)
                setHistoryPage(page.page)
                setHasOlder(page.page + 1 < page.totalPages)
                shouldStickToBottomRef.current = true
                requestAnimationFrame(() => scrollToBottom('auto'))
            } catch {
                showToast({ message: 'Không tải được lịch sử hội thoại.', type: 'error' })
            } finally {
                setLoadingMessages(false)
            }
        },
        [scrollToBottom, showToast],
    )

    const loadOlderMessages = useCallback(async () => {
        if (!conversationId || loadingOlder || !hasOlder) return

        const scrollEl = messagesScrollRef.current
        const prevHeight = scrollEl?.scrollHeight ?? 0

        setLoadingOlder(true)
        try {
            const nextPage = historyPage + 1
            const page = await chatApi.getMessagesPage(conversationId, nextPage, MESSAGE_PAGE_SIZE, 'createdAt,desc')
            const older = sortChronological(page.items)
            setMessages((prev) => mergeMessages(prev, older))
            setHistoryPage(nextPage)
            setHasOlder(nextPage + 1 < page.totalPages)

            requestAnimationFrame(() => {
                if (!scrollEl) return
                scrollEl.scrollTop += scrollEl.scrollHeight - prevHeight
            })
        } catch {
            showToast({ message: 'Không tải được tin nhắn cũ hơn.', type: 'error' })
        } finally {
            setLoadingOlder(false)
        }
    }, [conversationId, hasOlder, historyPage, loadingOlder, showToast])

    useEffect(() => {
        if (initialCharacterId) setCharacterId(initialCharacterId)
        if (personaParam === 'chi-nam' || personaParam === 'anh-ba') {
            setActivePersonaKey(personaParam)
        }
    }, [initialCharacterId, personaParam])

    useEffect(() => {
        if (!locationId) return
        locationsApi
            .getCharacters(locationId)
            .then((data) => {
                setCharacters(data)
                if (!characterId && data[0]) setCharacterId(data[0].id)
            })
            .catch(() => showToast({ message: 'Sử dụng chế độ Đại sứ mặc định.', type: 'info' }))
    }, [locationId, characterId, showToast])

    useEffect(() => {
        if (!characterId && !activePersonaKey) {
            setConversationId(null)
            setMessages([])
            setHasOlder(false)
            return
        }

        let cancelled = false
        const run = async () => {
            setMessages([])
            setConversationId(null)
            setHistoryPage(0)
            setHasOlder(false)

            try {
                const targetId = characterId || activePersonaKey
                const ctx = await chatApi.getContext(targetId)
                if (cancelled) return
                if (ctx.conversationId) {
                    setConversationId(ctx.conversationId)
                    await loadLatestMessages(ctx.conversationId)
                }
            } catch {
                if (!cancelled) {
                    // Bắt đầu đoạn hội thoại mới sạch sẽ
                }
            }
        }

        run()
        return () => {
            cancelled = true
        }
    }, [characterId, activePersonaKey, loadLatestMessages])

    useEffect(() => {
        if (questPrompt && !prefilledQuestPrompt.current) {
            prefilledQuestPrompt.current = true
            setInput(questPrompt)
        }
    }, [questPrompt])

    useEffect(() => {
        const root = messagesScrollRef.current
        const sentinel = loadMoreRef.current
        if (!root || !sentinel || !hasOlder) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !loadingOlder && !loadingMessages) {
                    loadOlderMessages().catch(() => undefined)
                }
            },
            { root, rootMargin: '120px', threshold: 0 },
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasOlder, loadingOlder, loadingMessages, loadOlderMessages, messages.length])

    useEffect(() => {
        if (!shouldStickToBottomRef.current) return
        scrollToBottom('auto')
    }, [messages, scrollToBottom])

    const appendExchange = (userText: string, reply: string, convId: string, sources?: ChatSource[]) => {
        setConversationId(convId)
        shouldStickToBottomRef.current = true
        setMessages((prev) =>
            mergeMessages(prev, [
                {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: userText,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: reply,
                    sources: normalizeChatSources(sources),
                    createdAt: new Date().toISOString(),
                },
            ]),
        )
    }

    const handleMessagesScroll = () => {
        const el = messagesScrollRef.current
        if (!el) return
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
        shouldStickToBottomRef.current = distanceFromBottom < 120
    }

    const send = async () => {
        const targetId = characterId || activePersonaKey
        if (!targetId || !input.trim() || busy) return
        const userText = input.trim()
        setInput('')
        shouldStickToBottomRef.current = true

        const optimistic: ChatMessage = {
            id: `local-${Date.now()}`,
            role: 'user',
            content: userText,
            createdAt: new Date().toISOString(),
        }
        const userMessageId = `user-${Date.now()}`
        const assistantId = `assistant-${Date.now()}`

        setMessages((prev) => [...prev, optimistic])

        try {
            setSending(true)
            const reply = await chatApi.send({
                characterId: targetId,
                message: userText,
                conversationId,
            })

            setConversationId(reply.conversationId)
            if (chatStartedRef.current !== targetId) {
                chatStartedRef.current = targetId
                void analyticsApi.recordEvent({
                    locationId: locationId ?? undefined,
                    eventType: 'CHARACTER_CHAT_STARTED',
                    eventKey: targetId,
                    source: 'chat',
                })
            }
            if (
                locationId &&
                questRecordKey &&
                isAuthenticated &&
                !questDialogueRecorded.current
            ) {
                questDialogueRecorded.current = true
                void recordQuestStepEngagement(questRecordKey, locationId, 'map')
            }
            setMessages((prev) => {
                const withoutOptimistic = prev.filter((m) => m.id !== optimistic.id)
                if (withoutOptimistic.some((m) => m.id === assistantId)) {
                    return withoutOptimistic.map((m) =>
                        m.id === assistantId ? { ...m, content: reply.reply } : m
                    )
                }
                return mergeMessages(withoutOptimistic, [
                    { ...optimistic, id: userMessageId },
                    {
                        id: assistantId,
                        role: 'assistant',
                        content: reply.reply,
                        sources: normalizeChatSources(reply.sources),
                        createdAt: new Date().toISOString(),
                    },
                ])
            })
        } catch (e) {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
            if (e instanceof ApiError && e.status === 422 && /giới hạn/i.test(e.message)) {
                setChatLimitReached(true)
            }
            showToast({ message: getFriendlyErrorMessage(e, 'chat'), type: 'error' })
        } finally {
            setSending(false)
        }
    }

    const toggleVoice = async () => {
        const targetId = characterId || activePersonaKey
        if (!targetId) return

        if (voicePhase === 'recording') {
            stopActiveRecorder(recorderRef.current)
            setVoicePhase('stt')
            try {
                const blob = await (recordPromiseRef.current ?? Promise.reject(new Error('No recording')))
                setVoicePhase('chat')
                const result = await voiceChatStepwise(
                    {
                        audio: blob,
                        characterId: targetId,
                        conversationId,
                    },
                    {
                        onFirstAudio: () => setVoicePhase('playing'),
                    },
                )
                appendExchange(
                    result.userText,
                    result.reply,
                    result.conversationId,
                    normalizeChatSources(result.sources),
                )
                setVoicePhase('idle')
            } catch (e) {
                setVoicePhase('idle')
                showToast({
                    message: `${getFriendlyErrorMessage(e, 'chat')} Bạn có thể gõ text thay thế.`,
                    type: 'error',
                })
            } finally {
                recorderRef.current = null
                recordPromiseRef.current = null
            }
            return
        }

        if (busy) return

        try {
            setVoicePhase('recording')
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const chunks: Blob[] = []
            const recorder = new MediaRecorder(stream)
            recorderRef.current = recorder
            recordPromiseRef.current = new Promise((resolve, reject) => {
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data)
                }
                recorder.onerror = () => reject(new Error('Ghi âm thất bại'))
                recorder.onstop = () => {
                    stream.getTracks().forEach((t) => t.stop())
                    resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
                }
            })
            recorder.start()
        } catch {
            setVoicePhase('idle')
            showToast({ message: 'Không truy cập được micro. Dùng chat text.', type: 'error' })
        }
    }

    const voiceHint = VOICE_STATUS[voicePhase]
    const showTypingIndicator = sending && messages.at(-1)?.role === 'user'

    return (
        <AppLayout
            activeBorder="left"
            topNav={<SimpleTopNav title="Phòng Đối Thoại RAG AI" showSearch />}
            mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
            mobileTitle="Trò chuyện AI"
            className="h-screen overflow-hidden bg-[#0f1015]"
        >
            <main className="flex flex-col lg:flex-row overflow-hidden p-3 md:p-6 gap-6 max-w-[1600px] mx-auto w-full mt-14 md:mt-16 h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] min-h-0">

                {/* --- CỘT TRÁI: COMMAND CENTER ĐẠI SỨ DI SẢN --- */}
                <section className="hidden lg:flex lg:h-full lg:shrink-0 w-[360px] xl:w-[400px] bg-[#161824] rounded-3xl border border-white/10 flex-col overflow-hidden relative shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#388cf1] z-20" />

                    {/* Chuyển đổi nhanh 2 Đại sứ */}
                    <div className="p-4 pb-2 bg-[#12141f] border-b border-white/10 flex items-center justify-between gap-2">
                        <button
                            onClick={() => { setActivePersonaKey('chi-nam'); setCharacterId('') }}
                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                activePersonaKey === 'chi-nam'
                                    ? 'bg-gradient-to-r from-[#fe951c] to-[#fdb438] text-black shadow-md scale-[1.02]'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                            }`}
                        >
                            <span>👩 Chị Năm Du Kích</span>
                        </button>
                        <button
                            onClick={() => { setActivePersonaKey('anh-ba'); setCharacterId('') }}
                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                activePersonaKey === 'anh-ba'
                                    ? 'bg-gradient-to-r from-[#388cf1] to-cyan-400 text-white shadow-md scale-[1.02]'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                            }`}
                        >
                            <span>👨 Anh Ba Chiến Sĩ</span>
                        </button>
                    </div>

                    {/* Khối khung ảnh Đại sứ */}
                    <div className="h-[280px] shrink-0 w-full relative overflow-hidden bg-black/60 flex items-end justify-center">
                        <img
                            alt={displayProfile.name}
                            className="h-full w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] filter contrast-105 transition-all duration-500 hover:scale-105"
                            src={displayProfile.avatar}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#161824] via-transparent to-transparent pointer-events-none" />

                        <div className="absolute bottom-4 left-4 right-4 z-20 text-left">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border mb-2 backdrop-blur-md shadow-sm text-[10px] font-black uppercase tracking-wider bg-black/60 border-white/20 text-[#fdb438]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>Ollama 3B RAG Engine · Active</span>
                            </div>
                            <h2 className="text-2xl font-black text-white leading-tight drop-shadow-md">{displayProfile.name}</h2>
                            <p className={`text-xs font-bold ${displayProfile.themeColor}`}>{displayProfile.era} — {displayProfile.role}</p>
                        </div>
                    </div>

                    {/* Chi tiết tiểu sử */}
                    <div className="p-6 flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 text-left">
                        <div className="flex flex-wrap gap-1.5">
                            <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[11px] font-bold text-gray-300">Minh bạch sử liệu</span>
                            <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[11px] font-bold text-gray-300">Nhập vai lịch sử</span>
                            <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[11px] font-bold text-gray-300">EdTech AI</span>
                        </div>

                        <p className="text-gray-300 font-medium text-xs sm:text-sm leading-relaxed bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                            {displayProfile.desc}
                        </p>

                        {characters.length > 0 && (
                            <div className="mt-auto pt-4 border-t border-white/10">
                                <label className="text-xs font-bold text-gray-400 block mb-1">Chọn nhân vật theo Di tích khác:</label>
                                <select
                                    value={characterId}
                                    onChange={(e) => setCharacterId(e.target.value)}
                                    className="w-full bg-[#1b1e2c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#fe951c]"
                                >
                                    <option value="">-- Mặc định (Đại sứ Củ Chi) --</option>
                                    {characters.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.era})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </section>

                {/* --- CỘT PHẢI: KHUNG CHAT RAG AI INTERACTIVE --- */}
                <section className="flex-1 min-h-0 h-full bg-[#161824]/90 rounded-3xl border border-white/10 flex flex-col overflow-hidden relative shadow-2xl">

                    {/* Header Mobile cho Persona */}
                    <div className="lg:hidden p-3 bg-[#12141f] border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <img src={displayProfile.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-[#fdb438]" />
                            <div className="text-left">
                                <h4 className="text-sm font-black text-white leading-none">{displayProfile.name}</h4>
                                <span className="text-[10px] text-emerald-400 font-bold">● RAG AI Sẵn sàng</span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => setActivePersonaKey('chi-nam')} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${activePersonaKey === 'chi-nam' ? 'bg-[#fe951c] text-black' : 'bg-white/10 text-white'}`}>Chị Năm</button>
                            <button onClick={() => setActivePersonaKey('anh-ba')} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${activePersonaKey === 'anh-ba' ? 'bg-[#388cf1] text-white' : 'bg-white/10 text-white'}`}>Anh Ba</button>
                        </div>
                    </div>

                    {voiceHint && (
                        <div className="px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-[#fe951c]/20 to-[#388cf1]/20 text-xs font-bold text-white flex items-center gap-2 shrink-0 animate-pulse">
                            <MaterialIcon name="graphic_eq" className="text-base text-[#fdb438]" />
                            <span>{voiceHint}</span>
                        </div>
                    )}

                    {/* Vùng lăn tin nhắn */}
                    <div
                        ref={messagesScrollRef}
                        onScroll={handleMessagesScroll}
                        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex flex-col gap-4 custom-scrollbar"
                    >
                        <div ref={loadMoreRef} className="h-px shrink-0" aria-hidden />

                        {(loadingOlder || (hasOlder && loadingMessages)) && (
                            <div className="flex justify-center py-2">
                                <span className="text-xs font-bold text-gray-400 animate-pulse">Đang nạp sử liệu hội thoại cũ...</span>
                            </div>
                        )}

                        {loadingMessages && !loadingOlder && (
                            <p className="text-center text-xs font-bold text-gray-400">Đang kết nối kho kiến thức RAG...</p>
                        )}

                        {/* Màn chào mừng Welcome & Gợi ý câu hỏi chuẩn */}
                        {messages.length === 0 && !loadingMessages && (
                            <div className="flex flex-col gap-5 max-w-2xl mx-auto my-auto text-center py-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#fe951c] to-[#388cf1] p-0.5 mx-auto shadow-xl">
                                    <div className="w-full h-full rounded-2xl bg-[#1b1e2c] flex items-center justify-center overflow-hidden">
                                        <img src={displayProfile.avatar} alt="" className="w-full h-full object-cover" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl sm:text-2xl font-black text-white">
                                        Xin chào! Tôi là <span className={displayProfile.themeColor}>{displayProfile.name}</span>
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
                                        Tôi ở đây để đồng hành và giải đáp mọi thắc mắc của bạn về lịch sử, chiến thuật và đời sống vùng Đất Thép Củ Chi. Bạn muốn bắt đầu từ đâu?
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-2">
                                    {displayProfile.quickPrompts.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setInput(prompt)}
                                            className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#fdb438]/50 text-xs font-semibold text-gray-200 hover:text-white transition-all flex items-center justify-between group cursor-pointer"
                                        >
                                            <span className="line-clamp-2">"{prompt}"</span>
                                            <MaterialIcon name="send" className="text-sm text-gray-500 group-hover:text-[#fdb438] shrink-0 ml-2" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {timeline.map((item) => {
                            if (item.type === 'day' || item.type === 'session') {
                                return <TimelineDivider key={item.key} label={item.label} />
                            }

                            const m = item.message
                            const isUser = m.role === 'user'
                            return (
                                <div key={m.id} className={`flex gap-3 max-w-[88%] sm:max-w-[80%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 shrink-0 hidden sm:block">
                                        <img alt={m.role} className="w-full h-full object-cover" src={isUser ? images.chatUserAvatar : displayProfile.avatar} />
                                    </div>

                                    <div className={`p-4 rounded-2xl border relative shadow-md text-left ${
                                        isUser
                                            ? 'bg-gradient-to-r from-[#388cf1]/30 to-[#1a79e5]/30 border-[#388cf1]/50 rounded-tr-sm text-white'
                                            : 'bg-[#1b1e2c] border-white/10 rounded-tl-sm text-gray-200'
                                    }`}>
                                        <ChatMessageContent content={m.content} />
                                        {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-white/10">
                                                <ChatSourcesBlock sources={m.sources} />
                                            </div>
                                        )}
                                        <span className="text-[10px] font-bold text-gray-400 mt-2 block text-right">
                      {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                                    </div>
                                </div>
                            )
                        })}

                        {showTypingIndicator && (
                            <div className="flex gap-3 max-w-[80%] items-end self-start">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 hidden sm:block">
                                    <img alt="ai" className="w-full h-full object-cover" src={displayProfile.avatar} />
                                </div>
                                <div className="bg-[#1b1e2c] px-4 py-3 rounded-2xl rounded-tl-sm border border-white/10 flex items-center gap-1.5 h-11">
                                    <span className="w-2 h-2 bg-[#fdb438] rounded-full animate-bounce" />
                                    <span className="w-2 h-2 bg-[#fdb438] rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-2 h-2 bg-[#fdb438] rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-px shrink-0" />
                    </div>

                    {/* Thanh nhập liệu Bar bên dưới */}
                    <div className="shrink-0 p-4 border-t border-white/10 bg-[#12141f]">
                        {messages.length > 0 && (
                            <div className="flex overflow-x-auto gap-2 pb-3 custom-scrollbar">
                                {displayProfile.quickPrompts.map((item, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setInput(item)}
                                        disabled={busy}
                                        className="shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="relative flex items-center bg-[#1b1e2c] rounded-2xl border border-white/15 focus-within:border-[#fe951c] transition-all p-1 pl-3 shadow-inner">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        send().catch(() => undefined)
                                    }
                                }}
                                disabled={busy}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-white placeholder:text-gray-500 px-2 disabled:opacity-60"
                                placeholder={`Nhắn tin cho ${displayProfile.name}...`}
                            />
                            <div className="flex items-center gap-1 pr-1">
                                <button
                                    type="button"
                                    onClick={() => toggleVoice().catch(() => undefined)}
                                    disabled={voiceBusy || sending}
                                    className={`p-2.5 transition-all rounded-xl cursor-pointer ${
                                        voicePhase === 'recording' ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                    title="Ghi âm câu hỏi"
                                >
                                    <MaterialIcon name={voicePhase === 'recording' ? 'stop_circle' : 'mic'} className="text-xl" />
                                </button>
                                <button
                                    onClick={() => send()}
                                    type="button"
                                    disabled={busy || !input.trim()}
                                    className="bg-gradient-to-r from-[#fe951c] to-[#fdb438] text-black font-black p-2.5 rounded-xl hover:scale-105 transition-all disabled:opacity-40 cursor-pointer shadow-md"
                                >
                                    <MaterialIcon name="send" className="text-xl font-bold" />
                                </button>
                            </div>
                        </div>

                        {chatLimitReached && user?.tier !== 'PREMIUM' && !premiumBannerDismissed && (
                            <div className="mt-3 p-4 rounded-2xl border border-[#fe951c]/50 bg-[#fe951c]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                                <p className="text-xs sm:text-sm text-gray-200 font-bold">
                                    ⚠️ Bạn đã hết lượt thoại miễn phí hôm nay. Nâng cấp Premium để trò chuyện không giới hạn!
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => void handleUpgrade()}
                                    disabled={upgrading}
                                    className="text-xs shrink-0 font-black bg-[#fe951c] text-black"
                                >
                                    Nâng Cấp Premium
                                </Button>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </AppLayout>
    )
}