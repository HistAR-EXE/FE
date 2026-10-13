// src/pages/ChatPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { Button } from '../components/ui/Button'
import { images } from '../assets/images'
import { resolveMediaUrl } from '../shared/config/env'
import { chatApi, normalizeChatSources, type ChatMessage, type ChatSource } from '../features/chat/api'
import { emitEvent } from '../lib/pilotEvents'
import { setActiveStationCode } from '../lib/stationSafety'
import { analyticsApi } from '../features/analytics/api'
import { buildChatTimeline } from '../features/chat/chatTimeline'
import type { MascotMode } from '../features/chat/MascotAvatar'
import { MascotCallOverlay } from '../features/chat/MascotCallOverlay'
import { answerCardLines } from '../features/chat/callCopy'
import { imagesForReply } from '../features/chat/callVisuals'
import { listenForUtterance, speakReply, startDictation, stopActiveSpeech, waitForSpeechToSettle, type VoicePhase } from '../features/chat/voice'
import { locationsApi, type Character } from '../features/locations/api'
import { gamificationApi } from '../features/gamification/api'
import { questRecordFromSearch, recordQuestStepEngagement } from '../features/gamification/questEngagement'
import { SA_BAN_FRAGMENT_CODE, SA_BAN_QUEST_KEY, SA_BAN_QUIZ, messageHasSaBanCode } from '../features/gamification/saBanFragment'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { ApiError } from '../shared/api/contracts'
import { ChatMessageContent } from '../shared/ui/ChatMessageContent'
import { useAuth } from '../shared/auth/useAuth'
import { shouldShowB2CPaywall } from '../shared/access/contentAccess'
import { QuotaExceededModal } from '../components/monetization/QuotaExceededModal'
import { OrgQuotaModal } from '../components/monetization/OrgQuotaModal'
import { billingApi } from '../features/billing/api'
import { useToast } from '../shared/ui/toast/useToast'
import { probeRagAiHealth } from '../shared/api/aiHealth'
import { resolveChatLocationId, saveSelectedLocationId } from '../features/chat/chatRoute'
import { normalizeChatPersona } from '../features/chat/chatPersona'
import { isPilotSiteCode, siteCodeFromLocationId } from '../shared/config/constants'

const MESSAGE_PAGE_SIZE = 20

const VOICE_STATUS: Record<VoicePhase, string> = {
    idle: '',
    recording: 'Chrono đang nghe',
    stt: '⚡ Đang chuyển giọng nói thành văn bản RAG...',
    chat: '🧠 Trợ lý AI đang suy nghĩ sử liệu...',
    tts: '🔊 Chrono đang tạo giọng đọc...',
    playing: '🟢 Chrono đang trả lời...',
    answered: 'Câu trả lời đang hiện',
}

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
}

