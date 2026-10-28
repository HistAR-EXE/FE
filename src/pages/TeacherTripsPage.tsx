// src/pages/TeacherTripsPage.tsx
import { useTeacherWorkspace } from '../features/org/teacher-workspace-context'
import { TeacherQuestFields } from '../features/org/TeacherQuestFields'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { fieldTripApi } from '../features/field-trips/api'
import {
    FIELD_TRIP_STATUS_LABEL,
    toIsoFromLocal,
    type FieldTripResponse,
} from '../features/field-trips/types'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

export function TeacherTripsPage() {
    const { showToast } = useToast()
    const { memberships, orgId, setOrgId } = useTeacherWorkspace()
    const [trips, setTrips] = useState<FieldTripResponse[]>([])

    const [siteCode, setSiteCode] = useState('')
    const [title, setTitle] = useState('')
    const [visitStart, setVisitStart] = useState('')
    const [visitEnd, setVisitEnd] = useState('')
    const [questId, setQuestId] = useState('')
    const [campaignId, setCampaignId] = useState('')
    const [saving, setSaving] = useState(false)

    const reload = () => {
        fieldTripApi
            .listMine()
            .then(setTrips)
            .catch((error) => {
                setTrips([])
                showToast({
                    message: getFriendlyErrorMessage(error, 'quest'),
                    type: 'error',
                })
            })
    }

    useEffect(() => {
        reload()
    }, [showToast])

    const onCreate = async (event: FormEvent) => {
        event.preventDefault()
        if (
            !orgId ||
            !siteCode.trim() ||
            !title.trim() ||
            !visitStart ||
            !visitEnd ||
            !questId.trim() ||
            !campaignId.trim()
        )
            return
        try {
            setSaving(true)
            await fieldTripApi.create({
                orgId,
                siteCode: siteCode.trim(),
                title: title.trim(),
                visitStart: toIsoFromLocal(visitStart),
                visitEnd: toIsoFromLocal(visitEnd),
                questId: questId.trim(),
                campaignId: campaignId.trim(),
            })
            setTitle('')
            setQuestId('')
            setCampaignId('')
            reload()
            showToast({ message: 'Đã tạo chuyến tham quan', type: 'success' })
        } catch (error) {
            showToast({
                message: getFriendlyErrorMessage(error, 'quest'),
                type: 'error',
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <main>
            {/* HEADER CHUYẾN THAM QUAN */}
            <div className="tw-page-head">
                <div>
                    <span className="tw-eyebrow">HỌC TẬP TRẢI NGHIỆM THỰC ĐỊA</span>
                    <h1>Chuyến tham quan</h1>
                    <p>
                        Chọn di tích, khung giờ và nhiệm vụ phù hợp. Chuẩn bị nhóm học sinh
                        trước khi bắt đầu chuyến.
                    </p>
                </div>
            </div>

            <div className="tw-columns">
                {/* CỘT TRÁI: BIỂU MẪU TẠO CHUYẾN ĐI */}
                <form onSubmit={(event) => void onCreate(event)} className="tw-card tw-form">
                    <div>
                        <span className="tw-eyebrow">01 / LÊN KẾ HOẠCH NGOẠI KHÓA</span>
                        <h2>Tạo chuyến đi</h2>
                    </div>

                    <label>
                        Tổ chức
                        <select
                            className="tw-input"
                            value={orgId}
                            onChange={(event) => setOrgId(event.target.value)}
                            required
                        >
                            {memberships.length === 0 && (
                                <option value="">Chưa có tổ chức</option>
                            )}
                            {memberships.map((item) => (
                                <option key={item.organizationId} value={item.organizationId}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Mã di tích
                        <input
                            className="tw-input"
                            value={siteCode}
                            onChange={(event) => setSiteCode(event.target.value)}
                            placeholder="cu-chi"
                            required
                        />
                    </label>

                    <label>
                        Tiêu đề
                        <input
                            className="tw-input"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Hành trình Địa đạo Củ Chi — Khối 11"
                            required
                        />
                    </label>

                    <div className="tw-form-grid">
                        <label>
                            Giờ đến
                            <input
                                className="tw-input"
                                type="datetime-local"
                                value={visitStart}
                                onChange={(event) => setVisitStart(event.target.value)}
                                required
                            />
                        </label>
                        <label>
                            Giờ về
                            <input
                                className="tw-input"
                                type="datetime-local"
                                value={visitEnd}
                                onChange={(event) => setVisitEnd(event.target.value)}
                                required
                            />
                        </label>
                    </div>

                    <TeacherQuestFields
                        questId={questId}
                        campaignId={campaignId}
                        onQuestChange={setQuestId}
                        onCampaignChange={setCampaignId}
                        campaignRequired
                    />

                    <button
                        type="submit"
                        className="tw-button"
                        disabled={saving || memberships.length === 0}
                    >
                        Tạo chuyến
                    </button>
                </form>

                {/* CỘT PHẢI: DANH SÁCH CHUYẾN CỦA TÔI */}
                <section className="tw-card">
                    <span className="tw-eyebrow">02 / DANH SÁCH HÀNH TRÌNH</span>
                    <h2>
                        Chuyến của tôi{' '}
                        <span className="tw-plan-badge">{trips.length}</span>
                    </h2>
                    <p>
                        Nhấn vào tên chuyến tham quan để quản lý danh sách học sinh, phân
                        nhóm và mở bảng điều hành thực địa.
                    </p>

                    {trips.length === 0 ? (
                        <div className="tw-note">Chưa có chuyến tham quan.</div>
                    ) : (
                        <ul className="tw-invites">
                            {trips.map((trip) => (
                                <li key={trip.id}>
                                    <div>
                                        <Link
                                            to={`/teacher/trips/${trip.id}`}
                                            className="text-base font-black text-[#0275FB] hover:underline"
                                        >
                                            {trip.title}
                                        </Link>
                                        <small>
                                            {trip.siteCode} · {FIELD_TRIP_STATUS_LABEL[trip.status]}
                                        </small>
                                    </div>
                                    <span className="font-mono">{trip.joinCode}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    )
}