import { useEffect, useState } from 'react'
import { gamificationApi, type Quest } from '../gamification/api'
import { getData, httpClient } from '../../shared/api/httpClient'

type Campaign = { id: string; questId: string; title: string }

export function TeacherQuestFields({ questId, campaignId, onQuestChange, onCampaignChange, campaignRequired = false }: {
  questId: string
  campaignId: string
  onQuestChange: (value: string) => void
  onCampaignChange: (value: string) => void
  campaignRequired?: boolean
}) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [campaignError, setCampaignError] = useState('')
  useEffect(() => {
    let active = true
    Promise.allSettled([gamificationApi.quests(), getData<Campaign[]>(httpClient.get('/api/quest-campaigns/active'))])
      .then(([nextQuests, nextCampaigns]) => {
        if (!active) return
        if (nextQuests.status === 'fulfilled') setQuests(nextQuests.value)
        else setError('Chưa tải được danh mục nhiệm vụ. Kiểm tra kết nối hoặc liên hệ quản lý nội dung.')
        if (nextCampaigns.status === 'fulfilled') setCampaigns(nextCampaigns.value)
        else setCampaignError('Chưa tải được chiến dịch đang hoạt động. Bài tập thông thường vẫn có thể giao mà không chọn chiến dịch.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const matching = campaigns.filter(item => item.questId === questId)
  return <div className="tw-form-grid">
    <label>Nhiệm vụ<select aria-label="Nhiệm vụ" required disabled={loading || Boolean(error)} value={questId} onChange={event => { onQuestChange(event.target.value); onCampaignChange('') }}><option value="">{loading ? 'Đang tải nhiệm vụ…' : 'Chọn nhiệm vụ có sẵn'}</option>{quests.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    <label>Chiến dịch{!campaignRequired && ' (tùy chọn)'}<select aria-label="Chiến dịch" required={campaignRequired} disabled={!questId || loading || Boolean(error)} value={campaignId} onChange={event => onCampaignChange(event.target.value)}><option value="">{matching.length ? 'Chọn chiến dịch' : 'Chưa có chiến dịch phù hợp'}</option>{matching.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    {error && <p className="tw-note error" role="alert">{error}</p>}
    {campaignError && <p className="tw-note warning" role="status">{campaignRequired ? 'Chưa tải được chiến dịch; cần chiến dịch đang hoạt động để lưu mục này. Liên hệ quản lý nội dung.' : campaignError}</p>}
  </div>
}
