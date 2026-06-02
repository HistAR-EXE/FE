import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { locationsApi, type Character } from '../features/locations/api'
import { ApiError } from '../shared/api/contracts'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'

export function CharacterSelectPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const locationId = params.get('locationId') ?? ''
  const [resolvedLocationId, setResolvedLocationId] = useState(locationId)
  const [characters, setCharacters] = useState<Character[]>([])
  const [selected, setSelected] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    const run = async () => {
      try {
        if (!locationId) {
          const locations = await locationsApi.list()
          setResolvedLocationId(locations[0]?.id ?? '')
          return
        }
        setResolvedLocationId(locationId)
      } catch {
        setResolvedLocationId('')
      }
    }
    run()
  }, [locationId])

  useEffect(() => {
    if (!resolvedLocationId) return
    locationsApi
      .getCharacters(resolvedLocationId)
      .then((data) => {
        setCharacters(data)
        if (data[0]) setSelected(data[0].id)
      })
      .catch((e) => {
        showToast({
          message: e instanceof ApiError ? e.message : 'Không tải được danh sách nhân vật.',
          type: 'error',
        })
      })
  }, [resolvedLocationId, showToast])

  const selectedCharacter = useMemo(() => characters.find((item) => item.id === selected), [characters, selected])

  const handleConfirm = () => {
    if (selected) {
      localStorage.setItem('timelens_selected_character', selected)
      navigate(`/chat/nguyen-du?locationId=${resolvedLocationId}&characterId=${selected}`)
      return
    }
    navigate('/explore')
  }

  return (
    <AppLayout activeBorder="right" topNav={<SimpleTopNav title="Chọn nhân vật" showSearch />}>
      <main className="p-safe-area-inset min-h-screen relative">
        <div className="relative z-10 max-w-7xl mx-auto space-y-xl pt-lg">
          <div className="flex justify-between items-end border-b border-outline-variant pb-md">
            <div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold">Chọn nhân vật</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">Kết nối với các linh hồn vĩ đại của lịch sử Việt Nam.</p>
            </div>
          </div>

          {selectedCharacter && (
            <div className="rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-0 shadow-[0_0_20px_rgba(242,191,80,0.2)] border border-outline-variant bg-surface-container">
              <div className="lg:col-span-2 relative h-64 lg:h-auto">
                <img src={selectedCharacter.portraitUrl} alt={selectedCharacter.name} className="absolute inset-0 w-full h-full object-cover object-top opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
                <div className="absolute bottom-md left-md">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-primary/20 text-primary border border-primary/50 px-3 py-1 rounded-full text-xs uppercase tracking-wider">Nổi bật</span>
                    <span className="bg-secondary/20 text-secondary border border-secondary/50 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                      <MaterialIcon name="check_circle" className="text-[14px]" /> Đã chọn
                    </span>
                  </div>
                  <h2 className="font-display-lg text-display-lg text-primary font-bold">{selectedCharacter.name}</h2>
                  <p className="font-title-md text-title-md text-on-surface-variant">{selectedCharacter.era}</p>
                </div>
              </div>
              <div className="p-lg bg-surface-container-high flex items-end">
                <button onClick={handleConfirm} className="w-full bg-primary text-on-primary font-title-md py-sm rounded-lg hover:bg-primary-container transition-colors">
                  Bắt đầu cốt truyện
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg pb-xl">
            {characters.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
                className={`text-left rounded-xl overflow-hidden border transition-all duration-300 ${
                  selected === c.id
                    ? 'border-secondary shadow-[0_0_20px_rgba(68,219,213,0.2)]'
                    : 'border-outline-variant hover:border-secondary'
                } bg-surface-container`}
              >
                <div className="h-48 relative overflow-hidden">
                  <img src={c.portraitUrl} alt={c.name} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high to-transparent" />
                </div>
                <div className="p-md bg-surface-container-high">
                  <h3 className="font-title-md text-title-md text-on-surface font-bold">{c.name}</h3>
                  <p className="font-label-sm text-label-sm text-secondary">{c.era}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </AppLayout>
  )
}

