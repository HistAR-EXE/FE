// P2 · Bước lên máy (data) (FINAL Baseline 8.1/8.2): the player chooses the era and the reference site on the Chrono Vessel's
// time axis, Kha states the limits of the reconstruction, then the machine is activated by a direct action (palm on the
// console in the world, or this button as the accessible equivalent). Other eras stay visible but locked: the project
// mentions 1948/1968/1975/2026 but their content and mapping are not verified (Baseline §3.5), so nothing is claimed.
export type P2Stage = 'ERA' | 'SITE' | 'CONFIRM'
export type P2State = { stage: P2Stage; era: string | null; site: string | null }
export const P2_ERAS = [
 { id: '1967-01', label: '01/1967 · Củ Chi', open: true, note: 'Đầu năm 1967, vùng Củ Chi. Không gian tái dựng có kiểm soát dựa trên tư liệu.' },
 { id: '1948', label: '1948', open: false, note: 'Đang khóa · nội dung chưa được đối chiếu' },
 { id: '1968', label: '1968', open: false, note: 'Đang khóa · nội dung chưa được đối chiếu' },
 { id: '1975', label: '1975', open: false, note: 'Đang khóa · nội dung chưa được đối chiếu' },
] as const
export const P2_SITES = [
 { id: 'ben-duoc', label: 'Bến Dược · site tham chiếu tái dựng', open: true, note: 'Bến Dược được dùng làm site tham chiếu để tái dựng. Đây không phải nơi diễn ra mọi sự kiện của chiến dịch Cedar Falls.' },
 { id: 'other', label: 'Địa điểm khác', open: false, note: 'Đang khóa' },
] as const
export const initialP2 = (): P2State => ({ stage: 'ERA', era: null, site: null })

