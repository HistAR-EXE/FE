// src/pages/ChatPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { Button } from '../components/ui/Button'
import { images } from '../assets/images'
import { resolveMediaUrl } from '../shared/config/env'
import { chatApi, normalizeChatSources, type ChatMessage, type ChatSource } from '../features/chat/api'
import { emitEvent } from '../lib/pilotEvents'
import { setActiveStationCode } from '../lib/stationSafety'
import { ReportContentButton } from '../components/feedback/ReportContentModal'
import { analyticsApi } from '../features/analytics/api'
import { buildChatTimeline } from '../features/chat/chatTimeline'
import type { MascotMode } from '../features/chat/MascotAvatar'
import { MascotCallOverlay } from '../features/chat/MascotCallOverlay'
import { MascotStage } from '../features/chat/MascotStage'
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
import { isPilotSiteCode, siteCodeFromLocationId } from '../shared/config/constants'

const MESSAGE_PAGE_SIZE = 20

const VOICE_STATUS: Record<VoicePhase, string> = {
    idle: '',
    recording: 'Chrono đang nghe',
    stt: '⚡ Đang chuyển giọng nói thành văn bản RAG...',
    chat: '🧠 Trợ lý AI đang suy nghĩ sử liệu...',
    tts: '🔊 Đang tạo giọng đọc nhân vật lịch sử...',
    playing: '🟢 Đang phát lời thoại nhân vật...',
    answered: 'Câu trả lời đang hiện',
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
}

