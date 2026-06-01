import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { ExploreTabs } from '../components/explore/ExploreTabs'
import { CharacterRoster } from '../components/explore/CharacterRoster'
import { featuredCharacter } from '../data/mock/characters'

export function CharacterExplorePage() {
  const [selected, setSelected] = useState<string>(featuredCharacter.id)

  return (
    <AppLayout activeBorder="right" topNav={<SimpleTopNav showSearch />}>
      <main className="mt-16 flex-1 p-lg max-w-7xl mx-auto w-full">
        <div className="relative z-10 space-y-xl">
          <div className="flex flex-col gap-md border-b border-outline-variant pb-md">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-md">
              <div>
                <h1 className="font-display-lg text-display-lg text-on-surface font-bold">Chọn nhân vật</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
                  Kết nối với các linh hồn vĩ đại của lịch sử Việt Nam.
                </p>
              </div>
              <ExploreTabs />
            </div>
          </div>

          <CharacterRoster variant="explore" selectedId={selected} onSelect={setSelected} />
        </div>
      </main>
    </AppLayout>
  )
}
