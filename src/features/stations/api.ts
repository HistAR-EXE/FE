// src/features/stations/api.ts
// Thông tin công khai của một trạm (tên + khối nội dung giới thiệu).

import { getData, httpClient } from '../../shared/api/httpClient'

export type StationBlock = {
    id: string
    blockType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | string
    title: string | null
    body: string | null
    mediaUrl: string | null
    sortOrder: number
}

export type StationInfo = {
    id: string
    siteCode: string
    code: string
    name: string
    sortOrder: number
    blocks: StationBlock[]
}

export const stationsApi = {
    get: (siteCode: string, code: string) =>
        getData<StationInfo>(httpClient.get(`/api/sites/${encodeURIComponent(siteCode)}/stations/${encodeURIComponent(code)}`)),
}
