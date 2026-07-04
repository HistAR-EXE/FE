import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { locationsApi, type Character, type Location } from '../features/locations/api'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'

export function CharacterExplorePage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [locationId, setLocationId] = useState('')
  const [characters, setCharacters] = useState<Character[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    locationsApi
      .list()
      .then((data) => {
        setLocations(data)
        if (data[0]) setLocationId(data[0].id)
      })
      .catch(() => showToast({ message: 'Không tải được danh sách địa điểm.', type: 'error' }))
  }, [showToast])

  useEffect(() => {
    if (!locationId) return
    locationsApi.getCharacters(locationId).then(setCharacters).catch(() => setCharacters([]))
  }, [locationId])

  return (
    <AppLayout activeBorder="right" topNav={<SimpleTopNav title="Nhân vật lịch sử" showSearch />}>
      <main className="mt-16 p-lg max-w-6xl mx-auto w-full">
        <div className="mb-md flex items-center gap-sm">
          <MaterialIcon name="filter_list" className="text-primary" />
          <label className="text-sm text-on-surface-variant">Địa điểm</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-full px-md py-xs"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {characters.map((c) => (
            <Link
              key={c.id}
              to={`/characters/${c.id}`}
              className="group block rounded-xl overflow-hidden border border-outline-variant hover:border-secondary transition-all bg-surface-container"
            >
              <div className="h-48 relative overflow-hidden">
                <img src={c.portraitUrl} alt={c.name} className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high to-transparent" />
              </div>
              <div className="p-md bg-surface-container-high">
                <h2 className="font-title-md">{c.name}</h2>
                <p className="text-sm text-secondary">{c.era}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </AppLayout>
  )
}

