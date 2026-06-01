import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { artifactFilters, artifacts, artifactStats } from '../data/mock/artifacts'

const rarityStyles: Record<string, string> = {
  'Phổ biến': 'text-on-surface-variant border-outline-variant',
  Hiếm: 'text-secondary border-secondary/50',
  'Huyền thoại': 'text-primary border-primary/50',
}

export function ArtifactsPage() {
  const [activeFilter, setActiveFilter] = useState<(typeof artifactFilters)[number]>('Tất cả')

  const visible =
    activeFilter === 'Tất cả'
      ? artifacts
      : artifacts.filter((a) => (activeFilter === 'Đã sưu tầm' ? a.scanned : !a.scanned))

  return (
    <AppLayout activeBorder="right" topNav={<SimpleTopNav title="Cổ vật" />}>
      <main className="mt-16 flex-1 p-lg max-w-7xl mx-auto w-full">
        <div className="relative z-10 space-y-xl">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-md border-b border-outline-variant pb-md">
            <div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold bloom-glow">Bộ sưu tập Cổ vật</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
                Quét hiện vật bằng AR để mở khóa và tái hiện 3D.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-surface-container border border-outline-variant rounded-full px-4 py-2">
              <MaterialIcon name="inventory_2" className="text-primary" />
              <span className="font-title-md text-title-md text-on-surface">
                {artifactStats.collected}/{artifactStats.total}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">đã sưu tầm</span>
            </div>
          </div>

          <div className="flex items-center gap-md overflow-x-auto pb-2 scrollbar-hide">
            <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">Trạng thái:</span>
            {artifactFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors ${
                  activeFilter === filter
                    ? 'bg-primary/20 text-primary border border-primary bloom-primary'
                    : 'bg-surface-container border border-outline-variant text-on-surface hover:border-secondary hover:text-secondary'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg pb-xl">
            {visible.map((artifact) => (
              <div
                key={artifact.id}
                className={`glass-panel rounded-xl overflow-hidden border transition-all duration-300 ${
                  artifact.scanned
                    ? 'border-outline-variant hover:border-secondary hover:bloom-secondary'
                    : 'border-outline-variant/50 opacity-80'
                }`}
              >
                <div className={`h-48 relative overflow-hidden ${artifact.scanned ? '' : 'grayscale'}`}>
                  <img
                    alt={artifact.name}
                    className={`w-full h-full object-cover ${artifact.scanned ? 'opacity-70' : 'opacity-50'}`}
                    src={artifact.image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high to-transparent" />
                  {artifact.scanned ? (
                    <div className="absolute top-2 right-2 bg-secondary/20 text-secondary p-1 rounded-full backdrop-blur-sm">
                      <MaterialIcon name="check_circle" className="text-[16px]" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
                      <div className="bg-surface-variant/80 p-3 rounded-full mb-2">
                        <MaterialIcon name="lock" className="text-on-surface-variant text-[24px]" />
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {artifact.unlockRequirement}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-md bg-surface-container-high">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface font-bold">{artifact.name}</h3>
                      <p className="font-label-sm text-label-sm text-secondary">{artifact.dynasty}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs border bg-surface-variant ${rarityStyles[artifact.rarity]}`}
                    >
                      {artifact.rarity}
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm line-clamp-2">
                    {artifact.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppLayout>
  )
}