const MASCOT_PROFILE: AmbassadorPersona = {
    id: 'mascot',
    name: 'Chrono',
    era: 'TimeLens',
    role: 'Linh vật TimeLens',
    desc: 'Chrono đi cùng bạn ở mọi di tích trên TimeLens và kể tất cả thông tin mà Chrono biết.',
    avatar: '/mascot/mascot-1.png',
    themeColor: 'text-[#fdb438]',
    accentBorder: 'border-[#fe951c]/60 shadow-[0_0_25px_rgba(254,149,28,0.25)]',
    badgeBg: 'bg-[#fe951c]/20 text-[#fdb438] border-[#fe951c]/40',
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

/** BE chỉ nhận UUID character — map Đại sứ FE sang nhân vật API theo location. */
const PERSONA_KEYS = new Set(['chi-nam', 'anh-ba'])

function resolveChatCharacterId(
    characterId: string,
    characters: Character[],
    activePersonaKey: 'chi-nam' | 'anh-ba',
): string | null {
    if (characterId && !PERSONA_KEYS.has(characterId)) return characterId
    if (characters.length === 0) return null
    if (activePersonaKey === 'chi-nam') {
        return characters.find((c) => /chị năm/i.test(c.name))?.id ?? characters[0].id
    }
    return characters.find((c) => /anh ba|chiến sĩ/i.test(c.name))?.id ?? characters[0].id
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
    const { i18n } = useTranslation()
    const voiceLocale = (['vi', 'en', 'ko', 'zh-CN'].includes(i18n.language) ? i18n.language : 'vi') as import('../shared/i18n').AppLocale
    const { characterId: routeCharacterId } = useParams<{ characterId?: string }>()
    const [params, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const locationId = resolveChatLocationId(params.get('locationId'))
    const personaParam = params.get('persona') // Nhận 'chi-nam' hoặc 'anh-ba' từ ExplorePage
    const stationCode = (params.get('station') || params.get('stationCode') || '').trim().toUpperCase() || null
    const siteCode = isPilotSiteCode(params.get('site'))
        ? params.get('site')!
        : siteCodeFromLocationId(locationId)
    const initialCharacterId = routeCharacterId ?? params.get('characterId') ?? ''
    const questRecordKey = questRecordFromSearch(params)
    const questPrompt = params.get('questPrompt') ?? params.get('prompt') ?? ''

    const { isAuthenticated, user } = useAuth()
    const questDialogueRecorded = useRef(false)
    const prefilledQuestPrompt = useRef(false)
    const autoSentSaBan = useRef(false)
    const claimedQuizIds = useRef(new Set<string>())

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
    const [stagePaused, setStagePaused] = useState(false)
    const [heardText, setHeardText] = useState('')
    const [answerLines, setAnswerLines] = useState<string[]>([])
    const [callImages, setCallImages] = useState<string[]>([])
    const [hearing, setHearing] = useState(false)
    const [heardAudio, setHeardAudio] = useState(false)
    const [retryMessage, setRetryMessage] = useState<string | null>(null)
    const [aiServiceOnline, setAiServiceOnline] = useState<boolean | null>(null)
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

    // Chọn Persona hiển thị (Ưu tiên Đại sứ Củ Chi, fallback API)
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
                themeColor: 'text-[#fdb438]',
                accentBorder: 'border-[#fe951c]/50',
                badgeBg: 'bg-[#fe951c]/20 text-[#fdb438] border-[#fe951c]/40',
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
        () => resolveChatCharacterId(characterId, characters, activePersonaKey),
        [characterId, characters, activePersonaKey],
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
        const fromUrl = params.get('locationId')?.trim()
        if (fromUrl) saveSelectedLocationId(fromUrl)
    }, [params])

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
        if (!resolvedCharacterId) {
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

    const send = async (override?: string) => {
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
            const guided = await chatApi.sendGuidedStream({
                characterId: targetId,
                message: userText,
                conversationId,
                stationCode,
                siteCode,
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
                const withoutOptimistic = prev.filter((m) => m.id !== optimistic.id)
                if (withoutOptimistic.some((m) => m.id === assistantId)) {
                    return withoutOptimistic.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: reply.reply, sources: normalizeChatSources(reply.sources) }
                            : m
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
            const quota = e instanceof ApiError && (e.code === 'QUOTA_EXCEEDED' || e.status === 429 || (e.status === 422 && /giới hạn/i.test(e.message)))
            if (!quota && !(e instanceof ApiError && e.status === 401)) setRetryMessage(userText)
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
            topNav={<SimpleTopNav title="Phòng Đối Thoại RAG AI" showSearch />}
            mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
            mobileTitle="Trò chuyện AI"
            className="h-screen overflow-hidden bg-[#0f1015]"
        >
            <main className="flex flex-col lg:flex-row overflow-hidden p-3 md:p-6 gap-6 max-w-[1600px] mx-auto w-full mt-14 md:mt-16 h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] min-h-0">

                {/* --- CỘT TRÁI: COMMAND CENTER ĐẠI SỨ DI SẢN --- */}
                <section className="hidden lg:flex lg:h-full lg:shrink-0 w-[360px] xl:w-[400px] bg-[#161824] rounded-3xl border border-white/10 flex-col overflow-hidden relative shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#388cf1] z-20" />

                    <div className="px-4 py-3 bg-[#12141f] border-b border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#fdb438]">Sân khấu</p>
                        <p className="text-sm font-black text-white">Kéo ngang để mascot bay qua lại</p>
                    </div>

                    <div className="relative min-h-[340px] flex-1 w-full overflow-hidden bg-[radial-gradient(circle_at_50%_40%,rgba(56,140,241,0.22),transparent_55%),linear-gradient(180deg,#10131d_0%,#070910_100%)]">
                        {showMascot ? (
                            <MascotStage
                                mode={mascotMode}
                                paused={stagePaused}
                                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                            />
                        ) : (
                            <img
                                alt={displayProfile.name}
                                className="h-full w-auto object-contain mx-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]"
                                src={resolveMediaUrl(displayProfile.avatar)}
                            />
                        )}
                        {showMascot && (
                            <button
                                type="button"
                                onClick={() => setStagePaused((value) => !value)}
                                aria-pressed={stagePaused}
                                className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded-full bg-black/70 border border-white/20 text-[11px] font-black text-white cursor-pointer hover:bg-black/90"
                            >
                                {stagePaused ? 'Tiếp tục' : 'Tạm dừng'}
                            </button>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#161824] via-transparent to-transparent pointer-events-none" />

                        <div className="absolute bottom-4 left-4 right-4 z-20 text-left">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border mb-2 backdrop-blur-md shadow-sm text-[10px] font-black uppercase tracking-wider bg-black/60 border-white/20 text-[#fdb438]">
                                <span className={`w-1.5 h-1.5 rounded-full ${aiServiceOnline === false ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
                                {/* <span>
                                    {aiServiceOnline === false
                                        ? 'RAG tắt · trả lời LLM (không hứa trích nguồn 100%)'
                                        : 'Trợ lý lịch sử · nguồn khi RAG_ENABLED'}
                                </span> */}
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

                    </div>
                </section>

                {/* --- CỘT PHẢI: KHUNG CHAT RAG AI INTERACTIVE --- */}
                <section className="flex-1 min-h-0 h-full bg-[#161824]/90 rounded-3xl border border-white/10 flex flex-col overflow-hidden relative shadow-2xl">

                    {/* Header Mobile cho Persona */}
                    <div className="lg:hidden p-3 bg-[#12141f] border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            {showMascot ? (
                                <img src={MASCOT_STILL} alt="" className="w-9 h-12 object-contain" />
                            ) : (
                                <img src={resolveMediaUrl(displayProfile.avatar)} alt="" className="w-9 h-9 rounded-full object-cover border border-[#fdb438]" />
                            )}
                            <div className="text-left">
                                <h4 className="text-sm font-black text-white leading-none">{displayProfile.name}</h4>
                                <span className="text-[10px] text-emerald-400 font-bold">● Trợ lý lịch sử sẵn sàng</span>
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#fdb438]">Đang bay</span>
                    </div>

                    {/* {aiServiceOnline === false && (
                        <div className="px-4 py-2 border-b border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 shrink-0">
                            <MaterialIcon name="warning" className="text-sm align-middle mr-1" />
                            Chat dùng BE (pgvector khi RAG_ENABLED, hoặc LLM fallback). Chạy{' '}
                            <code className="text-amber-100">scripts/diagnose-chat.ps1</code>
                        </div>
                    )} */}

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
                                <div className={`mx-auto ${showMascot ? 'h-28 w-24 lg:hidden' : 'w-24 h-28'}`}>
                                    {showMascot ? (
                                        <img src={MASCOT_STILL} alt="" className="h-full w-full object-contain" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#fe951c] to-[#388cf1] p-0.5 mx-auto shadow-xl">
                                            <div className="w-full h-full rounded-2xl bg-[#1b1e2c] flex items-center justify-center overflow-hidden">
                                                <img src={resolveMediaUrl(displayProfile.avatar)} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl sm:text-2xl font-black text-white">
                                        Xin chào! Mình là <span className={displayProfile.themeColor}>{displayProfile.name}</span>
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
                                        Mình đi cùng bạn ở các di tích trên TimeLens và chỉ kể phần có trong tư liệu. Bạn muốn bắt đầu từ đâu?
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <ReportContentButton stationCode={stationCode ?? undefined} context="chat" />
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
                                    <div className={`w-8 shrink-0 hidden sm:block ${showMascot && !isUser ? 'h-12' : 'h-8 rounded-full overflow-hidden border border-white/15'}`}>
                                        {showMascot && !isUser ? (
                                            <img src={MASCOT_STILL} alt={m.role} className="h-full w-full object-contain" />
                                        ) : (
                                            <img alt={m.role} className="w-full h-full object-cover" src={isUser ? images.chatUserAvatar : resolveMediaUrl(displayProfile.avatar)} />
                                        )}
                                    </div>

                                    <div className={`p-4 rounded-2xl border relative shadow-md text-left ${
                                        isUser
                                            ? 'bg-gradient-to-r from-[#388cf1]/30 to-[#1a79e5]/30 border-[#388cf1]/50 rounded-tr-sm text-white'
                                            : 'bg-[#1b1e2c] border-white/10 rounded-tl-sm text-gray-200'
                                    }`}>
                                        <ChatMessageContent content={m.content} />
                                        {m.quiz && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {m.quiz.options.map((option) => (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        disabled={m.quiz?.state === 'correct'}
                                                        onClick={() => void answerSaBanQuiz(m.id, option.id)}
                                                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-sm font-bold text-white hover:border-[#fdb438] disabled:cursor-default disabled:opacity-60 cursor-pointer"
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {m.role === 'assistant' &&
                                            shouldShowB2CPaywall(user) &&
                                            (!m.sources || m.sources.length === 0) && (
                                                <p className="mt-3 pt-3 border-t border-white/10 text-xs text-[#fdb438]/90">
                                                    Nâng cấp Premium để xem nguồn tài liệu chính thống kèm câu trả lời.
                                                </p>
                                            )}
                                        {m.role === 'assistant' &&
                                            !shouldShowB2CPaywall(user) &&
                                            (m.sources?.length ?? 0) > 0 && (
                                                <section className="mt-3 border-t border-white/10 pt-3" aria-label="Nguồn kho tư liệu di tích">
                                                    <p className="text-xs font-black uppercase tracking-wider text-[#fdb438]">
                                                        Nguồn (kho tư liệu di tích)
                                                    </p>
                                                    <ul className="mt-2 space-y-2">
                                                        {m.sources!.map((source, index) => (
                                                            <li key={`${source.title}-${index}`} className="text-xs text-gray-300">
                                                                {source.url ? (
                                                                    <a className="font-semibold text-[#8fc2ff] hover:underline" href={source.url} target="_blank" rel="noreferrer">
                                                                        {source.title}
                                                                    </a>
                                                                ) : (
                                                                    <span className="font-semibold text-[#8fc2ff]">{source.title}</span>
                                                                )}
                                                                {source.excerpt && <p className="mt-0.5 text-gray-400">{source.excerpt}</p>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </section>
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
                                <div className={`w-8 hidden sm:block ${showMascot ? 'h-12' : 'h-8 rounded-full overflow-hidden border border-white/15'}`}>
                                    {showMascot ? (
                                        <img src={MASCOT_STILL} alt="ai" className="h-full w-full object-contain" />
                                    ) : (
                                        <img alt="ai" className="w-full h-full object-cover" src={resolveMediaUrl(displayProfile.avatar)} />
                                    )}
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
                        {retryMessage && (
                            <button
                                type="button"
                                onClick={() => void send(retryMessage)}
                                disabled={busy}
                                className="mb-3 rounded-xl bg-white px-4 py-2 text-sm font-black text-black disabled:opacity-40 cursor-pointer"
                            >
                                Gửi lại
                            </button>
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
                                placeholder={dictating ? 'Đang nghe, chữ hiện ở đây…' : `Nhắn tin cho ${displayProfile.name}...`}
                            />
                            <div className="flex items-center gap-1 pr-1">
                                {showMascot && (
                                    <button
                                        type="button"
                                        onClick={() => beginCall()}
                                        disabled={voiceBusy || sending}
                                        className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 transition-all rounded-xl cursor-pointer disabled:opacity-40"
                                        title="Gọi mascot"
                                    >
                                        <MaterialIcon name="videocam" className="text-xl" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={toggleDictate}
                                    disabled={voiceBusy || sending || callOpen}
                                    className={`p-2.5 transition-all rounded-xl cursor-pointer ${
                                        dictating ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                    title={dictating ? 'Dừng, chữ nằm trong ô nhắn' : 'Nói để điền chữ'}
                                >
                                    <MaterialIcon name={dictating ? 'stop_circle' : 'mic'} className="text-xl" />
                                </button>
                                <button
                                    onClick={() => send()}
                                    type="button"
                                    disabled={busy || dictating || !input.trim()}
                                    className="bg-gradient-to-r from-[#fe951c] to-[#fdb438] text-black font-black p-2.5 rounded-xl hover:scale-105 transition-all disabled:opacity-40 cursor-pointer shadow-md"
                                >
                                    <MaterialIcon name="send" className="text-xl font-bold" />
                                </button>
                            </div>
                        </div>

                        {chatLimitReached && shouldShowB2CPaywall(user) && !premiumBannerDismissed && (
                            <div className="mt-3 p-4 rounded-2xl border border-[#fe951c]/50 bg-[#fe951c]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                                <p className="text-xs sm:text-sm text-gray-200 font-bold">
                                    ⚠️ Bạn đã hết lượt thoại miễn phí hôm nay. Nâng cấp Premium để trò chuyện không giới hạn!
                                </p>
                                <div className="flex gap-2 shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={dismissPremiumBanner}
                                        className="text-xs font-bold text-gray-300"
                                    >
                                        Để sau
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={openPricing}
                                        className="text-xs font-black bg-[#fe951c] text-black"
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
