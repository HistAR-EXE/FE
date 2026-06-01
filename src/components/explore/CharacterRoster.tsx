import { useState } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'
import {
  characterFilters,
  characters,
  featuredCharacter,
} from '../../data/mock/characters'

type CharacterRosterProps = {
  variant?: 'explore' | 'onboarding'
  selectedId?: string
  onSelect?: (id: string) => void
}

export function CharacterRoster({
  variant = 'explore',
  selectedId,
  onSelect,
}: CharacterRosterProps) {
  const [activeFilter, setActiveFilter] = useState<(typeof characterFilters)[number]>('Tất cả')

  const visibleCharacters =
    activeFilter === 'Tất cả'
      ? characters
      : characters.filter((c) => c.dynasty === activeFilter)

  const featuredSelected = selectedId === featuredCharacter.id

  return (
    <div className="space-y-xl">
      <div className="glass-panel rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-0 bloom-primary relative">
        <div className="lg:col-span-2 relative h-64 lg:h-auto min-h-[280px]">
          <img
            alt={featuredCharacter.name}
            className="absolute inset-0 w-full h-full object-cover object-top opacity-80"
            src={featuredCharacter.image}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-background/50 lg:to-background" />
          <div className="absolute bottom-md left-md lg:bottom-lg lg:left-lg">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-primary/20 text-primary border border-primary/50 px-3 py-1 rounded-full font-label-sm text-label-sm uppercase tracking-wider backdrop-blur-sm">
                Nổi bật
              </span>
              {featuredSelected && (
                <span className="bg-secondary/20 text-secondary border border-secondary/50 px-3 py-1 rounded-full font-label-sm text-label-sm backdrop-blur-sm flex items-center gap-1">
                  <MaterialIcon name="check_circle" className="text-[14px]" /> Đã chọn
                </span>
              )}
            </div>
            <h2 className="font-display-lg text-display-lg text-primary font-bold drop-shadow-lg">
              {featuredCharacter.name}
            </h2>
            <p className="font-title-md text-title-md text-on-surface-variant">{featuredCharacter.subtitle}</p>
          </div>
        </div>

        <div className="p-lg lg:p-xl flex flex-col justify-center bg-surface-container/90 relative z-10 border-l border-outline-variant lg:border-t-0 border-t">
          <div className="space-y-4">
            <div>
              <h3 className="font-label-sm text-label-sm text-secondary uppercase tracking-widest mb-1">
                Chỉ số đặc trưng
              </h3>
              <div className="space-y-3 mt-3">
                {featuredCharacter.stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="flex justify-between font-label-sm text-label-sm mb-1">
                      <span className="text-on-surface">{stat.label}</span>
                      <span className="text-primary">{stat.value}</span>
                    </div>
                    <div className="w-full bg-surface-variant rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-primary to-secondary h-1.5 rounded-full"
                        style={{ width: `${stat.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-4 line-clamp-3">
              {featuredCharacter.description}
            </p>
            <button
              type="button"
              onClick={() => onSelect?.(featuredCharacter.id)}
              className="w-full mt-6 bg-surface-variant border border-primary text-primary font-title-md text-title-md py-sm rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
            >
              <MaterialIcon name="swords" />
              {variant === 'onboarding' ? 'Chọn nhân vật này' : 'Bắt đầu cốt truyện'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-md overflow-x-auto pb-2 scrollbar-hide">
        <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">Thời kỳ:</span>
        {characterFilters.map((filter) => (
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
        {visibleCharacters.map((char) => {
          const isSelected = selectedId === char.id
          if (char.locked) {
            return (
              <div
                key={char.id}
                className="glass-panel rounded-xl overflow-hidden relative border border-outline-variant/50 opacity-80"
              >
                <div className="h-48 relative overflow-hidden grayscale">
                  <img alt={char.name} className="w-full h-full object-cover opacity-50" src={char.image} />
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="bg-surface-variant/80 p-3 rounded-full mb-2">
                      <MaterialIcon name="lock" className="text-on-surface-variant text-[24px]" />
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {char.unlockRequirement}
                    </span>
                  </div>
                </div>
                <div className="p-md bg-surface-container-high/50">
                  <h3 className="font-title-md text-title-md text-on-surface-variant font-bold">{char.name}</h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant/70">{char.dynasty}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant/70 text-sm line-clamp-2 mt-2">
                    {char.description}
                  </p>
                </div>
              </div>
            )
          }
          return (
            <button
              key={char.id}
              type="button"
              onClick={() => onSelect?.(char.id)}
              className={`glass-panel rounded-xl overflow-hidden group cursor-pointer border text-left transition-all duration-300 ${
                isSelected
                  ? 'border-secondary bloom-secondary'
                  : 'border-outline-variant hover:border-secondary hover:bloom-secondary'
              }`}
            >
              <div className="h-48 relative overflow-hidden">
                <img
                  alt={char.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
                  src={char.image}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high to-transparent" />
                <div className="absolute top-2 right-2 bg-secondary/20 text-secondary p-1 rounded-full backdrop-blur-sm">
                  <MaterialIcon name={isSelected ? 'check_circle' : 'lock_open'} className="text-[16px]" />
                </div>
              </div>
              <div className="p-md bg-surface-container-high">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-title-md text-title-md text-on-surface font-bold">{char.name}</h3>
                    <p className="font-label-sm text-label-sm text-secondary">{char.dynasty}</p>
                  </div>
                  {char.level != null && (
                    <span className="bg-surface-variant px-2 py-1 rounded text-xs text-on-surface-variant border border-outline-variant">
                      Lv. {char.level}
                    </span>
                  )}
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant text-sm line-clamp-2">
                  {char.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
