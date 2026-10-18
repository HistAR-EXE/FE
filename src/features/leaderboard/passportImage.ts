// src/features/leaderboard/passportImage.ts
import { HERITAGE_BADGES } from '../explore/heritageBadges'
import type { ExplorerPassport } from './extrasApi'
import { formatXp } from './format'
import fallbackMascotUrl from '../../assets/mascot.png'

export interface PassportOptions {
    name: boolean
    xp: boolean
    level: boolean
    badges: boolean
    selectedBadges: string[]
    slogan: string
    avatarUrl?: string | null
    email?: string | null
}

type ExplorerPassportWithMeta = ExplorerPassport & {
    avatarUrl?: string | null
    email?: string | null
}

export const PASSPORT_SLOGANS: string[] = [
    'Mang theo sự tò mò. Để lại những dấu ấn.',
    'Tri thức ở lại. Hành trình tiếp nối.',
    'Mỗi bước chân, một điều đáng tự hào.',
    'Relive History, Reshape Heritage — Sống lại sử vàng, kiến tạo tương lai.',
    'Chạm vào mạch ngầm Đất Thép — Thấu hiểu ý chí Việt Nam.',
    '250km địa đạo dưới lòng đất, vạn dặm tự hào trong tim người trẻ.',
    'Từ lòng đất tối Củ Chi, ánh sáng độc lập đã vươn tới bầu trời.',
    'Không cần xi măng, chỉ cần lòng dân kết thành Đất Thép Thành Đồng.',
    'Đi qua 3 tầng sâu lịch sử để trân quý từng phút giây hòa bình hôm nay.',
    'Cùng Chrono vượt không gian, lắng nghe nhịp đập bất khuất của cha ông.',
    'Mỗi mật thư giải mã là một trang sử vàng được thắp sáng trở lại.',
    'Tuổi trẻ Việt Nam: Giữ lửa ký ức, viết tiếp hành trình di sản số TimeLens.',
]

const LEVEL_TITLES: Record<number, string> = {
    1: 'Tân Binh Khảo Cổ',
    2: 'Người Dò Đường Đất Thép',
    3: 'Chiến Sĩ Thông Hầm',
    4: 'Chuyên Gia Cơ Yếu',
    5: 'Thám Tử Sử Liệu',
    6: 'Kiến Trúc Sư Địa Đạo',
    7: 'Sứ Giả Di Sản Củ Chi',
    8: 'Bậc Thầy Lịch Sử Số',
    9: 'Huyền Thoại TimeLens',
}

export function getExplorerLevelTitle(level: number, fallbackName?: string): string {
    if (fallbackName && fallbackName.trim().length > 0) {
        return fallbackName.trim()
    }
    return LEVEL_TITLES[level] ?? `Sứ Giả Di Sản · Cấp ${level}`
}

export function generatePassportNumber(userId: string, generatedAt?: string): string {
    const clean = (userId || 'TIMELENS').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    let hash = 0
    for (let i = 0; i < clean.length; i++) {
        hash = (hash * 31 + clean.charCodeAt(i)) % 900000
    }
    const num = String(100000 + Math.abs(hash)).slice(0, 6)
    const yearSuffix = generatedAt && generatedAt.length >= 4 ? generatedAt.slice(2, 4) : '26'
    const charCode = String.fromCharCode(65 + (Math.abs(hash) % 26))
    return `TL${yearSuffix}-${num}${charCode}`
}

export function buildPassportMrzLines(
    displayName: string,
    passportNo: string,
    showName: boolean
): [string, string] {
    const rawName = showName
        ? displayName.replace(/ · Mẫu UI$/, '').trim() || 'EXPLORER TIMELENS'
        : 'EXPLORER TIMELENS'

    const asciiName = rawName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '<')
        .replace(/^<+|<+$/g, '')

    const line1 = 'P<VNMTIMELENS<<HISTAR<CUCHI<HERITAGE<<<<<<<<<'.slice(0, 44)
    const cleanNo = passportNo.replace(/[^A-Z0-9]/g, '')
    const line2Raw = `${cleanNo}<8VNM2026<<${asciiName}<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`
    const line2 = line2Raw.slice(0, 44)
    return [line1, line2]
}

