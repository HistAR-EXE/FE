import { Link, Navigate, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { DetailHeader } from '../components/layout/DetailHeader'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { getHeritageBySlug } from '../data/mock/heritageDetail'
import type { HeritageTag } from '../data/mock/heritageDetail'

function tagClasses(variant: HeritageTag['variant']) {
  if (variant === 'secondary') {
    return 'bg-surface-container/80 backdrop-blur-md border border-primary/30 text-primary'
  }
  if (variant === 'primary') {
    return 'bg-surface-container/80 backdrop-blur-md border border-outline-variant text-on-surface-variant'
  }
  return 'bg-surface-container/80 backdrop-blur-md border border-outline-variant text-on-surface-variant'
}

export function HeritageDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const heritage = slug ? getHeritageBySlug(slug) : undefined

  if (!heritage) {
    return <Navigate to="/explore" replace />
  }

  const portalSlug = slug ?? 'thang-long'

  return (
    <AppLayout activeBorder="right" topNav={<DetailHeader />}>
      <main className="pt-20 pb-24 px-safe-area-inset md:px-lg w-full max-w-7xl mx-auto min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg lg:gap-xl items-start">
          <div className="lg:col-span-8 flex flex-col gap-md min-w-0">
            <div className="relative w-full h-[400px] lg:h-[500px] rounded-xl overflow-hidden border border-outline-variant shadow-lg group">
              <img
                alt={heritage.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src={heritage.heroImage}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-lg w-full">
                <div className="flex gap-2 mb-sm flex-wrap">
                  {heritage.tags.map((tag) => (
                    <span
                      key={tag.label}
                      className={`px-3 py-1 rounded-full font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1 ${tagClasses(tag.variant)}`}
                    >
                      {tag.icon && <MaterialIcon name={tag.icon} className="text-[14px]" />}
                      {tag.label}
                    </span>
                  ))}
                </div>
                <h1 className="font-display-lg text-display-lg text-primary mb-2 bloom-glow inline-block">
                  {heritage.title}
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl line-clamp-2">
                  {heritage.shortDescription}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
              <div className="bg-surface-container p-md rounded-lg border border-outline-variant flex items-center gap-md min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                  <MaterialIcon name="history" />
                </div>
                <div className="min-w-0">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Niên đại</p>
                  <p className="font-title-md text-title-md text-on-surface truncate">{heritage.stats.era}</p>
                </div>
              </div>
              <div className="bg-surface-container p-md rounded-lg border border-outline-variant flex items-center gap-md min-w-0">
                <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary shrink-0">
                  <MaterialIcon name="map" />
                </div>
                <div className="min-w-0">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Diện tích</p>
                  <p className="font-title-md text-title-md text-on-surface truncate">{heritage.stats.area}</p>
                </div>
              </div>
              <div className="bg-surface-container p-md rounded-lg border border-outline-variant flex items-center gap-md min-w-0">
                <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary shrink-0">
                  <MaterialIcon name="local_fire_department" />
                </div>
                <div className="min-w-0">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Độ khó khám phá</p>
                  <p className="font-title-md text-title-md text-on-surface truncate">{heritage.stats.difficulty}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <Link
                to={`/time-portal/${portalSlug}`}
                className="group relative md:col-span-2 h-48 rounded-xl overflow-hidden border border-primary/50 hover:border-primary transition-colors bloom-primary"
              >
                <img
                  alt={heritage.timePortal.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                  src={heritage.timePortal.image}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
                <div className="relative z-10 h-full flex flex-col justify-center p-lg max-w-md">
                  <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider mb-1">
                    Time Portal
                  </span>
                  <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">{heritage.timePortal.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{heritage.timePortal.description}</p>
                </div>
                <MaterialIcon
                  name="motion_photos_on"
                  className="absolute right-lg top-1/2 -translate-y-1/2 text-primary text-5xl opacity-30 group-hover:opacity-60 transition-opacity"
                />
              </Link>

              <Link
                to={`/tour/360/${portalSlug}`}
                className="relative h-40 rounded-xl overflow-hidden border border-secondary/30 hover:border-secondary transition-colors bg-surface-container flex flex-col justify-end p-md group"
              >
                <MaterialIcon name="view_in_ar" className="text-secondary text-3xl mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-title-md text-title-md text-on-surface">Tour 360°</h4>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Khám phá không gian ảo</p>
              </Link>

              <Link
                to="/quests/dau-an-hoang-thanh"
                className="relative h-40 rounded-xl overflow-hidden border border-outline-variant bg-surface-container hover:border-primary/50 transition-colors flex flex-col justify-center p-md group"
              >
                <MaterialIcon name="assignment" className="text-primary text-3xl mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-title-md text-title-md text-on-surface">Nhiệm vụ ({heritage.questCount})</h4>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                  Hoàn thành để nhận huy hiệu di sản
                </p>
              </Link>

              <Link
                to={heritage.aiGuide.chatPath}
                className="relative h-40 rounded-xl overflow-hidden border border-secondary/40 hover:border-secondary transition-colors flex flex-col justify-center p-md group bg-surface-container"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-primary/5 pointer-events-none" />
                <MaterialIcon name="forum" className="text-secondary text-3xl mb-2 group-hover:scale-110 transition-transform relative z-10" />
                <h4 className="font-title-md text-title-md text-on-surface relative z-10">
                  Trò chuyện với {heritage.aiGuide.characterName}
                </h4>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 relative z-10">
                  {heritage.aiGuide.subtitle}
                </p>
              </Link>

              <div className="relative h-40 rounded-xl overflow-hidden border border-outline-variant bg-surface-container group">
                <img
                  alt={heritage.artifact.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500"
                  src={heritage.artifact.image}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <div className="relative z-10 h-full flex flex-col justify-end p-md">
                  <MaterialIcon name="museum" className="text-secondary mb-1" />
                  <h4 className="font-title-md text-title-md text-on-surface">{heritage.artifact.title}</h4>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{heritage.artifact.subtitle}</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 min-w-0">
            <div className="lg:sticky lg:top-24 bg-surface-container border border-outline-variant rounded-xl p-lg">
              <h2 className="font-title-md text-title-md text-on-surface mb-md flex items-center gap-2">
                <MaterialIcon name="info" className="text-secondary shrink-0" />
                Giới thiệu
              </h2>
              <div className="flex flex-col gap-sm mb-lg">
                {heritage.about.map((paragraph, i) => (
                  <p key={i} className="font-body-md text-body-md text-on-surface-variant">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="flex flex-col gap-md border-t border-outline-variant pt-md">
                <div className="flex items-start gap-md">
                  <MaterialIcon name="location_on" className="text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Địa chỉ</p>
                    <p className="font-body-md text-body-md text-on-surface">{heritage.meta.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-md">
                  <MaterialIcon name="schedule" className="text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Giờ mở cửa</p>
                    <p className="font-body-md text-body-md text-on-surface">{heritage.meta.hours}</p>
                  </div>
                </div>
                <div className="flex items-start gap-md">
                  <MaterialIcon name="confirmation_number" className="text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Vé vào cổng</p>
                    <p className="font-body-md text-body-md text-on-surface">{heritage.meta.ticket}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </AppLayout>
  )
}
