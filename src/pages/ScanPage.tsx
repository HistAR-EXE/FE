import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ScanTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'

const scanHistory = [
  {
    id: 'hue-01',
    title: 'Ngọ Môn - Đại Nội Huế',
    meta: 'Hôm qua, 14:30 • ID: HUE-01',
    image: images.scanHistoryNgomon,
    slug: 'dai-noi-hue',
  },
  {
    id: 'ha-05',
    title: 'Chùa Cầu Hội An',
    meta: '12 Thg 10 • ID: HA-05',
    image: images.scanHistoryChuaCau,
    slug: 'chua-cau-hoi-an',
  },
] as const

export function ScanPage() {
  const [code, setCode] = useState('')
  const [scanSuccess, setScanSuccess] = useState(false)

  const handleVerify = () => {
    setScanSuccess(true)
  }

  return (
    <AppLayout activeBorder="right" topNav={<ScanTopNav />}>
      <main className="mt-16 h-[calc(100vh-4rem)] p-xl flex gap-lg bg-scan-pattern min-h-0">
        <section className="w-[min(400px,33%)] min-w-[320px] flex flex-col gap-lg shrink-0 min-h-0">
          <div className="glass-panel rounded-xl p-lg relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-sm mb-md">
                <MaterialIcon name="keyboard" className="text-secondary text-[28px]" />
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Nhập Mã Di Sản</h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
                Hệ thống Desktop đang kích hoạt chế độ giả lập. Vui lòng nhập mã ID di sản được in trên vé hoặc tại
                hiện trường.
              </p>
              <div className="glow-border border border-outline-variant rounded-lg bg-surface-container-low flex items-center p-xs transition-all duration-300">
                <MaterialIcon name="tag" className="text-on-surface-variant pl-sm shrink-0" />
                <input
                  className="bg-transparent border-none focus:ring-0 text-on-surface font-title-md text-title-md w-full placeholder:text-on-surface-variant/50 uppercase tracking-widest"
                  placeholder="VD: HUE-1802-TL"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
                <button
                  type="button"
                  onClick={handleVerify}
                  className="bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-md px-md py-sm font-label-sm text-label-sm transition-colors border border-secondary/30 shrink-0"
                >
                  XÁC THỰC
                </button>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-lg flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-md shrink-0">
              <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-xs">
                <MaterialIcon name="history" className="text-primary text-body-lg" />
                Lịch sử quét
              </h3>
              <button type="button" className="text-secondary font-label-sm text-label-sm hover:underline">
                Xem tất cả
              </button>
            </div>
            <div className="flex flex-col gap-sm overflow-y-auto custom-scrollbar pr-xs flex-1 min-h-0">
              {scanHistory.map((item) => (
                <Link
                  key={item.id}
                  to={`/explore/${item.slug}`}
                  className="p-sm rounded-lg bg-surface-container hover:bg-surface-variant cursor-pointer transition-colors border border-transparent hover:border-outline-variant flex items-center gap-md shrink-0"
                >
                  <div className="w-12 h-12 rounded-md bg-surface-variant shrink-0 overflow-hidden">
                    <img alt={item.title} className="w-full h-full object-cover opacity-80" src={item.image} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-label-sm text-label-sm text-on-surface mb-0.5 truncate">{item.title}</h4>
                    <p className="font-body-md text-[11px] text-on-surface-variant">{item.meta}</p>
                  </div>
                  <MaterialIcon name="chevron_right" className="text-secondary/50 text-body-lg shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="flex-1 min-h-0 relative rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest shadow-2xl flex items-center justify-center">
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-all duration-500 ${
              scanSuccess ? 'opacity-30 blur-sm' : 'opacity-100'
            }`}
          >
            <div className="relative w-3/4 max-w-md aspect-square">
              <img
                alt="Trống Đồng"
                className="w-full h-full object-contain filter grayscale opacity-40 brightness-50 mix-blend-screen"
                src={images.scanDrum}
              />
              <div className="absolute inset-0 border-2 border-secondary/20 rounded-lg overflow-hidden">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-secondary" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-secondary" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-secondary" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-secondary" />
                <div className="scanner-line" />
              </div>
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-sm bg-surface-container/80 backdrop-blur-md px-md py-sm rounded-full border border-secondary/30 whitespace-nowrap">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
                </span>
                <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase">
                  Đang chờ tín hiệu di sản...
                </span>
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary/5 rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/10 rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-secondary/10 rounded-full pointer-events-none" />
          </div>

          {!scanSuccess && (
            <button
              type="button"
              onClick={() => setScanSuccess(true)}
              className="absolute bottom-lg left-1/2 -translate-x-1/2 z-20 px-lg py-sm rounded-lg bg-secondary/20 border border-secondary text-secondary font-title-md hover:bg-secondary/30 transition-colors flex items-center gap-xs"
            >
              <MaterialIcon name="qr_code_scanner" />
              Mô phỏng quét thành công
            </button>
          )}

          <div
            className={`absolute inset-0 z-20 bg-surface-container-lowest/95 backdrop-blur-xl flex flex-col items-center justify-center p-xl transition-opacity duration-500 ${
              scanSuccess ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="w-24 h-24 rounded-full bg-secondary/10 flex items-center justify-center mb-md border border-secondary/50 shadow-[0_0_30px_rgba(68,219,213,0.3)]">
              <MaterialIcon name="check_circle" className="text-secondary text-[48px]" />
            </div>
            <h2 className="font-display-lg text-display-lg text-secondary font-bold mb-xs">Đã xác thực vị trí</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-xl">Dữ liệu không gian đã được đồng bộ.</p>

            <div className="glass-panel w-full max-w-lg rounded-xl p-md border-l-4 border-l-primary flex items-start gap-md mb-xl">
              <div className="w-20 h-20 rounded bg-surface overflow-hidden shrink-0">
                <img alt="Trống Đồng Ngọc Lũ" className="w-full h-full object-cover" src={images.scanArtifactSuccess} />
              </div>
              <div>
                <span className="inline-block px-2 py-1 bg-primary/10 text-primary font-label-sm text-[10px] rounded uppercase tracking-wider mb-sm">
                  Thời kỳ Đông Sơn
                </span>
                <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold">
                  Trống Đồng Ngọc Lũ
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1 line-clamp-2">
                  Bảo vật quốc gia mang biểu tượng mặt trời trung tâm, phản ánh đời sống vật chất và tinh thần phong
                  phú...
                </p>
              </div>
            </div>

            <div className="flex gap-md flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setScanSuccess(false)}
                className="px-xl py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors font-title-md text-title-md"
              >
                Quét Lại
              </button>
              <Link
                to="/artifacts"
                className="px-xl py-sm rounded-lg bg-primary text-on-primary font-title-md text-title-md hover:bg-primary-fixed transition-colors shadow-[0_0_20px_rgba(242,191,80,0.3)] flex items-center gap-xs"
              >
                Khám phá chi tiết
                <MaterialIcon name="arrow_forward" className="text-body-md" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </AppLayout>
  )
}