function canDrawImageUntainted(img: HTMLImageElement): boolean {
    if (!img.complete || img.naturalWidth === 0) return false
    try {
        const testCanvas = document.createElement('canvas')
        testCanvas.width = 1
        testCanvas.height = 1
        const testCtx = testCanvas.getContext('2d')
        if (!testCtx) return false
        testCtx.drawImage(img, 0, 0, 1, 1)
        testCanvas.toDataURL('image/png')
        return true
    } catch {
        return false
    }
}

function normalizeHighResAvatarUrl(url: string): string {
    if (!url) return url
    if (url.includes('googleusercontent.com')) {
        return url.replace(/=s\d+(-c)?/g, '=s512-c')
    }
    return url
}

async function loadElementFromSrc(
    src: string,
    timeoutMs = 1400,
    anonymous = true
): Promise<HTMLImageElement | null> {
    if (typeof Image === 'undefined' || !src) return null
    return new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image()
        if (anonymous && !src.startsWith('data:')) {
            img.crossOrigin = 'anonymous'
            img.referrerPolicy = 'no-referrer'
        }
        const timer = window.setTimeout(() => resolve(null), timeoutMs)
        img.onload = () => {
            window.clearTimeout(timer)
            resolve(img)
        }
        img.onerror = () => {
            window.clearTimeout(timer)
            resolve(null)
        }
        img.src = src
    })
}

async function fetchAsImage(url: string, timeoutMs = 1400): Promise<HTMLImageElement | null> {
    try {
        const controller = new AbortController()
        const timer = window.setTimeout(() => controller.abort(), timeoutMs)
        const res = await fetch(url, {
            signal: controller.signal,
            cache: 'reload',
            mode: 'cors',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
        })
        window.clearTimeout(timer)
        if (!res.ok) return null
        const blob = await res.blob()
        const dataUrl = await new Promise<string | null>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () =>
                resolve(typeof reader.result === 'string' ? reader.result : null)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
        if (!dataUrl) return null
        return loadElementFromSrc(dataUrl, timeoutMs, false)
    } catch {
        return null
    }
}

function firstValidImage(
    tasks: Array<Promise<HTMLImageElement | null>>
): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        let pending = tasks.length
        if (pending === 0) {
            resolve(null)
            return
        }
        let settled = false
        tasks.forEach((task) => {
            task.then((img) => {
                if (!settled && img && canDrawImageUntainted(img)) {
                    settled = true
                    resolve(img)
                } else {
                    pending -= 1
                    if (!settled && pending <= 0) {
                        resolve(null)
                    }
                }
            }).catch(() => {
                pending -= 1
                if (!settled && pending <= 0) {
                    resolve(null)
                }
            })
        })
    })
}

