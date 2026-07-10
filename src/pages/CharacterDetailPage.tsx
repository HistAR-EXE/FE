import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { charactersApi, type CharacterDetail } from '../features/characters/api'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { buildChatPath } from '../features/chat/chatRoute'

export function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>()
  const [character, setCharacter] = useState<CharacterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    if (!characterId) return
    charactersApi
      .getById(characterId)
      .then(setCharacter)
      .catch((e) => {
        setCharacter(null)
        showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
      })
      .finally(() => setLoading(false))
  }, [characterId, showToast])

  const chatHref = character
    ? buildChatPath({ locationId: character.locationId, characterId: character.id })
    : '/characters'

  return (
    <AppLayout activeBorder="right" topNav={<SimpleTopNav title="Nhân vật" />}>
      <main className="mt-16 p-lg max-w-lg mx-auto w-full pb-20">
        <Link to="/characters" className="text-sm text-secondary inline-flex items-center gap-1 mb-md">
          <MaterialIcon name="arrow_back" className="text-sm" /> Danh sách nhân vật
        </Link>

        {loading && <p className="text-on-surface-variant text-sm">Đang tải...</p>}

        {!loading && !character && (
          <p className="text-on-surface-variant">Không tìm thấy nhân vật.</p>
        )}

        {character && (
          <article className="rounded-xl overflow-hidden border border-outline-variant bg-surface-container">
            <div className="aspect-[4/5] relative">
              <img
                src={character.portraitUrl}
                alt={character.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent" />
            </div>
            <div className="p-lg space-y-sm">
              <p className="text-xs uppercase tracking-wide text-secondary">{character.era}</p>
              <h1 className="font-display-lg text-on-surface">{character.name}</h1>
              <p className="text-sm text-on-surface-variant">
                Trò chuyện với nhân vật lịch sử để khám phá câu chuyện tại di tích qua góc nhìn của người trong cuộc.
              </p>
              <Link
                to={chatHref}
                className="inline-flex items-center justify-center gap-2 w-full mt-md py-md rounded-xl bg-primary text-on-primary font-title-md"
              >
                <MaterialIcon name="chat" />
                Trò chuyện
              </Link>
              <Link
                to={`/explore/${character.locationId}`}
                className="inline-flex items-center justify-center gap-1 w-full py-sm text-secondary text-sm"
              >
                Xem di tích <MaterialIcon name="open_in_new" className="text-sm" />
              </Link>
            </div>
          </article>
        )}
      </main>
    </AppLayout>
  )
}
