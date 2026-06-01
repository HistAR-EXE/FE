import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CharacterRoster } from '../components/explore/CharacterRoster'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { featuredCharacter } from '../data/mock/characters'

export function CharacterSelectPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string>(featuredCharacter.id)

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      <div className="dong-son-bg fixed inset-0 pointer-events-none" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url('${images.characterHero}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/70" />

      <main className="relative z-10 flex flex-col min-h-screen w-full px-xl py-xl max-w-6xl mx-auto">
        <div className="text-center mb-xl">
          <h1 className="font-display-lg text-display-lg text-primary bloom-glow">Chọn nhân vật đồng hành</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto mt-sm">
            Mỗi nhân vật có phong cách khám phá riêng. Bạn có thể thay đổi sau trong hồ sơ.
          </p>
        </div>

        <CharacterRoster variant="onboarding" selectedId={selected} onSelect={setSelected} />

        <div className="sticky bottom-0 pt-md pb-lg flex justify-center bg-gradient-to-t from-background to-transparent">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="px-xl py-sm bg-primary text-on-primary font-title-md text-title-md rounded-full shadow-[0_0_15px_rgba(242,191,80,0.3)] hover:shadow-[0_0_25px_rgba(242,191,80,0.5)] transition-all transform hover:-translate-y-1 flex items-center gap-2"
          >
            Bắt đầu hành trình
            <MaterialIcon name="arrow_forward" />
          </button>
        </div>
      </main>
    </div>
  )
}
