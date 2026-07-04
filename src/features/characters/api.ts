import { getData, httpClient } from '../../shared/api/httpClient'

export type CharacterDetail = {
  id: string
  locationId: string
  name: string
  era: string
  portraitUrl: string
}

export const charactersApi = {
  getById: (characterId: string) =>
    getData<CharacterDetail>(httpClient.get(`/api/characters/${characterId}`)),
}
