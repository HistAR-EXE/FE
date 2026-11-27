export type ModelLayer = 'ALL' | 'SURFACE' | 'L1' | 'L2' | 'L3'
export type ModelView = { layer: ModelLayer; diagram: boolean; yaw: number; zoom: number; command: number }
export type ModelViewAction =
  | { type: 'LAYER'; layer: ModelLayer }
  | { type: 'DIAGRAM' }
  | { type: 'ROTATE'; direction: -1 | 1 }
  | { type: 'ZOOM'; direction: -1 | 1 }
  | { type: 'RESET' }

export const layerCaptions: Record<ModelLayer, { label: string; description: string }> = {
  ALL: { label: 'Toàn bộ', description: 'Các lớp trong sa bàn minh họa mối liên hệ giữa mặt đất và không gian ngầm. Đây là mô hình giảng dạy theo chủ đề, không phải bản khảo sát khảo cổ; vị trí phòng và độ sâu không được đo đạc.' },
  SURFACE: { label: 'Mặt đất', description: 'Mặt đất được biểu diễn để đọc mối liên hệ với các lớp ngầm trong mô hình chủ đề. Hình dạng và các điểm nối là quy ước giảng dạy, không xác định dấu tích khảo cổ thực địa.' },
  L1: { label: 'Lớp 1', description: 'Lớp 1 là lớp minh họa trên cùng dưới mặt đất. Các nét nối giúp đọc cấu trúc mô hình chủ đề; không khẳng định phòng cố định tại lớp này hoặc độ sâu đo đạc.' },
  L2: { label: 'Lớp 2', description: 'Lớp 2 là lớp minh họa giữa trong mô hình chủ đề. Việc phân lớp phục vụ so sánh cấu trúc, không phải phân bố phòng khảo cổ hay độ sâu đo đạc.' },
  L3: { label: 'Lớp 3', description: 'Lớp 3 là lớp minh họa dưới cùng trong mô hình chủ đề. Vị trí tương đối phục vụ giảng dạy, không xác nhận phòng cố định, tầng khảo cổ hoặc độ sâu đo đạc.' },
}

type ModelMedia = {
  id: 'L2D_STRUCTURE'
  title: string
  source: string
  limitations: string
  representations: {
    model3D: { available: true; kind: 'MODEL_3D'; source: string }
    schematic2D: { available: true; kind: 'SCHEMATIC_2D'; source: string }
  }
}

export const modelMedia: readonly [ModelMedia] = [{
  id: 'L2D_STRUCTURE',
  title: 'Sa bàn các lớp địa đạo',
  source: 'Hình học sa bàn L2-D được biên soạn trong ứng dụng; sơ đồ 2D được vẽ cho cùng nội dung giảng dạy.',
  limitations: 'Tái dựng theo chủ đề phục vụ giáo dục, không phải bản khảo sát khảo cổ. Không dùng để xác định phòng cố định theo lớp, vị trí thực địa hay độ sâu đo đạc. Hai cách xem cùng một mô hình, không phải hai giai đoạn lịch sử.',
  representations: {
    model3D: { available: true, kind: 'MODEL_3D', source: 'Hình học sa bàn L2-D trong cảnh.' },
    schematic2D: { available: true, kind: 'SCHEMATIC_2D', source: 'Sơ đồ SVG nguyên bản, giản lược các lớp của sa bàn.' },
  },
}]

export function initialModelView(): ModelView {
  return { layer: 'ALL', diagram: false, yaw: 0, zoom: 1, command: 0 }
}

export function updateModelView(view: ModelView, action: ModelViewAction): ModelView {
  if (!action || typeof action !== 'object') return view
  switch (action.type) {
    case 'LAYER':
      return Object.hasOwn(layerCaptions, action.layer) ? { ...view, layer: action.layer } : view
    case 'DIAGRAM': return { ...view, diagram: !view.diagram }
    case 'RESET': return { ...initialModelView(), command: view.command + 1 }
    case 'ROTATE': {
      if (action.direction !== -1 && action.direction !== 1) return view
      const yaw = view.yaw + action.direction * Math.PI / 12
      const circle = Math.PI * 2
      return { ...view, yaw: ((yaw + Math.PI) % circle + circle) % circle - Math.PI, command: view.command + 1 }
    }
    case 'ZOOM':
      if (action.direction !== -1 && action.direction !== 1) return view
      return { ...view, zoom: Math.max(.75, Math.min(1.5, Math.round((view.zoom + action.direction * .1) * 100) / 100)), command: view.command + 1 }
    default: return view
  }
}
