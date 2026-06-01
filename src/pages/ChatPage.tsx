import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    text: 'Hữu duyên thiên lý năng tương ngộ... Kẻ hèn này là Nguyễn Du, tự Tố Như. Nghe nói khách từ tương lai cách hàng trăm năm vọng về tìm gặp. Không biết khách muốn đàm đạo chuyện chi? Thế thái nhân tình hay chuyện văn chương chữ nghĩa?',
    time: '10:05 AM',
  },
  {
    id: '2',
    role: 'user',
    text: 'Chào cụ Tố Như, hậu bối rất ngưỡng mộ cụ. Cụ có thể kể đôi chút về hoàn cảnh sáng tác Truyện Kiều không ạ?',
    time: '10:07 AM',
  },
]

const quickReplies = [
  'Kể về mười năm gió bụi',
  'Quan niệm về Tài - Mệnh',
  'Đọc thử một đoạn Kiều',
]

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const nextId = useRef(3)

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = {
      id: String(nextId.current++),
      role: 'user',
      text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const reply: Message = {
        id: String(nextId.current++),
        role: 'assistant',
        text: 'Truyện Kiều được sáng tác trong bối cảnh đất nước đa phương, lòng người đa sự. Ta lấy cảnh Thanh Tâm đài làm khung, dệt nên câu chuyện Thúy Kiều — một minh họa sâu sắc về số phận con người.',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, reply])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <AppLayout activeBorder="right" className="dong-son-pattern">
      <header className="fixed top-0 right-0 left-0 md:left-[16rem] z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 flex justify-between items-center h-16 px-xl">
        <div className="hidden md:flex items-center gap-sm text-on-surface-variant">
          <MaterialIcon name="explore" className="text-sm" />
          <span className="font-label-sm text-label-sm">/ Nhâm Tuất 1765</span>
        </div>
        <div className="md:hidden flex items-center gap-sm">
          <Link to="/explore" className="text-on-surface-variant hover:text-secondary p-2">
            <MaterialIcon name="arrow_back" />
          </Link>
          <span className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">TimeLens</span>
        </div>
        <div className="flex items-center gap-lg">
          <div className="hidden sm:flex items-center bg-surface-container-high rounded-full px-sm py-xs border border-outline-variant focus-within:border-secondary transition-colors w-64">
            <MaterialIcon name="search" className="text-on-surface-variant mr-xs text-sm" />
            <input
              className="bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface w-full placeholder:text-on-surface-variant p-0 h-6"
              placeholder="Tìm kiếm di sản..."
              type="text"
            />
          </div>
          <button type="button" className="text-on-surface-variant hover:text-secondary transition-colors p-xs">
            <MaterialIcon name="notifications" />
          </button>
          <button type="button" className="text-on-surface-variant hover:text-secondary transition-colors p-xs">
            <MaterialIcon name="settings" />
          </button>
          <div className="w-8 h-8 rounded-full border border-primary/50 overflow-hidden ml-sm cursor-pointer glow-primary">
            <img alt="User Avatar" className="w-full h-full object-cover" src={images.avatarExploreV3} />
          </div>
        </div>
      </header>

      <main className="mt-16 h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden p-md lg:p-lg gap-md lg:gap-lg max-w-[1600px] mx-auto w-full min-h-0">
        <section className="hidden lg:flex w-1/3 min-w-[360px] max-w-[480px] bg-surface-container-low/80 backdrop-blur-md rounded-xl border border-outline-variant flex-col overflow-hidden relative shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-80" />
          <div className="h-[45%] w-full relative shrink-0">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent z-10" />
            <img
              alt="Nguyễn Du"
              className="w-full h-full object-cover object-top contrast-125 brightness-90"
              src={images.nguyenDuPortrait}
            />
            <div className="absolute bottom-md left-md z-20">
              <div className="inline-flex items-center gap-xs bg-surface-variant/90 backdrop-blur-sm border border-outline-variant rounded-full px-sm py-xs mb-sm">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider">
                  Đang kết nối tâm thức
                </span>
              </div>
              <h2 className="font-display-lg text-display-lg font-bold text-on-surface">Nguyễn Du</h2>
              <p className="font-body-lg text-body-lg text-primary-fixed-dim">Đại thi hào dân tộc (1765 - 1820)</p>
            </div>
          </div>
          <div className="p-lg flex-1 overflow-y-auto chat-scroll flex flex-col gap-md min-h-0">
            <div className="flex flex-wrap gap-xs">
              {['Triều Lê - Trịnh', 'Văn học trung đại', 'Hà Tĩnh'].map((chip) => (
                <span
                  key={chip}
                  className="px-sm py-xs bg-surface-variant rounded-full border border-outline-variant font-label-sm text-label-sm text-on-surface-variant"
                >
                  {chip}
                </span>
              ))}
            </div>
            <p className="text-on-surface font-body-md text-body-md leading-relaxed">
              Tố Như tử, một nhà thơ kiệt xuất, danh nhân văn hóa thế giới. Ông là người có con mắt trông thấu sáu
              cõi, tấm lòng nghĩ suốt nghìn đời. Đại diện tiêu biểu nhất cho trào lưu nhân đạo chủ nghĩa trong văn
              học Việt Nam nửa cuối thế kỷ XVIII - nửa đầu thế kỷ XIX.
            </p>
            <div className="grid grid-cols-2 gap-sm mt-auto">
              <div className="bg-surface-container p-sm rounded-lg border border-outline-variant/50 flex flex-col gap-xs">
                <MaterialIcon name="menu_book" className="text-secondary text-lg" />
                <span className="font-label-sm text-label-sm text-on-surface-variant">Tác phẩm tiêu biểu</span>
                <span className="font-title-md text-title-md text-on-surface truncate">Truyện Kiều</span>
              </div>
              <div className="bg-surface-container p-sm rounded-lg border border-outline-variant/50 flex flex-col gap-xs">
                <MaterialIcon name="translate" className="text-primary text-lg" />
                <span className="font-label-sm text-label-sm text-on-surface-variant">Ngôn ngữ</span>
                <span className="font-title-md text-title-md text-on-surface">Chữ Nôm, Hán</span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 min-h-0 bg-surface-container-low/90 backdrop-blur-md rounded-xl border border-outline-variant flex flex-col overflow-hidden relative shadow-2xl">
          <div className="lg:hidden flex items-center p-md border-b border-outline-variant bg-surface-container-high/50 shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden mr-sm border border-primary/50">
              <img alt="Nguyễn Du" className="w-full h-full object-cover" src={images.nguyenDuPortrait} />
            </div>
            <div>
              <h2 className="font-title-md text-title-md font-bold text-on-surface">Nguyễn Du</h2>
              <p className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                Đang trực tuyến
              </p>
            </div>
          </div>

          <div className="flex-1 p-md lg:p-lg overflow-y-auto chat-scroll flex flex-col gap-lg min-h-0">
            <div className="flex justify-center shrink-0">
              <span className="bg-surface-variant/50 px-sm py-xs rounded-full font-label-sm text-label-sm text-on-surface-variant border border-outline-variant/50 backdrop-blur-sm">
                Phiên liên kết: Năm Gia Long thứ 19 (1820)
              </span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-sm max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : ''}`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 shrink-0 hidden sm:block">
                  <img
                    alt={msg.role === 'user' ? 'User' : 'Nguyễn Du'}
                    className="w-full h-full object-cover"
                    src={msg.role === 'user' ? images.chatUserAvatar : images.chatNguyenDuAvatar}
                  />
                </div>
                <div
                  className={`p-md rounded-2xl shadow-lg relative ${
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-inverse-surface/10 border border-secondary/30 shadow-[0_0_15px_rgba(68,219,213,0.1)]'
                      : 'rounded-tl-sm bg-surface-container border border-outline-variant'
                  }`}
                >
                  <div
                    className={`absolute -top-px w-4 h-4 opacity-50 ${
                      msg.role === 'user'
                        ? '-right-px border-t border-r border-secondary rounded-tr-sm'
                        : '-left-px border-t border-l border-primary rounded-tl-sm'
                    }`}
                  />
                  <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">{msg.text}</p>
                  <span
                    className={`font-label-sm text-label-sm mt-xs block ${
                      msg.role === 'user' ? 'text-secondary text-left' : 'text-on-surface-variant text-right'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-sm max-w-[85%] items-end opacity-70">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 shrink-0 hidden sm:block">
                  <img alt="Nguyễn Du" className="w-full h-full object-cover grayscale" src={images.chatNguyenDuAvatar} />
                </div>
                <div className="bg-surface-container px-md py-sm rounded-2xl rounded-tl-sm border border-outline-variant flex items-center gap-1 h-10">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          <div className="p-md lg:p-lg border-t border-outline-variant bg-surface-container-high/80 backdrop-blur-lg shrink-0">
            <div className="flex overflow-x-auto chat-scroll gap-sm pb-md">
              {quickReplies.map((reply, index) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => sendMessage(reply)}
                  className={`flex-shrink-0 px-sm py-xs rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors ${
                    index === 0
                      ? 'border border-secondary/50 text-secondary hover:bg-secondary/10 glow-secondary'
                      : 'border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                  }`}
                >
                  {reply}
                </button>
              ))}
            </div>
            <div className="relative flex items-center bg-surface rounded-xl border border-outline-variant focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary/50 transition-all p-xs pl-sm">
              <button type="button" className="text-on-surface-variant hover:text-primary p-sm transition-colors rounded-lg">
                <MaterialIcon name="add_circle" className="text-lg" />
              </button>
              <input
                className="flex-1 bg-transparent border-none focus:ring-0 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 px-sm"
                placeholder="Hỏi cụ Nguyễn Du..."
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              />
              <div className="flex items-center gap-xs pr-xs">
                <button type="button" className="text-on-surface-variant hover:text-secondary p-sm transition-colors rounded-lg">
                  <MaterialIcon name="mic" className="text-lg" />
                </button>
                <button
                  type="button"
                  onClick={() => sendMessage(input)}
                  className="bg-primary text-on-primary p-sm rounded-lg hover:bg-primary-fixed-dim transition-colors glow-primary flex items-center justify-center"
                >
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