async function loadSingleImage(
    rawUrl: string,
    domImg?: HTMLImageElement | null,
    timeoutMs = 1400
): Promise<HTMLImageElement | null> {
    if (domImg && canDrawImageUntainted(domImg)) {
        return domImg
    }
    if (!rawUrl) return null

    const highResUrl = normalizeHighResAvatarUrl(rawUrl)
    const tasks: Array<Promise<HTMLImageElement | null>> = [
        loadElementFromSrc(highResUrl, timeoutMs, true),
        fetchAsImage(highResUrl, timeoutMs),
    ]

    if (highResUrl.startsWith('http://') || highResUrl.startsWith('https://')) {
        const cacheBusted = `${highResUrl}${highResUrl.includes('?') ? '&' : '?'}tl_cv=1`
        tasks.push(loadElementFromSrc(cacheBusted, timeoutMs, true))

        if (!highResUrl.includes('localhost') && !highResUrl.includes('127.0.0.1')) {
            const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(highResUrl)}&w=512&h=512&fit=cover&output=png`
            tasks.push(loadElementFromSrc(proxyUrl, timeoutMs, true))
        }
    }

    return firstValidImage(tasks)
}

async function loadImageSafe(
    urls: string[],
    domImg?: HTMLImageElement | null,
    timeoutMs = 1400
): Promise<HTMLImageElement | null> {
    if (domImg && canDrawImageUntainted(domImg)) {
        return domImg
    }
    for (const url of urls) {
        if (!url) continue
        const loaded = await loadSingleImage(url, null, timeoutMs)
        if (loaded && loaded.width > 0) return loaded
    }
    return null
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    const radius = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.arcTo(x + w, y, x + w, y + h, radius)
    ctx.arcTo(x + w, y + h, x, y + h, radius)
    ctx.arcTo(x, y + h, x, y, radius)
    ctx.arcTo(x, y, x + w, y, radius)
    ctx.closePath()
}

function drawImageObjectCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
) {
    const iw = img.naturalWidth || img.width
    const ih = img.naturalHeight || img.height
    if (!iw || !ih) return

    const scale = Math.max(w / iw, h / ih)
    const sw = w / scale
    const sh = h / scale
    const sx = (iw - sw) / 2
    const sy = (ih - sh) / 2
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function wrapTextLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines = 2
): string[] {
    const words = text.trim().split(/\s+/)
    const lines: string[] = []
    let current = ''

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        if (ctx.measureText(candidate).width <= maxWidth) {
            current = candidate
        } else {
            if (current) lines.push(current)
            current = word
            if (lines.length >= maxLines - 1) break
        }
    }
    if (current && lines.length < maxLines) {
        lines.push(current)
    }
    return lines
}

function drawTrackedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    trackingPx: number,
    align: 'left' | 'center' | 'right' = 'left'
) {
    const chars = text.split('')
    const widths = chars.map((c) => ctx.measureText(c).width)
    const totalW =
        widths.reduce((acc, w) => acc + w, 0) + Math.max(0, chars.length - 1) * trackingPx

    let curX = x
    if (align === 'center') curX = x - totalW / 2
    else if (align === 'right') curX = x - totalW

    ctx.save()
    ctx.textAlign = 'left'
    chars.forEach((ch, idx) => {
        ctx.fillText(ch, curX, y)
        curX += widths[idx] + trackingPx
    })
    ctx.restore()
}

function drawSpacedMrzLine(
    ctx: CanvasRenderingContext2D,
    line: string,
    startX: number,
    y: number,
    totalWidth: number
) {
    const chars = line.split('')
    if (chars.length <= 1) {
        ctx.fillText(line, startX, y)
        return
    }
    const step = totalWidth / (chars.length - 1)
    ctx.save()
    ctx.textAlign = 'center'
    chars.forEach((ch, idx) => {
        ctx.fillText(ch, startX + idx * step, y)
    })
    ctx.restore()
}

function drawOfficialVisaStamp(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    dateStr: string,
    font: string
) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-0.18)

    ctx.strokeStyle = 'rgba(190, 18, 60, 0.9)'
    ctx.lineWidth = 3.8
    ctx.beginPath()
    ctx.arc(0, 0, 76, 0, Math.PI * 2)
    ctx.stroke()

    ctx.lineWidth = 1.6
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.arc(0, 0, 67, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = 'rgba(225, 29, 72, 0.055)'
    ctx.beginPath()
    ctx.arc(0, 0, 74, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(190, 18, 60, 0.95)'
    ctx.textAlign = 'center'
    ctx.font = `900 10px ${font}`
    ctx.fillText('★ TIMELENS × HISTAR ★', 0, -39)

    ctx.font = `900 12.5px ${font}`
    ctx.fillText('ĐỊA ĐẠO CỦ CHI', 0, -20)

    drawRoundedRect(ctx, -64, -12, 128, 24, 6)
    ctx.fillStyle = 'rgba(190, 18, 60, 0.93)'
    ctx.fill()

    ctx.fillStyle = '#FFFBEB'
    ctx.font = `900 11px ${font}`
    ctx.fillText('ĐÃ XÁC THỰC DI SẢN', 0, 4)

    ctx.fillStyle = 'rgba(190, 18, 60, 0.95)'
    ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.fillText(`11°08'N · ${dateStr}`, 0, 29)

    ctx.font = `900 9px ${font}`
    ctx.fillText('ĐẤT THÉP THÀNH ĐỒNG', 0, 45)

    ctx.restore()
}

export async function renderPassport(
    data: ExplorerPassport,
    options: PassportOptions,
    previewElement?: HTMLElement | null
): Promise<Blob> {
    if (typeof document !== 'undefined' && 'fonts' in document) {
        await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => window.setTimeout(resolve, 1000)),
        ])
    }

    // Giữ đúng chuẩn 1.200 x 1.500 px để tương thích 100% với dịch vụ gửi Email và Tải xuống
    const width = 1200
    const height = 1500
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        throw new Error('Trình duyệt chưa hỗ trợ tạo ảnh.')
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const font =
        typeof document !== 'undefined'
            ? getComputedStyle(previewElement ?? document.body).fontFamily || 'sans-serif'
            : 'sans-serif'

    const passportMeta: ExplorerPassportWithMeta = data
    const candidateAvatar = options.name
        ? options.avatarUrl ?? passportMeta.avatarUrl ?? fallbackMascotUrl
        : fallbackMascotUrl
    const candidateEmail = options.email ?? passportMeta.email ?? ''

    const earnedSet = new Set(data.heritageBadges.map((b) => b.id))
    const selectedBadgeObjs = HERITAGE_BADGES.filter(
        (b) => earnedSet.has(b.id) && options.selectedBadges.includes(b.id)
    ).slice(0, 3)

    const domLogoImg = previewElement?.querySelector<HTMLImageElement>(
        'img[data-passport-role="histar-logo"]'
    )
    const domAvatarImg = previewElement?.querySelector<HTMLImageElement>(
        'img[data-passport-role="avatar"]'
    )

    const [histarLogoImg, avatarImg, ...badgeImgs] = await Promise.all([
        loadImageSafe(['/brand/logo_2.png', '/brand/logo-histar.png'], domLogoImg),
        loadImageSafe([candidateAvatar, fallbackMascotUrl], domAvatarImg),
        ...(options.badges
            ? selectedBadgeObjs.map((b) => {
                const domBadge = previewElement?.querySelector<HTMLImageElement>(
                    `img[data-passport-badge="${b.id}"]`
                )
                return loadImageSafe([b.image], domBadge)
            })
            : []),
    ])

    const passportNo = generatePassportNumber(data.userId, data.generatedAt)
    const parsedGeneratedDate = Date.parse(data.generatedAt)
    const issueDate = new Date(
        Number.isNaN(parsedGeneratedDate) ? '2026-01-01T00:00:00.000Z' : parsedGeneratedDate
    ).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })

    // 1. KHUNG BÌA NGOÀI XANH ĐÊM HOÀNG GIA
    const outerGrad = ctx.createLinearGradient(0, 0, 0, height)
    outerGrad.addColorStop(0, '#07132C')
    outerGrad.addColorStop(0.5, '#0E224D')
    outerGrad.addColorStop(1, '#033980')
    drawRoundedRect(ctx, 0, 0, width, height, 46)
    ctx.fillStyle = outerGrad
    ctx.fill()

    drawRoundedRect(ctx, 4, 4, width - 8, height - 8, 44)
    ctx.strokeStyle = '#FDC908'
    ctx.lineWidth = 5
    ctx.stroke()

    // 2. THẺ HỘ CHIẾU BÊN TRONG
    const cardX = 38
    const cardY = 38
    const cardW = 1124
    const cardH = 1424

    ctx.save()
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 38)
    ctx.fillStyle = '#FCFBF7'
    ctx.fill()
    ctx.clip()

    // 3. ĐỈNH HỘ CHIẾU
    const headerH = 285
    const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY)
    headerGrad.addColorStop(0, '#042A6B')
    headerGrad.addColorStop(0.5, '#0262D6')
    headerGrad.addColorStop(1, '#022359')
    ctx.fillStyle = headerGrad
    ctx.fillRect(cardX, cardY, cardW, headerH)

    // Góc trái: Logo HistAR sắc nét (Đã bỏ shadowBlur gây nhòe viền)
    if (histarLogoImg) {
        const ratio =
            (histarLogoImg.naturalWidth || histarLogoImg.width) /
            (histarLogoImg.naturalHeight || histarLogoImg.height)
        const h = 92
        const w = h * ratio
        ctx.drawImage(histarLogoImg, cardX + 52, cardY + 30, w, h)
    } else {
        ctx.textAlign = 'left'
        ctx.fillStyle = '#FDC908'
        ctx.font = `italic 900 44px ${font}`
        ctx.fillText('HistAR', cardX + 52, cardY + 88)
    }

    // Góc phải: Nhãn vàng E-PASSPORT
    const pillText = `E-PASSPORT · ${passportNo}`
    ctx.font = `900 24px ${font}`
    const pillW = Math.max(360, ctx.measureText(pillText).width + 64)
    const pillH = 62
    const pillX = cardX + cardW - pillW - 52
    const pillY = cardY + 44

    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY)
    pillGrad.addColorStop(0, '#FFF2C3')
    pillGrad.addColorStop(1, '#FDC908')
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 20)
    ctx.fillStyle = pillGrad
    ctx.fill()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#0F1B33'
    ctx.fillText(pillText, pillX + pillW / 2, pillY + 40)

    // Tiêu đề trung tâm Header
    ctx.fillStyle = '#FFF2C3'
    ctx.font = `900 22px ${font}`
    drawTrackedText(
        ctx,
        'TIMELENS · CỘNG HÒA DI SẢN SỐ',
        cardX + cardW / 2,
        cardY + 156,
        4.2,
        'center'
    )

    ctx.textAlign = 'center'
    ctx.fillStyle = '#FDC908'
    ctx.font = `900 54px ${font}`
    ctx.fillText('HỘ CHIẾU DI SẢN ĐẤT THÉP', cardX + cardW / 2, cardY + 216)

    ctx.fillStyle = '#DBEAFE'
    ctx.font = `700 25px ${font}`
    ctx.fillText(
        'Khu Di Tích Quốc Gia Đặc Biệt Địa Đạo Củ Chi',
        cardX + cardW / 2,
        cardY + 256
    )

    ctx.fillStyle = '#FDC908'
    ctx.fillRect(cardX, cardY + headerH - 4, cardW, 4)

    // 4. NỀN GIẤY CHẤM BI XANH
    const bodyY = cardY + headerH
    ctx.save()
    ctx.fillStyle = '#0275FB'
    ctx.globalAlpha = 0.45
    for (let gx = cardX + 20; gx < cardX + cardW - 10; gx += 36) {
        for (let gy = bodyY + 20; gy < cardY + cardH - 10; gy += 36) {
            ctx.beginPath()
            ctx.arc(gx, gy, 1.7, 0, Math.PI * 2)
            ctx.fill()
        }
    }
    ctx.restore()

    const innerX = cardX + 52
    const innerW = cardW - 104

    // 5. DÒNG LOẠI HỘ CHIẾU + AVATAR + HỌ TÊN + EMAIL + DẤU MỘC ĐỎ THƯƠNG HIỆU
    const metaY = bodyY + 48
    ctx.textAlign = 'left'
    ctx.fillStyle = '#94A3B8'
    ctx.font = `900 20px ${font}`
    ctx.fillText('LOẠI: P · HERITAGE', innerX, metaY)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#0275FB'
    ctx.fillText('MÃ QUỐC GIA: VNM · CỦ CHI', innerX + innerW, metaY)

    ctx.fillStyle = '#E2E8F0'
    ctx.fillRect(innerX, metaY + 20, innerW, 2)

    const avatarSize = 148
    const avatarX = innerX
    const avatarY = metaY + 46
    const avatarCx = avatarX + avatarSize / 2
    const avatarCy = avatarY + avatarSize / 2

    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarCx, avatarCy, avatarSize / 2 + 5, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(253, 201, 8, 0.65)'
    ctx.lineWidth = 5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(avatarCx, avatarCy, avatarSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.clip()

    if (avatarImg) {
        drawImageObjectCover(ctx, avatarImg, avatarX, avatarY, avatarSize, avatarSize)
    } else {
        ctx.fillStyle = '#EAF3FF'
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize)
    }
    ctx.restore()

    ctx.beginPath()
    ctx.arc(avatarCx, avatarCy, avatarSize / 2, 0, Math.PI * 2)
    ctx.strokeStyle = '#0275FB'
    ctx.lineWidth = 4.5
    ctx.stroke()

    const textStartX = avatarX + avatarSize + 34
    ctx.fillStyle = '#0275FB'
    ctx.font = `900 20px ${font}`
    drawTrackedText(
        ctx,
        'HỌ VÀ TÊN NHÀ THÁM HIỂM / EXPLORER FULL NAME',
        textStartX,
        avatarY + 38,
        1.2,
        'left'
    )

    const displayHolderName = options.name
        ? data.displayName.replace(/ · Mẫu UI$/, '').trim() || 'Nhà thám hiểm TimeLens'
        : 'Một nhà thám hiểm TimeLens'

    ctx.textAlign = 'left'
    ctx.fillStyle = '#0F1B33'
    ctx.font = `900 46px ${font}`
    ctx.fillText(displayHolderName.slice(0, 26), textStartX, avatarY + 92)

    ctx.fillStyle = '#64748B'
    ctx.font = `700 25px ${font}`
    ctx.fillText(
        options.name ? candidateEmail : 'Thông tin cá nhân đã ẩn',
        textStartX,
        avatarY + 132
    )

    // Đóng Dấu mộc đỏ thương hiệu TimeLens × HistAR ở góc phải khu vực Họ tên
    drawOfficialVisaStamp(ctx, innerX + innerW - 86, avatarCy + 4, issueDate, font)

    // 6. HAI Ô CHỈ SỐ: TÍCH LŨY XP & CẤP BẬC
    const statsY = avatarY + avatarSize + 32
    const statGap = 24
    const statW = (innerW - statGap) / 2
    const statH = 136

    drawRoundedRect(ctx, innerX, statsY, statW, statH, 28)
    ctx.fillStyle = '#F2F7FF'
    ctx.fill()
    ctx.strokeStyle = 'rgba(2, 117, 251, 0.22)'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = '#94A3B8'
    ctx.font = `900 18px ${font}`
    ctx.fillText('TÍCH LŨY XP', innerX + 28, statsY + 46)

    ctx.fillStyle = '#0275FB'
    ctx.font = `900 36px ${font}`
    ctx.fillText(
        options.xp ? `${formatXp(data.totalPoints)} XP` : 'Đã bảo mật',
        innerX + 28,
        statsY + 98
    )

    const rightStatX = innerX + statW + statGap
    drawRoundedRect(ctx, rightStatX, statsY, statW, statH, 28)
    ctx.fillStyle = '#FFFBEB'
    ctx.fill()
    ctx.strokeStyle = '#FDC908'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = 'rgba(146, 64, 14, 0.8)'
    ctx.font = `900 18px ${font}`
    ctx.fillText('CẤP BẬC', rightStatX + 28, statsY + 46)

    ctx.fillStyle = '#0F1B33'
    ctx.font = `900 28px ${font}`
    const levelLabel = options.level
        ? `Cấp ${data.level} · ${getExplorerLevelTitle(data.level, data.levelName)}`
        : 'Sứ giả Di sản'
    ctx.fillText(levelLabel.slice(0, 32), rightStatX + 28, statsY + 96)

    // 7. KHỐI CÂU TUYÊN NGÔN CÁ NHÂN
    const quoteY = statsY + statH + 28
    const quoteH = 112

    drawRoundedRect(ctx, innerX, quoteY, innerW, quoteH, 28)
    ctx.fillStyle = '#FDC908'
    ctx.fill()

    drawRoundedRect(ctx, innerX + 8, quoteY + 2, innerW - 10, quoteH - 4, 26)
    const quoteGrad = ctx.createLinearGradient(innerX, quoteY, innerX + innerW, quoteY)
    quoteGrad.addColorStop(0, '#FFFBEB')
    quoteGrad.addColorStop(0.65, '#FFFFFF')
    quoteGrad.addColorStop(1, '#F2F7FF')
    ctx.fillStyle = quoteGrad
    ctx.fill()

    ctx.textAlign = 'left'
    ctx.fillStyle = '#0F1B33'
    ctx.font = `italic 900 28px ${font}`
    const sloganLines = wrapTextLines(ctx, `“${options.slogan}”`, innerW - 72, 2)
    if (sloganLines.length === 1) {
        ctx.fillText(sloganLines[0], innerX + 38, quoteY + 66)
    } else {
        sloganLines.forEach((line, idx) => {
            ctx.fillText(line, innerX + 38, quoteY + 48 + idx * 34)
        })
    }

    // 8. THỊ THỰC HUY HIỆU ĐẤT THÉP
    const badgeHeaderY = quoteY + quoteH + 42
    ctx.textAlign = 'left'
    ctx.fillStyle = '#0275FB'
    ctx.font = `900 20px ${font}`
    ctx.fillText(
        `THỊ THỰC HUY HIỆU ĐẤT THÉP (${options.badges ? selectedBadgeObjs.length : 0}/3)`,
        innerX,
        badgeHeaderY
    )

    const stampText = `★ CỦ CHI 250KM · ${issueDate}`
    ctx.font = `900 18px ${font}`
    const stampW = ctx.measureText(stampText).width + 40
    const stampH = 42
    const stampX = innerX + innerW - stampW
    const stampY = badgeHeaderY - 28

    drawRoundedRect(ctx, stampX, stampY, stampW, stampH, 21)
    ctx.fillStyle = '#FFF1F2'
    ctx.fill()
    ctx.strokeStyle = '#FDA4AF'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#BE123C'
    ctx.fillText(stampText, stampX + stampW / 2, stampY + 28)

    const cardsY = badgeHeaderY + 24
    const cardsH = 248

    if (options.badges && selectedBadgeObjs.length > 0) {
        const cardGap = 24
        const slotW = (innerW - cardGap * 2) / 3

        selectedBadgeObjs.forEach((badge, idx) => {
            const sx = innerX + idx * (slotW + cardGap)

            drawRoundedRect(ctx, sx, cardsY, slotW, cardsH, 28)
            ctx.fillStyle = '#FFFFFF'
            ctx.fill()
            ctx.strokeStyle = '#FDC908'
            ctx.lineWidth = 2.5
            ctx.stroke()

            const bImg = badgeImgs[idx]
            if (bImg) {
                ctx.drawImage(bImg, sx + (slotW - 120) / 2, cardsY + 24, 120, 120)
            } else {
                ctx.fillStyle = '#FDC908'
                ctx.beginPath()
                ctx.arc(sx + slotW / 2, cardsY + 84, 48, 0, Math.PI * 2)
                ctx.fill()
            }

            ctx.textAlign = 'center'
            ctx.fillStyle = '#0F1B33'
            ctx.font = `900 22px ${font}`
            const badgeNameLines = wrapTextLines(ctx, badge.name, slotW - 32, 2)
            if (badgeNameLines.length === 1) {
                ctx.fillText(badgeNameLines[0], sx + slotW / 2, cardsY + 196)
            } else {
                badgeNameLines.forEach((line, lIdx) => {
                    ctx.fillText(line, sx + slotW / 2, cardsY + 182 + lIdx * 28)
                })
            }
        })
    } else {
        drawRoundedRect(ctx, innerX, cardsY, innerW, cardsH, 28)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.strokeStyle = '#E2E8F0'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.textAlign = 'center'
        ctx.fillStyle = '#475569'
        ctx.font = `700 24px ${font}`
        ctx.fillText(
            'Hộ chiếu đã sẵn sàng để tải về máy hoặc nhận qua email.',
            innerX + innerW / 2,
            cardsY + 132
        )
    }

    // 9. DẢI MÃ QUANG HỌC MRZ DÀN ĐỀU SÁT KHUNG Ở ĐÁY SỔ
    const mrzY = cardsY + cardsH + 26
    const mrzH = 148

    drawRoundedRect(ctx, innerX, mrzY, innerW, mrzH, 28)
    ctx.fillStyle = '#F1F5F9'
    ctx.fill()
    ctx.strokeStyle = '#CBD5E1'
    ctx.lineWidth = 2.5
    ctx.stroke()

    const [mrz1, mrz2] = buildPassportMrzLines(data.displayName, passportNo, options.name)
    ctx.fillStyle = '#0F1B33'
    ctx.font = '700 23px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace'
    const mrzInnerWidth = innerW - 72
    drawSpacedMrzLine(ctx, mrz1, innerX + 36, mrzY + 60, mrzInnerWidth)
    drawSpacedMrzLine(ctx, mrz2, innerX + 36, mrzY + 108, mrzInnerWidth)

    ctx.restore()

    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 38)
    ctx.strokeStyle = '#FDC908'
    ctx.lineWidth = 4
    ctx.stroke()

    return new Promise<Blob>((resolve, reject) => {
        if (typeof canvas.toBlob === 'function') {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob)
                else reject(new Error('Chưa tạo được ảnh PNG.'))
            }, 'image/png')
        } else {
            reject(new Error('Trình duyệt chưa hỗ trợ xuất ảnh PNG.'))
        }
    })
}