import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { chatApi, type ChatMessage } from '../features/chat/api'
import { locationsApi, type Character } from '../features/locations/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

export function ChatPage() {
  const [params] = useSearchParams()
  const locationId = params.get('locationId') ?? ''
  const initialCharacterId = params.get('characterId') ?? ''

  const [characters, setCharacters] = useState<Character[]>([])
  const [characterId, setCharacterId] = useState(initialCharacterId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const { showToast } = useToast()
  const quickReplies = [
    'Kể về mười năm gió bụi',
    'Quan niệm về Tài - Mệnh',
    'Đọc thử một đoạn Kiều',
  ]

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversationId(null)
    setMessages([])
  }, [characterId])

  useEffect(() => {
    if (!conversationId) return
    const run = async () => {
      try {
        setLoadingMessages(true)
        setMessages(await chatApi.getMessages(conversationId))
      } catch {
        showToast({ message: 'Không tải được lịch sử hội thoại.', type: 'error' })
      } finally {
        setLoadingMessages(false)
      }
    }
    run()
  }, [conversationId, showToast])

  const selected = useMemo(() => characters.find((c) => c.id === characterId), [characters, characterId])

  const send = async () => {
    if (!characterId || !input.trim() || sending) return
    const userText = input.trim()
    setInput('')
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    try {
      setSending(true)
      const reply = await chatApi.send({ characterId, message: userText, conversationId })
      setConversationId(reply.conversationId)
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { ...optimistic, id: `user-${Date.now()}` },
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply.reply,
          createdAt: new Date().toISOString(),
        },
      ])
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      showToast({ message: getFriendlyErrorMessage(e, 'chat'), type: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Chat với nhân vật" showSearch />}>
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-md lg:p-lg gap-md lg:gap-lg max-w-[1600px] mx-auto w-full mt-16">
        <section className="hidden lg:flex w-1/3 min-w-[360px] max-w-[480px] bg-surface-container-low/80 rounded-xl border border-outline-variant flex-col overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-80" />
          <div className="h-[45%] w-full relative">
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
          <div className="p-lg flex-1 overflow-y-auto flex flex-col gap-md">
            <div className="flex flex-wrap gap-xs">
              <span className="px-sm py-xs bg-surface-variant rounded-full border border-outline-variant text-xs text-on-surface-variant">Văn hóa</span>
              <span className="px-sm py-xs bg-surface-variant rounded-full border border-outline-variant text-xs text-on-surface-variant">Lịch sử</span>
              <span className="px-sm py-xs bg-surface-variant rounded-full border border-outline-variant text-xs text-on-surface-variant">Di sản</span>
            </div>
            <div className="text-on-surface font-body-md text-body-md leading-relaxed">
              Trò chuyện theo ngữ cảnh địa điểm để khai mở các câu chuyện lịch sử sâu hơn.
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

        <section className="flex-1 bg-surface-container-low/90 rounded-xl border border-outline-variant flex flex-col overflow-hidden relative shadow-2xl">
          {!locationId && <p className="text-sm text-on-surface-variant p-md border-b border-outline-variant">Mở từ màn chi tiết địa điểm để nạp nhân vật lịch sử.</p>}
          <div className="flex-1 p-md lg:p-lg overflow-y-auto flex flex-col gap-lg">
            <div className="flex justify-center">
              <span className="bg-surface-variant/50 px-sm py-xs rounded-full font-label-sm text-label-sm text-on-surface-variant border border-outline-variant/50">
                Phiên hội thoại
              </span>
            </div>
            {loadingMessages && <p className="text-sm text-on-surface-variant">Đang tải lịch sử hội thoại...</p>}
            {messages.length === 0 && !loadingMessages && (
              <div className="max-w-[85%] bg-surface-container p-md rounded-2xl rounded-tl-sm border border-outline-variant">
                <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                  Xin chào, ta là {selected?.name ?? 'nhà sử học AI'}. Bạn muốn tìm hiểu câu chuyện nào?
                </p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-sm max-w-[85%] ${m.role === 'user' ? 'self-end flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 hidden sm:block ${m.role === 'user' ? 'border-secondary/30' : 'border-primary/30'}`}>
                  <img alt={m.role} className="w-full h-full object-cover" src={m.role === 'user' ? images.chatUserAvatar : images.chatNguyenDuAvatar} />
                </div>
                <div className={`p-md rounded-2xl border relative ${m.role === 'user' ? 'bg-inverse-surface/10 border-secondary/30 rounded-tr-sm' : 'bg-surface-container border-outline-variant rounded-tl-sm'}`}>
                  <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">{m.content}</p>
                  <span className="font-label-sm text-label-sm text-on-surface-variant mt-xs block text-right">
                    {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {sending && (
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
          </div>
          <div className="p-md lg:p-lg border-t border-outline-variant bg-surface-container-high/80">
            <div className="flex overflow-x-auto gap-sm pb-md">
              {quickReplies.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setInput(item)}
                  className="flex-shrink-0 px-sm py-xs border border-outline-variant rounded-full text-xs text-on-surface-variant hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="relative flex items-center bg-surface rounded-xl border border-outline-variant focus-within:border-secondary transition-all p-xs pl-sm">
              <button type="button" className="text-on-surface-variant hover:text-primary p-sm transition-colors rounded-lg">
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
                className="flex-1 bg-transparent border-none focus:ring-0 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 px-sm"
                placeholder={`Hỏi ${selected?.name ?? 'nhân vật'}...`}
              />
              <div className="flex items-center gap-xs pr-xs">
                <button type="button" className="text-on-surface-variant hover:text-secondary p-sm transition-colors rounded-lg">
                  <MaterialIcon name="mic" className="text-lg" />
                </button>
                <button onClick={() => send()} type="button" disabled={sending} className="bg-primary text-on-primary p-sm rounded-lg hover:bg-primary-fixed-dim transition-colors disabled:opacity-60">
                  <MaterialIcon name="send" className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppLayout>
  )
}

