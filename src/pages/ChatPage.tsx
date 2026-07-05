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
  recording: 'Đang ghi âm… Nhấn mic lần nữa để gửi',
  stt: 'Đang nhận diện giọng nói…',
  chat: 'Đang suy nghĩ câu trả lời…',
  tts: 'Đang tạo giọng đọc…',
  playing: 'Đang phát câu trả lời…',
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
    <div className="flex justify-center py-1">
      <span className="bg-surface-variant/60 px-sm py-xs rounded-full font-label-sm text-label-sm text-on-surface-variant border border-outline-variant/40">
        {label}
      </span>
    </div>
  )
}

export function ChatPage() {
  const { characterId: routeCharacterId } = useParams<{ characterId?: string }>()
  const [params] = useSearchParams()
  const locationId = params.get('locationId') ?? ''
  const initialCharacterId = routeCharacterId ?? params.get('characterId') ?? ''
  const questRecordKey = questRecordFromSearch(params)
  const questPrompt = params.get('questPrompt') ?? ''
  const { isAuthenticated, user, updateUser } = useAuth()
  const questDialogueRecorded = useRef(false)
  const prefilledQuestPrompt = useRef(false)

  const [characters, setCharacters] = useState<Character[]>([])
  const [characterId, setCharacterId] = useState(initialCharacterId)
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
  const quickReplies = [
    'Cuộc sống trong địa đạo thế nào?',
    'Kể về chiến thuật đào hầm',
    'Ai là những anh hùng tiêu biểu?',
    'Địa đạo Củ Chi có bao nhiêu tầng?',
  ]

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
    if (initialCharacterId) {
      setCharacterId(initialCharacterId)
    }
  }, [initialCharacterId])

  useEffect(() => {
    if (!locationId) return
    locationsApi
      .getCharacters(locationId)
      .then((data) => {
        setCharacters(data)
        if (!characterId && data[0]) {
          setCharacterId(data[0].id)
        }
      })
      .catch(() => showToast({ message: 'Không tải được danh sách nhân vật.', type: 'error' }))
  }, [locationId, characterId, showToast])

  useEffect(() => {
    if (!characterId) {
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
        const ctx = await chatApi.getContext(characterId)
        if (cancelled) return
        if (ctx.conversationId) {
          setConversationId(ctx.conversationId)
          await loadLatestMessages(ctx.conversationId)
        }
      } catch {
        if (!cancelled) {
          showToast({ message: 'Không tải được phiên hội thoại.', type: 'error' })
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [characterId, loadLatestMessages, showToast])

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

  const selected = useMemo(() => characters.find((c) => c.id === characterId), [characters, characterId])

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
    if (!characterId || !input.trim() || busy) return
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
        characterId,
        message: userText,
        conversationId,
      })

      setConversationId(reply.conversationId)
      if (chatStartedRef.current !== characterId) {
        chatStartedRef.current = characterId
        void analyticsApi.recordEvent({
          locationId: locationId ?? undefined,
          eventType: 'CHARACTER_CHAT_STARTED',
          eventKey: characterId,
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
            m.id === assistantId ? { ...m, content: reply.reply } : m,
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
    if (!characterId) return

    if (voicePhase === 'recording') {
      stopActiveRecorder(recorderRef.current)
      setVoicePhase('stt')
      try {
        const blob = await (recordPromiseRef.current ?? Promise.reject(new Error('No recording')))
        setVoicePhase('chat')
        const result = await voiceChatStepwise(
          {
            audio: blob,
            characterId,
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
      topNav={<SimpleTopNav title="Chat với nhân vật" showSearch />}
      mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
      mobileTitle="Trò chuyện AI"
      className="h-screen overflow-hidden"
    >
      <main className="flex flex-col lg:flex-row overflow-hidden p-md lg:p-lg gap-md lg:gap-lg max-w-[1600px] mx-auto w-full mt-14 md:mt-16 h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] min-h-0">
        <section className="hidden lg:flex lg:h-full lg:shrink-0 w-[360px] xl:w-[400px] bg-surface-container-low/80 rounded-xl border border-outline-variant flex-col overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent-500 opacity-80 z-10" />
          <div className="h-[240px] shrink-0 w-full relative">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent z-10" />
            <img alt={selected?.name ?? 'Nhân vật'} className="w-full h-full object-cover object-top" src={selected?.portraitUrl || images.nguyenDuPortrait} />
            <div className="absolute bottom-md left-md z-20">
              <div className="inline-flex items-center gap-xs bg-surface-variant/90 border border-outline-variant rounded-full px-sm py-xs mb-sm">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider">Đang kết nối</span>
              </div>
              <h2 className="font-display-lg text-display-lg font-bold text-on-surface">{selected?.name ?? 'Nhà sử học AI'}</h2>
              <p className="font-body-lg text-body-lg text-primary-fixed-dim">{selected?.era ?? 'Lịch sử Việt Nam'}</p>
            </div>
          </div>
          <div className="p-lg flex-1 min-h-0 overflow-y-auto flex flex-col gap-md">
            <div className="flex flex-wrap gap-xs">
              <span className="px-sm py-xs bg-surface-variant rounded-full border border-outline-variant text-xs text-on-surface-variant">Văn hóa</span>
              <span className="px-sm py-xs bg-surface-variant rounded-full border border-outline-variant text-xs text-on-surface-variant">Lịch sử</span>
              <span className="px-sm py-xs bg-surface-variant rounded-full border border-outline-variant text-xs text-on-surface-variant">Di sản</span>
            </div>
            <div className="text-on-surface font-body-md text-body-md leading-relaxed">
              AI trả lời theo ngữ cảnh di tích; có trích dẫn nguồn khi tìm thấy tài liệu. Nội dung mang tính tham khảo giáo dục.
            </div>
            <div className="mt-auto">
              <label className="text-sm text-on-surface-variant">Nhân vật</label>
              <select
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="block mt-xs w-full bg-surface-container border border-outline-variant rounded px-sm py-xs"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="flex-1 min-h-0 h-full bg-surface-container-low/90 rounded-xl border border-outline-variant flex flex-col overflow-hidden relative shadow-2xl">
          {!locationId && <p className="text-sm text-on-surface-variant p-md border-b border-outline-variant shrink-0">Mở từ màn chi tiết địa điểm để nạp nhân vật lịch sử.</p>}
          {voiceHint && (
            <div className="px-md py-sm border-b border-outline-variant bg-primary/10 text-sm text-primary flex items-center gap-sm shrink-0">
              <MaterialIcon name="graphic_eq" className="text-base animate-pulse" />
              {voiceHint}
            </div>
          )}
          <div
            ref={messagesScrollRef}
            onScroll={handleMessagesScroll}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-md lg:p-lg flex flex-col gap-md"
          >
            <div ref={loadMoreRef} className="h-px shrink-0" aria-hidden />
            {(loadingOlder || (hasOlder && loadingMessages)) && (
              <div className="flex justify-center py-sm">
                <span className="text-sm text-on-surface-variant animate-pulse">Đang tải tin nhắn cũ hơn…</span>
              </div>
            )}
            {loadingMessages && !loadingOlder && (
              <p className="text-center text-sm text-on-surface-variant">Đang tải lịch sử hội thoại…</p>
            )}
            {messages.length === 0 && !loadingMessages && (
              <div className="flex flex-col gap-md max-w-[85%]">
                <div className="bg-surface-container p-md rounded-2xl rounded-tl-sm border border-outline-variant">
                  <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                    Xin chào, ta là {selected?.name ?? 'nhà sử học AI'}. Bạn muốn tìm hiểu câu chuyện nào?
                  </p>
                </div>
                <div className="flex flex-wrap gap-sm">
                  {quickReplies.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setInput(item)}
                      className="px-sm py-xs border border-outline-variant rounded-full text-xs text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                    >
                      {item}
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
              return (
                <div key={m.id} className={`flex gap-sm max-w-[85%] ${m.role === 'user' ? 'self-end flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 hidden sm:block ${m.role === 'user' ? 'border-secondary/30' : 'border-primary/30'}`}>
                    <img alt={m.role} className="w-full h-full object-cover" src={m.role === 'user' ? images.chatUserAvatar : images.chatNguyenDuAvatar} />
                  </div>
                  <div className={`p-md rounded-2xl border relative ${m.role === 'user' ? 'bg-inverse-surface/10 border-secondary/30 rounded-tr-sm' : 'bg-surface-container border-outline-variant rounded-tl-sm'}`}>
                    <ChatMessageContent content={m.content} />
                    {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                      <ChatSourcesBlock sources={m.sources} />
                    )}
                    <span className="font-label-sm text-label-sm text-on-surface-variant mt-xs block text-right">
                      {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })}
            {showTypingIndicator && (
              <div className="flex gap-sm max-w-[85%] items-end opacity-70">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 hidden sm:block">
                  <img alt="ai" className="w-full h-full object-cover grayscale" src={images.chatNguyenDuAvatar} />
                </div>
                <div className="bg-surface-container px-md py-sm rounded-2xl rounded-tl-sm border border-outline-variant flex items-center gap-1 h-10">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-px shrink-0" />
          </div>
          <div className="shrink-0 p-md lg:p-lg border-t border-outline-variant bg-surface-container-high/80">
            <div className="flex overflow-x-auto gap-sm pb-md">
              {quickReplies.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setInput(item)}
                  disabled={busy}
                  className="flex-shrink-0 px-sm py-xs border border-outline-variant rounded-full text-xs text-on-surface-variant hover:border-primary hover:text-primary transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-on-surface-variant mb-sm">
              Trò chuyện bằng text hoặc giọng nói. Nội dung AI mang tính tham khảo giáo dục.
            </p>
            <div className="relative flex items-center bg-surface rounded-xl border border-outline-variant focus-within:border-secondary transition-all p-xs pl-sm">
              <button type="button" className="text-on-surface-variant hover:text-primary p-sm transition-colors rounded-lg" disabled={busy}>
                <MaterialIcon name="add_circle" className="text-lg" />
              </button>
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
                className="flex-1 bg-transparent border-none focus:ring-0 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 px-sm disabled:opacity-60"
                placeholder={`Hỏi ${selected?.name ?? 'nhân vật'}...`}
              />
              <div className="flex items-center gap-xs pr-xs">
                <button
                  type="button"
                  onClick={() => toggleVoice().catch(() => undefined)}
                  disabled={!characterId || voiceBusy || sending}
                  className={`p-sm transition-colors rounded-lg ${voicePhase === 'recording' ? 'text-error bg-error/10' : 'text-on-surface-variant hover:text-secondary'}`}
                  title="Ghi âm giọng nói"
                >
                  <MaterialIcon name={voicePhase === 'recording' ? 'stop_circle' : 'mic'} className="text-lg" />
                </button>
                <button onClick={() => send()} type="button" disabled={busy} className="bg-primary text-on-primary p-sm rounded-lg hover:bg-primary-fixed-dim transition-colors disabled:opacity-60">
                  <MaterialIcon name="send" className="text-lg" />
                </button>
              </div>
            </div>
            {chatLimitReached && user?.tier !== 'PREMIUM' && !premiumBannerDismissed && (
              <div className="mt-md p-md rounded-xl border border-primary/40 bg-primary/10 flex flex-col sm:flex-row sm:items-center gap-sm relative">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('premiumBannerDismissed', '1')
                    setPremiumBannerDismissed(true)
                  }}
                  className="absolute top-2 right-2 text-on-surface-variant hover:text-on-surface p-1"
                  aria-label="Đóng"
                >
                  <MaterialIcon name="close" className="text-sm" />
                </button>
                <p className="text-sm flex-1 pr-6">
                  Bạn đã hết quota chat hôm nay. Nâng cấp Premium để trò chuyện không giới hạn với nhân vật lịch sử.
                </p>
                <Button
                  type="button"
                  onClick={() => void handleUpgrade()}
                  disabled={upgrading}
                  className="text-sm shrink-0"
                >
                  Nâng cấp Premium
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  )
}
