import { getData, httpClient } from '../../shared/api/httpClient'

export type Health = {
  status: string
  service?: string
}

export type Ready = {
  status: 'UP' | 'DOWN'
  database: 'UP' | 'DOWN'
}

export const demoApi = {
  health: () => getData<Health>(httpClient.get('/api/health')),
  ready: () => getData<Ready>(httpClient.get('/api/health/ready')),
  demoCheckin: (payload: { locationId: string }, demoSecret: string) =>
    getData<{ success: boolean }>(
      httpClient.post('/api/demo/checkin', payload, {
        headers: { 'X-Demo-Secret': demoSecret },
      }),
    ),
}