const MASCOT_PROFILE: AmbassadorPersona = {
    id: 'mascot',
    name: 'Chrono',
    era: 'Sứ Giả Xuyên Không',
    role: 'Người Dẫn Đường TimeLens',
    desc: 'Được tiếp sức mạnh bởi lõi kiến trúc AI RAG, Chrono sẽ cùng bạn xuyên không về quá khứ, giải mã các mật lệnh lịch sử và kể những câu chuyện hào hùng một cách hiện đại, minh bạch và chân thực nhất.',
    avatar: '/mascot/mascot-1.png',
    themeColor: 'text-[#0275FB]',
    accentBorder: 'border-[#FDC908]/60 shadow-[0_0_25px_rgba(253,201,8,0.25)]',
    badgeBg: 'bg-[#FFF2C3] text-[#0275FB] border-[#FDC908]/40',
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

function resolveChatCharacterId(
    characterId: string,
    characters: Character[],
): string | null {
    if (characters.length === 0) return null
    return characters.find((character) => character.id === characterId)?.id
        ?? characters.find((character) => /chrono/i.test(character.name))?.id
        ?? characters[0].id
}

export function ChatPage() {
    const { i18n } = useTranslation()
    const voiceLocale = (['vi', 'en', 'ko', 'zh-CN'].includes(i18n.language) ? i18n.language : 'vi') as import('../shared/i18n').AppLocale
    const { characterId: routeCharacterId } = useParams<{ characterId?: string }>()
    const [params, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const locationId = resolveChatLocationId(params.get('locationId'))
    const personaParam = params.get('persona')
    const activePersonaKey = normalizeChatPersona(personaParam)
    const stationCode = (params.get('station') || params.get('stationCode') || '').trim().toUpperCase() || null
    const siteCode = isPilotSiteCode(params.get('site'))
        ? params.get('site')!
        : siteCodeFromLocationId(locationId)
    const initialCharacterId = routeCharacterId ?? params.get('characterId') ?? ''
    const questRecordKey = questRecordFromSearch(params)
    const questPrompt = params.get('questPrompt') ?? params.get('prompt') ?? ''

    // Gộp logic từ đồng đội: Narrative Quests
    const narrativeQuestId = params.get('questId')
    const narrativeNode = params.get('narrativeNode')
    const narrativeVersion = Number(params.get('narrativeVersion') || '') || null

    const { isAuthenticated, user } = useAuth()
    const questDialogueRecorded = useRef(false)
    const prefilledQuestPrompt = useRef(false)
    const autoSentSaBan = useRef(false)
    const autoSentQuestPrompt = useRef(false)
    const claimedQuizIds = useRef(new Set<string>())

    const [characters, setCharacters] = useState<Character[]>([])
    const [characterId, setCharacterId] = useState(initialCharacterId || activePersonaKey)

    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [chatContextReady, setChatContextReady] = useState(false)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [loadingOlder, setLoadingOlder] = useState(false)
    const [historyPage, setHistoryPage] = useState(0)
    const [hasOlder, setHasOlder] = useState(false)
    const [sending, setSending] = useState(false)
    const [chatLimitReached, setChatLimitReached] = useState(false)
    const [quotaModalOpen, setQuotaModalOpen] = useState(false)
    const [orgQuotaModalOpen, setOrgQuotaModalOpen] = useState(false)
    const [orgUpgradePackage, setOrgUpgradePackage] = useState<string | null>(null)
    const [b2cPriceVnd, setB2cPriceVnd] = useState(49_000)
    const [dailyChatLimit, setDailyChatLimit] = useState(10)
    const [premiumBannerDismissed, setPremiumBannerDismissed] = useState(
        () => sessionStorage.getItem('premiumBannerDismissed') === '1',
    )
    const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle')
    const [dictating, setDictating] = useState(false)
    const [callOpen, setCallOpen] = useState(false)
    const [callMuted, setCallMuted] = useState(false)
    const [heardText, setHeardText] = useState('')
    const [answerLines, setAnswerLines] = useState<string[]>([])
    const [callImages, setCallImages] = useState<string[]>([])
    const [hearing, setHearing] = useState(false)
    const [heardAudio, setHeardAudio] = useState(false)

    // Gộp state từ cả 2 nhánh conflict
    const [retryMessage, setRetryMessage] = useState<string | null>(null)
    const [, setAiServiceOnline] = useState<boolean | null>(null)

    const dictateStopRef = useRef<(() => void) | null>(null)
    const callRunRef = useRef(0)
    const callMutedRef = useRef(false)
    const releaseAnswerRef = useRef<(() => void) | null>(null)
    const skipAnswerRef = useRef(false)
    const replayAnswerRef = useRef<() => void>(() => undefined)
    const answerEpochRef = useRef(0)
    const conversationIdRef = useRef<string | null>(null)
    const beginCallRef = useRef<() => void>(() => undefined)
    const MASCOT_STILL = '/mascot/mascot-5.png'
    const messagesScrollRef = useRef<HTMLDivElement | null>(null)
    const messagesEndRef = useRef<HTMLDivElement | null>(null)
    const loadMoreRef = useRef<HTMLDivElement | null>(null)
    const shouldStickToBottomRef = useRef(true)
    const chatStartedRef = useRef<string | null>(null)
    const { showToast } = useToast()

    useEffect(() => {
        conversationIdRef.current = conversationId
    }, [conversationId])

    useEffect(() => {
        if (!quotaModalOpen || !shouldShowB2CPaywall(user)) return
        void analyticsApi.recordEvent({
            eventType: 'PAYWALL_CHAT_QUOTA_VIEW',
            source: 'chat',
        })
    }, [quotaModalOpen, user])

    useEffect(() => {
        billingApi
            .getPublicPricing()
            .then((data) => {
                setB2cPriceVnd(data.b2cPremiumPriceVnd)
                setDailyChatLimit(data.chatFreeDailyLimit ?? 10)
            })
            .catch(() => undefined)
    }, [])

    useEffect(() => {
        let cancelled = false
        void probeRagAiHealth().then((ok) => {
            if (!cancelled) setAiServiceOnline(ok)
        })
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (!isAuthenticated) return
        billingApi
            .getMeQuota()
            .then((data) => {
                if (data.dailyLimit > 0) setDailyChatLimit(data.dailyLimit)
            })
            .catch(() => undefined)
    }, [isAuthenticated])

    useEffect(() => {
        if (stationCode) setActiveStationCode(stationCode)
    }, [stationCode])

    // GIỮ NGUYÊN BẢN GIAO DIỆN HEAD CỦA BẠN (Fallback Persona chuẩn UI)
    const apiCharacter = useMemo(() => characters.find((c) => c.id === characterId), [characters, characterId])

    const showMascot = !apiCharacter || /chị năm|anh ba|du kích|chiến sĩ|chrono/i.test(apiCharacter.name)

    const displayProfile = useMemo(() => {
        if (!showMascot && apiCharacter) {
            return {
                name: apiCharacter.name,
                era: apiCharacter.era,
                role: 'Nhân vật lịch sử AI',
                desc: 'AI trả lời theo ngữ cảnh di tích chuẩn RAG có nguồn minh bạch.',
                avatar: apiCharacter.portraitUrl,
                themeColor: 'text-[#0275FB]',
                accentBorder: 'border-[#FDC908]/50',
                badgeBg: 'bg-[#FFF2C3] text-[#0275FB] border-[#FDC908]/40',
            }
        }
        return MASCOT_PROFILE
    }, [apiCharacter, showMascot])

    const mascotMode: MascotMode =
        dictating || voicePhase === 'recording'
            ? 'listening'
            : voicePhase === 'playing' || voicePhase === 'tts'
                ? 'speaking'
                : voicePhase === 'stt' || voicePhase === 'chat' || sending
                    ? 'thinking'
                    : 'idle'

    const voiceBusy = voicePhase !== 'idle' && voicePhase !== 'recording'
    const busy = sending || voiceBusy

    const resolvedCharacterId = useMemo(
        () => resolveChatCharacterId(characterId, characters),
        [characterId, characters],
    )

    const dismissPremiumBanner = () => {
        sessionStorage.setItem('premiumBannerDismissed', '1')
        setPremiumBannerDismissed(true)
    }

    const dismissQuotaModal = () => {
        sessionStorage.setItem('chatQuotaModalDismissed', '1')
        setQuotaModalOpen(false)
    }

    const openPricing = () => {
        void analyticsApi.recordEvent({
            eventType: 'PAYWALL_CHAT_UPGRADE_CLICK',
            source: 'chat',
        })
        const next = `${window.location.pathname}${window.location.search}`
        navigate(`/pricing?next=${encodeURIComponent(next)}`)
    }

    const timeline = useMemo(() => buildChatTimeline(messages), [messages])

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        const el = messagesScrollRef.current
        if (el) el.scrollTo({ top: el.scrollHeight, behavior })
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
        const fromUrl = params.get('locationId')?.trim()
        if (fromUrl) saveSelectedLocationId(fromUrl)
    }, [params])

    useEffect(() => {
        if (initialCharacterId) setCharacterId(initialCharacterId)
    }, [initialCharacterId])

    useEffect(() => {
        if (personaParam !== activePersonaKey) {
            const nextParams = new URLSearchParams(params)
            nextParams.set('persona', activePersonaKey)
            setSearchParams(nextParams, { replace: true })
        }
    }, [activePersonaKey, params, personaParam, setSearchParams])

    useEffect(() => {
        if (!locationId) return
        locationsApi
            .getCharacters(locationId)
            .then((data) => {
                setCharacters(data)
                if (data[0]) {
                    setCharacterId((current) => data.some((character) => character.id === current) ? current : data[0].id)
                }
            })
            .catch(() => showToast({ message: 'Không thể tải Chrono cho địa điểm này.', type: 'info' }))
    }, [locationId, characterId, showToast])

    useEffect(() => {
        if (!resolvedCharacterId) {
            setConversationId(null)
            setMessages([])
            setHasOlder(false)
            setChatContextReady(false)
            return
        }

        let cancelled = false
        const run = async () => {
            setMessages([])
            setConversationId(null)
            setHistoryPage(0)
            setHasOlder(false)
            setChatContextReady(false)

            try {
                const ctx = await chatApi.getContext(resolvedCharacterId)
                if (cancelled) return
                if (ctx.conversationId) {
                    setConversationId(ctx.conversationId)
                    await loadLatestMessages(ctx.conversationId)
                }
            } catch {
                if (!cancelled) {
                    // Bắt đầu đoạn hội thoại mới sạch sẽ
                }
            } finally {
                if (!cancelled) setChatContextReady(true)
            }
        }

        run()
        return () => {
            cancelled = true
        }
    }, [resolvedCharacterId, loadLatestMessages])

    useEffect(() => {
        if (params.get('autoSend') === '1') return
        if (questPrompt && !prefilledQuestPrompt.current) {
            prefilledQuestPrompt.current = true
            setInput(questPrompt)
        }
    }, [params, questPrompt])

    const acceptSaBanCode = useCallback((text: string) => {
        const now = new Date().toISOString()
        shouldStickToBottomRef.current = true
        setInput('')
        setMessages((prev) => [
            ...prev,
            { id: `user-${Date.now()}`, role: 'user', content: text, createdAt: now },
            {
                id: `quiz-${Date.now()}`,
                role: 'assistant',
                content: SA_BAN_QUIZ.prompt,
                createdAt: now,
                quiz: {
                    prompt: SA_BAN_QUIZ.prompt,
                    options: SA_BAN_QUIZ.options,
                    correctId: SA_BAN_QUIZ.correctId,
                    state: 'open',
                },
            },
        ])
    }, [])

    const answerSaBanQuiz = useCallback(async (messageId: string, optionId: string) => {
        const correct = optionId === SA_BAN_QUIZ.correctId
        if (correct && claimedQuizIds.current.has(messageId)) return
        if (correct) claimedQuizIds.current.add(messageId)
        setMessages((prev) => prev.map((item) => {
            if (item.id !== messageId || !item.quiz || item.quiz.state === 'correct') return item
            return { ...item, quiz: { ...item.quiz, state: correct ? 'correct' : 'wrong' } }
        }))
        if (!correct) {
            setMessages((prev) => [...prev, {
                id: `quiz-retry-${Date.now()}`,
                role: 'assistant',
                content: 'Chưa đúng. Xem lại tầng sâu nhất rồi chọn lại.',
                createdAt: new Date().toISOString(),
            }])
            return
        }
        if (!locationId) return
        try {
            const result = await gamificationApi.claimChapterBonus(locationId, SA_BAN_QUEST_KEY)
            showToast({
                message: result.alreadyClaimed
                    ? 'Bạn đã nhận điểm chương này rồi.'
                    : `Chính xác. +${result.awarded} điểm chương sa bàn`,
                type: result.alreadyClaimed ? 'info' : 'success',
            })
        } catch (error) {
            claimedQuizIds.current.delete(messageId)
            showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
        }
    }, [locationId, showToast])

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

    const recordDialogueQuest = () => {
        if (
            locationId &&
            questRecordKey &&
            questRecordKey !== SA_BAN_QUEST_KEY &&
            isAuthenticated &&
            !questDialogueRecorded.current
        ) {
            questDialogueRecorded.current = true
            void recordQuestStepEngagement(questRecordKey, locationId, 'map')
        }
    }

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
        recordDialogueQuest()
    }

    const handleMessagesScroll = () => {
        const el = messagesScrollRef.current
        if (!el) return
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
        shouldStickToBottomRef.current = distanceFromBottom < 120
    }

    useEffect(() => {
        if (autoSentSaBan.current) return
        if (params.get('autoSend') !== '1') return
        if (!messageHasSaBanCode(questPrompt)) return
        autoSentSaBan.current = true
        acceptSaBanCode(SA_BAN_FRAGMENT_CODE)
    }, [acceptSaBanCode, params, questPrompt])

    // Gộp logic retryMessage của đồng đội vào hàm send()
    const send = async (override?: string, retryMessageTarget?: ChatMessage) => {
        const pending = (override ?? input).trim()
        if (questRecordKey === SA_BAN_QUEST_KEY && messageHasSaBanCode(pending)) {
            acceptSaBanCode(pending)
            return
        }
        if (!resolvedCharacterId) {
            showToast({
                message: locationId
                    ? 'Chưa tải được nhân vật cho địa điểm này.'
                    : 'Chọn địa điểm trước khi trò chuyện.',
                type: 'error',
            })
            return
        }
        if (!pending || busy) return
        const targetId = resolvedCharacterId
        const userText = pending
        setRetryMessage(null)
        if (override === undefined) setInput('')
        shouldStickToBottomRef.current = true

        const optimistic: ChatMessage = retryMessageTarget ?? {
            id: `local-${Date.now()}`,
            role: 'user',
            content: userText,
            createdAt: new Date().toISOString(),
        }
        const userMessageId = `user-${Date.now()}`
        const assistantId = `assistant-${Date.now()}`

        setMessages((prev) => retryMessageTarget
            ? prev.map((m) => m.id === optimistic.id ? { ...m, failure: undefined } : m)
            : [...prev, optimistic])

        try {
            setSending(true)
            const guided = await chatApi.sendGuidedStream({
                characterId: targetId,
                message: userText,
                conversationId,
                stationCode,
                siteCode,
                ...({
                    narrativeQuestId,
                    narrativeNodeCode: narrativeNode,
                    narrativeVersion,
                } as unknown as Record<string, unknown>),
            }, (event) => {
                if (event.name !== 'delta' || !event.data || typeof event.data !== 'object') return
                const block = event.data as { content?: string; sources?: ChatSource[] }
                const streamedContent = block.content
                if (!streamedContent) return
                setMessages((prev) => {
                    const existing = prev.find((message) => message.id === assistantId)
                    if (existing) {
                        return prev.map((message) => message.id === assistantId
                            ? { ...message, content: `${message.content}${streamedContent}`, sources: block.sources ?? message.sources }
                            : message)
                    }
                    return [...prev, {
                        id: assistantId,
                        role: 'assistant',
                        content: streamedContent,
                        sources: block.sources ?? [],
                        createdAt: new Date().toISOString(),
                    }]
                })
            })
            const reply = {
                reply: guided.blocks.map((block) => block.content).join('\n\n'),
                conversationId: guided.conversationId ?? conversationId ?? '',
                sources: guided.sources,
            }
            emitEvent('chat_message', {
                stationCode: stationCode ?? undefined,
                payload: { hasCitation: Boolean(reply.sources?.length), stationCode, siteCode },
            })

            if (reply.conversationId) setConversationId(reply.conversationId)
            if (chatStartedRef.current !== targetId) {
                chatStartedRef.current = targetId
                void analyticsApi.recordEvent({
                    locationId: locationId ?? undefined,
                    eventType: 'CHARACTER_CHAT_STARTED',
                    eventKey: targetId,
                    source: 'chat',
                })
            }
            recordDialogueQuest()
            setMessages((prev) => {
                const withPersistedUser = prev.map((m) =>
                    m.id === optimistic.id ? { ...m, id: userMessageId } : m,
                )
                if (withPersistedUser.some((m) => m.id === assistantId)) {
                    return withPersistedUser.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: reply.reply, sources: normalizeChatSources(reply.sources) }
                            : m
                    )
                }
                return mergeMessages(withPersistedUser, [
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
            // Logic bắt lỗi và hiển thị retry của đồng đội
            const quota = e instanceof ApiError && (e.code === 'QUOTA_EXCEEDED' || e.status === 429 || (e.status === 422 && /giới hạn/i.test(e.message)))
            const retryable = !quota && !(e instanceof ApiError && (e.status === 401 || e.retryable === false))

            // Xử lý song song 2 flow (Local Retry vs Global Retry)
            if (retryMessageTarget) {
                setMessages((prev) => prev.filter((m) => m.id !== assistantId).map((m) => m.id === optimistic.id
                    ? {
                        ...m,
                        ...({ failure: { retryable, requestId: e instanceof ApiError ? e.requestId : undefined } } as unknown as Record<string, unknown>)
                    } as ChatMessage
                    : m))
            } else {
                setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
                if (retryable) setRetryMessage(userText)
            }

            if (e instanceof ApiError && (e.code === 'QUOTA_EXCEEDED' || (e.status === 403 && /quota/i.test(e.code)))) {
                setChatLimitReached(true)
                if (e.quotaType === 'ORG_MONTHLY' || user?.orgId) {
                    setOrgUpgradePackage(e.upgradePackage ?? 'STANDARD')
                    if (sessionStorage.getItem('orgQuotaModalDismissed') !== '1') {
                        setOrgQuotaModalOpen(true)
                    }
                } else if (sessionStorage.getItem('chatQuotaModalDismissed') !== '1') {
                    setQuotaModalOpen(true)
                }
            } else if (e instanceof ApiError && e.status === 422 && /giới hạn/i.test(e.message)) {
                setChatLimitReached(true)
                if (sessionStorage.getItem('chatQuotaModalDismissed') !== '1') {
                    setQuotaModalOpen(true)
                }
            } else if (e instanceof ApiError && (e.status === 503 || e.status === 500)) {
                showToast({ message: getFriendlyErrorMessage(e, 'chat'), type: 'error' })
            } else if (e instanceof ApiError && e.status === 401) {
                showToast({ message: 'Vui lòng đăng nhập để chat với trợ lý AI.', type: 'error' })
            } else {
                showToast({ message: getFriendlyErrorMessage(e, 'chat'), type: 'error' })
            }
        } finally {
            setSending(false)
        }
    }

    useEffect(() => {
        if (autoSentQuestPrompt.current || params.get('autoSend') !== '1' || !questPrompt) return
        if (messageHasSaBanCode(questPrompt) || !resolvedCharacterId || !chatContextReady || busy) return
        autoSentQuestPrompt.current = true
        const nextParams = new URLSearchParams(params)
        nextParams.delete('autoSend')
        setSearchParams(nextParams, { replace: true })
        void send(questPrompt)
    }, [busy, chatContextReady, params, questPrompt, resolvedCharacterId, send, setSearchParams])

    const stopDictation = () => {
        dictateStopRef.current?.()
        dictateStopRef.current = null
        setDictating(false)
    }

    const toggleDictate = () => {
        if (dictateStopRef.current) {
            stopDictation()
            return
        }
        const session = startDictation((text) => setInput(text), voiceLocale)
        if (!session) {
            showToast({
                message: 'Trình duyệt này không đổi giọng nói thành chữ. Hãy dùng Chrome hoặc Edge.',
                type: 'error',
            })
            return
        }
        dictateStopRef.current = session.stop
        setDictating(true)
    }

    const hangUp = () => {
        callRunRef.current += 1
        callMutedRef.current = false
        stopActiveSpeech()
        setHeardText('')
        setAnswerLines([])
        setCallImages([])
        setHearing(false)
        setHeardAudio(false)
        answerEpochRef.current += 1
        releaseAnswerRef.current?.()
        releaseAnswerRef.current = null
        setVoicePhase('idle')
        setCallMuted(false)
        setCallOpen(false)
    }

    const beginCall = () => {
        if (!resolvedCharacterId) {
            showToast({
                message: locationId
                    ? 'Chưa tải được nhân vật cho địa điểm này.'
                    : 'Chọn địa điểm trước khi trò chuyện.',
                type: 'error',
            })
            return
        }
        stopDictation()
        const runId = callRunRef.current + 1
        callRunRef.current = runId
        callMutedRef.current = false
        setCallMuted(false)
        setCallOpen(true)
        setHeardText('')
        setAnswerLines([])
        setCallImages([])
        const targetId = resolvedCharacterId
        const personaKey = activePersonaKey

        const loop = async () => {
            while (callRunRef.current === runId) {
                if (callMutedRef.current) {
                    setVoicePhase('idle')
                    await new Promise((resolve) => window.setTimeout(resolve, 250))
                    continue
                }
                setVoicePhase('recording')
                setAnswerLines([])
                setCallImages([])
                setHeardText('')
                let said: string
                try {
                    said = await listenForUtterance(
                        (text) => setHeardText(text),
                        () => callRunRef.current !== runId || callMutedRef.current,
                        voiceLocale,
                    )
                } catch (error) {
                    if (callRunRef.current !== runId) return
                    setVoicePhase('idle')
                    callMutedRef.current = true
                    setCallMuted(true)
                    showToast({
                        message: error instanceof Error && error.message === 'not-allowed'
                            ? 'Hãy cho phép micro, rồi bật mic trên cuộc gọi.'
                            : 'Trình duyệt không nghe được. Hãy dùng Chrome hoặc Edge.',
                        type: 'error',
                    })
                    continue
                }
                if (callRunRef.current !== runId || callMutedRef.current) continue
                if (!said) {
                    await new Promise((resolve) => window.setTimeout(resolve, 400))
                    continue
                }
                try {
                    setVoicePhase('chat')
                    const reply = await chatApi.send({
                        characterId: targetId,
                        message: said,
                        conversationId: conversationIdRef.current,
                        stationCode,
                        siteCode,
                    })
                    if (callRunRef.current !== runId) return
                    conversationIdRef.current = reply.conversationId
                    appendExchange(said, reply.reply, reply.conversationId, normalizeChatSources(reply.sources))
                    setHeardText(said)
                    setAnswerLines(answerCardLines(reply.reply))
                    setCallImages(imagesForReply(reply.reply))
                    setHeardAudio(false)
                    setHearing(false)
                    skipAnswerRef.current = false
                    const epoch = answerEpochRef.current
                    setVoicePhase('playing')
                    const stillThisAnswer = () =>
                        callRunRef.current === runId && answerEpochRef.current === epoch
                    const playThis = () => {
                        if (!stillThisAnswer()) return
                        stopActiveSpeech()
                        setVoicePhase('playing')
                        setHearing(false)
                        void speakReply(reply.reply, personaKey, {
                            onAudible: () => {
                                if (!stillThisAnswer()) return
                                setHearing(true)
                                setHeardAudio(true)
                            },
                        }, voiceLocale).then((end) => {
                            if (!stillThisAnswer() || end === 'stopped') return
                            setHearing(false)
                            setHeardAudio(end === 'played')
                            setVoicePhase('answered')
                        })
                    }
                    replayAnswerRef.current = playThis
                    const result = await speakReply(reply.reply, personaKey, {
                        onAudible: () => {
                            if (!stillThisAnswer()) return
                            setHearing(true)
                            setHeardAudio(true)
                        },
                    }, voiceLocale)
                    if (callRunRef.current !== runId) return
                    if (stillThisAnswer() && result !== 'stopped') {
                        setHearing(false)
                        setHeardAudio(result === 'played')
                        setVoicePhase('answered')
                    }
                    if (!skipAnswerRef.current) {
                        await new Promise<void>((resolve) => {
                            if (callRunRef.current !== runId || skipAnswerRef.current) {
                                resolve()
                                return
                            }
                            releaseAnswerRef.current = () => {
                                releaseAnswerRef.current = null
                                resolve()
                            }
                        })
                    }
                    skipAnswerRef.current = false
                    if (callRunRef.current !== runId) return
                    await waitForSpeechToSettle()
                    if (callRunRef.current !== runId) return
                    setAnswerLines([])
                    setCallImages([])
                    setHearing(false)
                    setHeardAudio(false)
                } catch (error) {
                    if (callRunRef.current !== runId) return
                    showToast({ message: getFriendlyErrorMessage(error, 'chat'), type: 'error' })
                }
            }
            if (callRunRef.current === runId) setVoicePhase('idle')
        }
        void loop()
    }
    useEffect(() => {
        beginCallRef.current = beginCall
    })

    useEffect(() => {
        if (params.get('call') !== '1') return
        beginCallRef.current()
        const next = new URLSearchParams(params)
        next.delete('call')
        setSearchParams(next, { replace: true })
    }, [params, setSearchParams])

    const voiceHint = VOICE_STATUS[voicePhase]
    const showTypingIndicator = sending && messages.at(-1)?.role === 'user'

    return (
        <AppLayout
            activeBorder="left"
            mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
            mobileTitle="Trò chuyện AI"
            className="h-screen max-h-screen overflow-hidden !bg-[#DCEBFF]"
        >
            {/* ───────── NỀN: xanh nhạt đậm hơn hai thẻ để thẻ trắng "nổi" lên ───────── */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#DCEBFF]">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#C7DDFF_0%,#DCEBFF_40%,#EEF5FF_66%,#FFF2C3_100%)]" />
                <div className="absolute -top-32 -left-24 h-[460px] w-[460px] rounded-full bg-[#0275FB]/25 blur-[120px]" />
                <div className="absolute -bottom-32 -right-24 h-[480px] w-[480px] rounded-full bg-[#FDC908]/40 blur-[120px]" />
                <div className="absolute inset-0 bg-[radial-gradient(#0275FB_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.10]" />
            </div>

            {/* KHUNG NỘI DUNG CHÍNH: pt-[4.25rem] chừa chỗ cho thanh trên cố định của mobile (h-14) */}
            <main className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto px-3 pb-3 pt-[4.25rem] md:p-6 flex flex-col lg:flex-row gap-5 lg:gap-6 relative z-10">

                {/* ───────── CỘT TRÁI: TRỢ LÝ TƯƠNG TÁC ───────── */}
                <section className="hidden lg:flex lg:h-full lg:shrink-0 w-[360px] xl:w-[400px] bg-white rounded-3xl border-2 border-[#0275FB]/25 flex-col overflow-hidden relative shadow-[0_24px_60px_-14px_rgba(2,117,251,0.38)]">
                    {/* Thanh tiêu đề xanh thương hiệu + vạch vàng */}
                    <div className="relative shrink-0 bg-gradient-to-r from-[#0275FB] via-[#0A66E8] to-[#015CC8] px-5 py-4 text-left">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#FDC908] via-[#FFF2C3] to-[#FDC908]" />
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FFF2C3]">Trợ Lý Tương Tác</p>
                        <p className="text-base font-black text-white">Đồng hành cùng Chrono</p>
                    </div>

                    {/* Vùng mascot: nền kem ấm để tách khỏi nền xanh của trang */}
                    <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-gradient-to-b from-[#FFF2C3] via-[#FFF8DC] to-white flex flex-col items-center justify-center pt-12 pb-24">
                        <div className="absolute inset-0 bg-[radial-gradient(#0275FB_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.07] pointer-events-none" />

                        <style>
                            {`
                            @keyframes organicFloat {
                                0%, 100% { transform: translateY(0px) rotate(0deg); }
                                25% { transform: translateY(-8px) rotate(-1.5deg); }
                                50% { transform: translateY(3px) rotate(0deg); }
                                75% { transform: translateY(-5px) rotate(1.5deg); }
                            }
                            @keyframes shadowBreathe {
                                0%, 100% { transform: scale(1); opacity: 0.5; }
                                25% { transform: scale(0.8); opacity: 0.2; }
                                50% { transform: scale(1.1); opacity: 0.6; }
                                75% { transform: scale(0.85); opacity: 0.3; }
                            }
                            @keyframes portalPulse {
                                0%, 100% { transform: scale(1); opacity: 0.7; }
                                50% { transform: scale(1.05); opacity: 0.4; }
                            }
                            .mascot-float { animation: organicFloat 6s ease-in-out infinite; }
                            .mascot-shadow { animation: shadowBreathe 6s ease-in-out infinite; }
                            .portal-glow { animation: portalPulse 4s ease-in-out infinite; }
                            `}
                        </style>

                        {/* KHUNG CHỨA TỔNG LẤY MASCOT LÀM TRUNG TÂM */}
                        <div className="relative z-10 w-48 h-48 sm:w-56 sm:h-56 flex flex-col items-center justify-center mt-6">

                            {/* HIỆU ỨNG CÁNH CỔNG KHÔNG THỜI GIAN */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-0">
                                <div className="absolute w-64 h-64 bg-[radial-gradient(circle,#FFFFFF_0%,rgba(253,201,8,0.28)_45%,rgba(2,117,251,0.14)_62%,transparent_72%)] blur-xl portal-glow" />
                                <div className="absolute w-[260px] h-[260px] border-[3px] border-dashed border-[#0275FB]/40 rounded-full animate-[spin_20s_linear_infinite]" />
                                <div className="absolute w-[220px] h-[220px] border-[2px] border-dotted border-[#FDC908] rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                                <div className="absolute w-[180px] h-[180px] border border-[#0275FB]/25 rounded-full animate-[spin_10s_linear_infinite]" />
                            </div>

                            {showMascot ? (
                                <>
                                    <img
                                        src={MASCOT_STILL}
                                        alt="Chrono Mascot"
                                        className={`w-full h-full object-contain relative z-10 drop-shadow-[0_15px_25px_rgba(2,117,251,0.25)] transition-all duration-500 ${
                                            mascotMode === 'thinking' ? 'animate-pulse' : 'mascot-float'
                                        }`}
                                    />
                                    <div className="absolute -bottom-3 w-24 h-2 bg-[#0275FB]/25 blur-[4px] rounded-[100%] mascot-shadow" />
                                </>
                            ) : (
                                <img
                                    alt={displayProfile.name}
                                    className="h-full w-auto object-contain mx-auto drop-shadow-xl z-10 relative rounded-full border-4 border-white"
                                    src={resolveMediaUrl(displayProfile.avatar)}
                                />
                            )}
                        </div>

                        <div className="absolute bottom-5 left-5 right-5 z-20 text-left">
                            <h2 className="text-3xl font-black text-[#0F1B33] leading-tight mb-1">{displayProfile.name}</h2>
                            <p className={`text-sm font-bold ${displayProfile.themeColor}`}>{displayProfile.era}</p>
                        </div>
                    </div>

                    {/* Chi tiết: 3 chip xanh – vàng – kem (GIỮ NGUYÊN GIAO DIỆN HEAD) */}
                    <div className="p-5 shrink-0 flex flex-col gap-4 text-left bg-white relative z-10 border-t-2 border-[#FDC908]/50">
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1.5 bg-[#FDC908] rounded-full text-[11px] font-black text-[#0F1B33] shadow-sm">Minh bạch sử liệu</span>
                            <span className="px-3 py-1.5 bg-[#FDC908] rounded-full text-[11px] font-black text-[#0F1B33] shadow-sm">Nhập vai lịch sử</span>
                            <span className="px-3 py-1.5 bg-[#FDC908] rounded-full text-[11px] font-black text-[#0F1B33] shadow-sm">Lõi AI RAG</span>
                        </div>

                        <div className="bg-[#EAF3FF] p-4 rounded-2xl border border-[#0275FB]/30 shadow-sm mt-1">
                            <div className="flex items-center gap-1.5 mb-2.5">
                                <MaterialIcon name="memory" className="text-[#0275FB] text-[18px]" />
                                <span className="text-xs font-black uppercase tracking-wider text-[#0275FB]">Hạt Nhân Sức Mạnh AI</span>
                            </div>
                            <p className="text-[#0F1B33] font-medium text-sm leading-relaxed">
                                {displayProfile.desc}
                            </p>
                        </div>
                    </div>
                </section>

                {/* ───────── CỘT PHẢI: KHUNG CHAT ───────── */}
                <section className="flex-1 min-h-0 h-full bg-white rounded-3xl border-2 border-[#0275FB]/25 flex flex-col overflow-hidden relative shadow-[0_24px_60px_-14px_rgba(2,117,251,0.38)]">

                    {/* Thanh tiêu đề xanh (mọi kích thước màn hình) + trạng thái giọng nói */}
                    <header className="relative shrink-0 bg-gradient-to-r from-[#0275FB] via-[#0A66E8] to-[#015CC8] px-4 sm:px-6 py-3.5 flex items-center gap-3 text-left">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#FDC908] via-[#FFF2C3] to-[#FDC908]" />
                        <div className="h-11 w-11 shrink-0 rounded-full bg-white ring-2 ring-[#FDC908] flex items-center justify-center overflow-hidden shadow-md">
                            {showMascot ? (
                                <img src={MASCOT_STILL} alt="" className="h-9 w-9 object-contain" />
                            ) : (
                                <img src={resolveMediaUrl(displayProfile.avatar)} alt="" className="h-full w-full object-cover" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-[15px] font-black text-white leading-tight truncate">{displayProfile.name}</h4>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-[#FFF2C3] truncate">
                                {voiceHint ? (
                                    <>
                                        <MaterialIcon name="graphic_eq" className="text-[15px] text-[#FDC908] animate-pulse shrink-0" />
                                        <span className="truncate">{voiceHint}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#FDC908] animate-pulse" />
                                        <span className="truncate">Trợ lý lịch sử sẵn sàng</span>
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Các nút công cụ & Trạng thái Chrono */}
                        <div className="flex items-center gap-2.5">
                            {/* Badge trạng thái thay thế cho Lõi AI RAG */}
                            {/* Badge trạng thái AI (UI Mới: Tương phản cao & Hiệu ứng Online Glow) */}
                            <div className="hidden sm:inline-flex items-center gap-2.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-black text-[#0275FB] shadow-[0_2px_10px_rgba(0,0,0,0.15)]">
                                {/* Chấm trạng thái có hiệu ứng Ping (nhịp đập) */}
                                <span className="relative flex h-2.5 w-2.5">
                                    {mascotMode === 'idle' ? (
                                        <>
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
                                        </>
                                    ) : mascotMode === 'listening' ? (
                                        <>
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FDC908] opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FDC908] shadow-[0_0_6px_rgba(253,201,8,0.6)]"></span>
                                        </>
                                    )}
                                </span>

                                <span className="uppercase tracking-wider">
                                    {mascotMode === 'listening'
                                        ? 'Đang nghe'
                                        : mascotMode === 'thinking'
                                            ? 'Đang suy nghĩ'
                                            : mascotMode === 'speaking'
                                                ? 'Đang nói'
                                                : 'Sẵn sàng'}
                                </span>
                            </div>

                            {/* Nút Video Call */}
                            {showMascot && (
                                <button
                                    type="button"
                                    onClick={() => beginCall()}
                                    disabled={voiceBusy || sending}
                                    className="h-9 w-9 flex items-center justify-center rounded-full bg-[#FDC908] text-[#0F1B33] hover:bg-[#ffd633] hover:shadow-md transition-all cursor-pointer disabled:opacity-40"
                                    title="Gọi Video cùng Chrono"
                                >
                                    <MaterialIcon name="videocam" className="text-[18px]" />
                                </button>
                            )}
                        </div>
                    </header>

                    <div
                        ref={messagesScrollRef}
                        onScroll={handleMessagesScroll}
                        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 flex flex-col gap-5 custom-scrollbar bg-gradient-to-b from-[#EAF3FF] to-[#F8FBFF]"
                    >
                        <div ref={loadMoreRef} className="h-px shrink-0" aria-hidden />

                        {(loadingOlder || (hasOlder && loadingMessages)) && (
                            <div className="flex justify-center py-2">
                                <span className="text-xs font-bold text-[#0275FB] animate-pulse">Đang nạp sử liệu hội thoại cũ...</span>
                            </div>
                        )}

                        {loadingMessages && !loadingOlder && (
                            <p className="text-center text-xs font-bold text-[#0275FB]">Đang kết nối kho kiến thức RAG...</p>
                        )}

                        {/* HIỂN THỊ XUYÊN SUỐT Ở ĐẦU CUỘC TRÒ CHUYỆN */}
                        {!loadingMessages && (
                            <div className="flex flex-col gap-4 max-w-xl mx-auto text-center py-6 pb-8 border-b border-[#0275FB]/10 mb-4 shrink-0">
                                <div className={`mx-auto ${showMascot ? 'h-32 w-28 lg:hidden' : 'w-24 h-24'}`}>
                                    {showMascot ? (
                                        <img src={MASCOT_STILL} alt="" className="h-full w-full object-contain drop-shadow-2xl" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#FDC908] to-[#0275FB] p-1 mx-auto shadow-xl">
                                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white">
                                                <img src={resolveMediaUrl(displayProfile.avatar)} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 drop-shadow-sm">
                                        Xin chào! Mình là <span className={displayProfile.themeColor}>{displayProfile.name}</span>
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-700 font-medium leading-relaxed">
                                        Người dẫn đường thực thụ xuyên không về quá khứ. Hãy hỏi mình bất kỳ điều gì, mình sẽ giải mã bằng tư liệu minh bạch nhất!
                                    </p>
                                </div>
                                {/* Gợi ý nhanh: bấm là gửi luôn */}
                                <div className="flex flex-wrap justify-center gap-2.5 mt-2">
                                    {[
                                        'Hãy kể cho mình nghe về di tích này.',
                                        'Hiện vật nào ở đây đáng chú ý nhất?',
                                    ].map((prompt) => (
                                        <button
                                            key={prompt}
                                            type="button"
                                            disabled={busy}
                                            onClick={() => void send(prompt)}
                                            className="rounded-full border border-[#0275FB]/25 bg-white px-4 py-2 text-xs sm:text-[13px] font-bold text-[#0275FB] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0275FB] hover:bg-[#F4F9FF] hover:shadow-md disabled:opacity-40 disabled:hover:translate-y-0 cursor-pointer"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {timeline.map((item) => {
                            if (item.type === 'day' || item.type === 'session') {
                                return (
                                    <div key={item.key} className="flex justify-center py-3">
                                        <span className="bg-[#FFF2C3] px-4 py-1.5 rounded-full text-xs font-black text-[#7A5B00] shadow-sm border border-[#FDC908]/60">
                                            {item.label}
                                        </span>
                                    </div>
                                )
                            }

                            const m = item.message
                            const isUser = m.role === 'user'
                            return (
                                <div key={m.id} className={`flex gap-3 max-w-[90%] sm:max-w-[85%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                    <div className={`w-9 shrink-0 hidden sm:block ${showMascot && !isUser ? 'h-12' : 'h-9 rounded-full overflow-hidden border-2 border-white ring-2 ring-[#0275FB]/30 shadow-sm'}`}>
                                        {showMascot && !isUser ? (
                                            <img src={MASCOT_STILL} alt={m.role} className="h-full w-full object-contain drop-shadow" />
                                        ) : (
                                            <img alt={m.role} className="w-full h-full object-cover" src={isUser ? images.chatUserAvatar : resolveMediaUrl(displayProfile.avatar)} />
                                        )}
                                    </div>

                                    <div className={`p-4 rounded-2xl relative text-left ${
                                        isUser
                                            ? 'bg-gradient-to-br from-[#0275FB] to-[#015CC8] text-white rounded-tr-sm shadow-[0_10px_24px_-8px_rgba(2,117,251,0.55)]'
                                            : 'bg-white text-gray-800 rounded-tl-sm border-2 border-[#FDC908]/50 shadow-[0_10px_26px_-10px_rgba(2,117,251,0.35)]'
                                    }`}>
                                        <ChatMessageContent content={m.content} className={isUser ? "text-white" : "text-gray-800"} />

                                        {/* Đã chỉnh sửa UI báo lỗi của đồng đội (Dark Mode) sang Light Mode cho hợp mắt */}
                                        {(() => {
                                            const msgObj = m as unknown as { failure?: { requestId?: string; retryable?: boolean } };
                                            return msgObj.failure ? (
                                                <div role="status" className="mt-3 pt-3 border-t border-red-200 text-xs text-red-600">
                                                    <p className="font-medium">Chưa nhận được câu trả lời. Câu hỏi của bạn vẫn được giữ lại.</p>
                                                    {msgObj.failure.requestId && <p className="mt-1 opacity-70">Mã yêu cầu: {msgObj.failure.requestId}</p>}
                                                    {msgObj.failure.retryable && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void send(m.content, m)}
                                                            disabled={busy}
                                                            className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm font-bold text-red-600 disabled:opacity-40 cursor-pointer hover:bg-red-100 transition-colors"
                                                        >
                                                            Thử gửi lại
                                                        </button>
                                                    )}
                                                </div>
                                            ) : null;
                                        })()}

                                        {m.quiz && (
                                            <div className="mt-4 flex flex-col gap-2">
                                                {m.quiz.options.map((option) => (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        disabled={m.quiz?.state === 'correct'}
                                                        onClick={() => void answerSaBanQuiz(m.id, option.id)}
                                                        className="rounded-xl border-2 border-[#0275FB]/20 bg-[#F4F9FF] px-4 py-2.5 text-left text-sm font-bold text-[#0F1B33] hover:border-[#0275FB] hover:bg-[#FFF2C3] disabled:cursor-default disabled:opacity-60 cursor-pointer transition-colors"
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {m.role === 'assistant' &&
                                            shouldShowB2CPaywall(user) &&
                                            (!m.sources || m.sources.length === 0) && (
                                                <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-[#0275FB] font-medium">
                                                    ✨ Nâng cấp Premium để xem nguồn tài liệu chính thống kèm câu trả lời.
                                                </p>
                                            )}
                                        {m.role === 'assistant' &&
                                            !shouldShowB2CPaywall(user) &&
                                            (m.sources?.length ?? 0) > 0 && (
                                                <section className="mt-4 border-t border-[#0275FB]/15 pt-3 bg-[#EAF3FF] -mx-4 -mb-4 p-4 rounded-b-2xl" aria-label="Nguồn kho tư liệu di tích">
                                                    <p className="text-xs font-black uppercase tracking-wider text-[#0275FB] mb-2 flex items-center gap-1">
                                                        <MaterialIcon name="library_books" className="text-[14px]" />
                                                        Nguồn tư liệu trích xuất
                                                    </p>
                                                    <ul className="space-y-2">
                                                        {m.sources!.map((source, index) => (
                                                            <li key={`${source.title}-${index}`} className="text-xs text-gray-600">
                                                                {source.url ? (
                                                                    <a className="font-bold text-[#0275FB] hover:underline" href={source.url} target="_blank" rel="noreferrer">
                                                                        {source.title}
                                                                    </a>
                                                                ) : (
                                                                    <span className="font-bold text-gray-700">{source.title}</span>
                                                                )}
                                                                {source.excerpt && <p className="mt-1 text-gray-500 italic border-l-2 border-[#FDC908] pl-2">{source.excerpt}</p>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </section>
                                            )}
                                        <span className={`text-[10px] font-bold mt-2 block text-right ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}

                        {showTypingIndicator && (
                            <div className="flex gap-3 max-w-[80%] items-end self-start">
                                <div className={`w-9 hidden sm:block ${showMascot ? 'h-12' : 'h-9 rounded-full overflow-hidden border-2 border-white ring-2 ring-[#0275FB]/30'}`}>
                                    {showMascot ? (
                                        <img src={MASCOT_STILL} alt="ai" className="h-full w-full object-contain" />
                                    ) : (
                                        <img alt="ai" className="w-full h-full object-cover" src={resolveMediaUrl(displayProfile.avatar)} />
                                    )}
                                </div>
                                <div className="bg-white px-5 py-4 rounded-2xl rounded-tl-sm border-2 border-[#FDC908]/50 flex items-center gap-2 h-12 shadow-[0_10px_26px_-10px_rgba(2,117,251,0.35)]">
                                    <span className="w-2.5 h-2.5 bg-[#FDC908] rounded-full animate-bounce" />
                                    <span className="w-2.5 h-2.5 bg-[#FDC908] rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-2.5 h-2.5 bg-[#0275FB] rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-px shrink-0" />
                    </div>

                    {/* ───────── Ô NHẬP ───────── */}
                    <div className="shrink-0 p-4 sm:p-6 bg-white border-t-2 border-[#0275FB]/15 shadow-[0_-8px_24px_-12px_rgba(2,117,251,0.25)] z-20 relative">
                        {/* CỦA ĐỒNG ĐỘI: Hồ sơ điều tra (Narrative Quest) - Đã làm đẹp chuẩn Light Mode */}
                        {narrativeQuestId && narrativeNode && (
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[#FDC908]/50 bg-[#FFF2C3]/50 px-4 py-2.5 text-xs text-[#0F1B33]">
                                <span><strong className="text-[#0275FB]">Hồ sơ điều tra:</strong> câu hỏi này sẽ được Chrono dùng để kiểm chứng bước “{narrativeNode.replaceAll('-', ' ')}”.</span>
                                <button type="button" onClick={() => navigate(`/quests/${narrativeQuestId}`)} className="font-black text-[#0275FB] underline hover:text-blue-700 cursor-pointer">Quay lại hồ sơ</button>
                            </div>
                        )}

                        {/* Nút gửi lại của bạn (Retry) */}
                        {retryMessage && (
                            <button
                                type="button"
                                onClick={() => void send(retryMessage)}
                                disabled={busy}
                                className="mb-3 rounded-full bg-red-50 text-red-600 px-4 py-2 text-sm font-bold border border-red-200 disabled:opacity-40 cursor-pointer flex items-center gap-2 hover:bg-red-100 transition-colors"
                            >
                                <MaterialIcon name="refresh" className="text-[16px]" />
                                Thử gửi lại tin nhắn
                            </button>
                        )}

                        <div className="relative flex items-center bg-[#F2F7FF] rounded-full border-2 border-[#0275FB]/25 focus-within:border-[#0275FB] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0275FB]/15 transition-all p-1.5 pl-5 shadow-sm">
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
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm md:text-base font-medium text-[#0F1B33] placeholder:text-slate-400 px-2 disabled:opacity-60 outline-none"
                                placeholder={dictating ? 'Đang nghe, chữ hiện ở đây…' : `Nhắn tin cho ${displayProfile.name}...`}
                            />
                            <div className="flex items-center gap-1.5 pr-1">
                                {/* Nút Giọng nói (Micro) */}
                                <button
                                    type="button"
                                    onClick={toggleDictate}
                                    disabled={voiceBusy || sending || callOpen}
                                    className={`h-10 w-10 shrink-0 flex items-center justify-center transition-all rounded-full cursor-pointer ${
                                        dictating ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-[#FFF2C3] text-[#0275FB] hover:bg-[#FDC908] hover:text-[#0F1B33]'
                                    }`}
                                    title={dictating ? 'Dừng nhập bằng giọng nói' : 'Nhập bằng giọng nói'}
                                >
                                    <MaterialIcon name={dictating ? 'stop_circle' : 'mic'} className="text-xl" />
                                </button>
                                {/* Nút Gửi */}
                                <button
                                    onClick={() => send()}
                                    type="button"
                                    disabled={busy || dictating || !input.trim()}
                                    className="h-10 w-10 shrink-0 flex items-center justify-center bg-gradient-to-br from-[#0275FB] to-[#015CC8] text-white rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0 cursor-pointer shadow-md"
                                    title="Gửi"
                                >
                                    <MaterialIcon name="send" className="text-xl ml-1" />
                                </button>
                            </div>
                        </div>

                        {chatLimitReached && shouldShowB2CPaywall(user) && !premiumBannerDismissed && (
                            <div className="mt-4 p-4 rounded-2xl border-2 border-[#FDC908]/60 bg-[#FFF2C3]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                                <p className="text-xs sm:text-sm text-[#0F1B33] font-bold">
                                    ⚠️ Bạn đã hết lượt thoại miễn phí hôm nay. Nâng cấp Premium để trò chuyện không giới hạn!
                                </p>
                                <div className="flex gap-2 shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={dismissPremiumBanner}
                                        className="text-xs font-bold text-gray-600 bg-white"
                                    >
                                        Để sau
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={openPricing}
                                        className="text-xs font-black bg-[#0275FB] text-white hover:bg-blue-700"
                                    >
                                        Nâng Cấp Premium
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <QuotaExceededModal
                open={quotaModalOpen && shouldShowB2CPaywall(user)}
                onClose={dismissQuotaModal}
                onUpgrade={openPricing}
                dailyLimit={dailyChatLimit}
                priceVnd={b2cPriceVnd}
                pricingHref={`/pricing?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`}
            />
            <OrgQuotaModal
                open={orgQuotaModalOpen}
                onClose={() => {
                    sessionStorage.setItem('orgQuotaModalDismissed', '1')
                    setOrgQuotaModalOpen(false)
                }}
                upgradePackage={orgUpgradePackage}
            />
            <MascotCallOverlay
                open={callOpen && showMascot}
                name={displayProfile.name}
                mode={mascotMode}
                status={
                    hearing
                        ? 'Chrono đang nói. Nút xanh là tiếng đang phát.'
                        : callMuted
                            ? 'Mic đang tắt. Bấm Mic để nói tiếp.'
                            : voicePhase === 'playing' || voicePhase === 'tts'
                                ? 'Đang chuẩn bị tiếng. Nếu im, bấm Nghe.'
                                : voicePhase === 'answered'
                                    ? heardAudio
                                        ? 'Đã nói xong. Bấm Nghe lại, hoặc Tiếp tục để hỏi câu mới.'
                                        : 'Câu trả lời đã hiện. Bấm nút Nghe để nghe Chrono.'
                                    : voicePhase === 'chat' || voicePhase === 'stt'
                                        ? 'Chrono đang soạn câu trả lời.'
                                        : 'Mic đang mở. Hãy nói.'
                }
                recording={voicePhase === 'recording'}
                heardText={heardText}
                answerLines={answerLines}
                images={callImages}
                speaking={voicePhase === 'playing' || voicePhase === 'answered'}
                hearing={hearing}
                heardAudio={heardAudio}
                analyser={null}
                muted={callMuted}
                onToggleMute={() => {
                    const next = !callMutedRef.current
                    callMutedRef.current = next
                    setCallMuted(next)
                    if (next) stopActiveSpeech()
                }}
                onHangUp={hangUp}
                onHear={() => replayAnswerRef.current()}
                onContinue={() => {
                    answerEpochRef.current += 1
                    stopActiveSpeech()
                    setHearing(false)
                    skipAnswerRef.current = true
                    releaseAnswerRef.current?.()
                }}
            />
        </AppLayout>
    )
}