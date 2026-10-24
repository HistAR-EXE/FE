import { getData, getListData, httpClient } from '../../shared/api/httpClient'
import type {
  CreateFieldTripRequest,
  CreateTripGroupRequest,
  FieldTripLiveBoard,
  FieldTripReport,
  FieldTripResponse,
  JoinFieldTripRequest,
  TripGroupPreview,
  TripJoinPreview,
  UpdateFieldTripRequest,
} from './types'

export const fieldTripApi = {
  listMine: () => getListData<FieldTripResponse>(httpClient.get('/api/teacher/field-trips')),
  get: (tripId: string) => getData<FieldTripResponse>(httpClient.get(`/api/teacher/field-trips/${tripId}`)),
  create: (body: CreateFieldTripRequest) =>
    getData<FieldTripResponse>(httpClient.post('/api/teacher/field-trips', body)),
  update: (tripId: string, body: UpdateFieldTripRequest) =>
    getData<FieldTripResponse>(httpClient.put(`/api/teacher/field-trips/${tripId}`, body)),
  createGroup: (tripId: string, body: CreateTripGroupRequest) =>
    getData<TripGroupPreview>(httpClient.post(`/api/teacher/field-trips/${tripId}/groups`, body)),
  requestConfirmation: (tripId: string, rowVersion: number) =>
    getData<FieldTripResponse>(httpClient.post(`/api/teacher/field-trips/${tripId}/request-confirmation`, { rowVersion })),
  start: (tripId: string, rowVersion: number) =>
    getData<FieldTripResponse>(httpClient.post(`/api/teacher/field-trips/${tripId}/start`, { rowVersion })),
  cancel: (tripId: string, rowVersion: number) =>
    getData<FieldTripResponse>(httpClient.post(`/api/teacher/field-trips/${tripId}/cancel`, { rowVersion })),
  complete: (tripId: string, rowVersion: number) =>
    getData<FieldTripResponse>(httpClient.post(`/api/teacher/field-trips/${tripId}/complete`, { rowVersion })),
  liveBoard: (tripId: string) =>
    getData<FieldTripLiveBoard>(httpClient.get(`/api/teacher/field-trips/${tripId}/live-board`)),
  report: (tripId: string) =>
    getData<FieldTripReport>(httpClient.get(`/api/teacher/field-trips/${tripId}/report`)),
  preview: (code: string) =>
    getData<TripJoinPreview>(httpClient.get(`/api/field-trips/join/${encodeURIComponent(code)}`)),
  join: (body: JoinFieldTripRequest) =>
    getData<TripGroupPreview>(httpClient.post('/api/field-trips/join', body)),
}
