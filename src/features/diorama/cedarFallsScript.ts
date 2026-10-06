export type BattleEvent = {
    day: number; // Mốc thời gian (Ngày 1 đến Ngày 19)
    type: 'troop_movement' | 'bombing' | 'hotspot';
    elementId: string; // ID của xe tăng/máy bay để liên kết ảnh
    startPos: { x: number; y: number }; // Tọa độ % bắt đầu
    endPos?: { x: number; y: number };  // Tọa độ % kết thúc (nếu có di chuyển)
    title?: string;
    description?: string;
    audioKey?: string; // Tên file âm thanh kích hoạt
}

export const CEDAR_FALLS_SCRIPT: BattleEvent[] = [
    {
        day: 1,
        type: 'troop_movement',
        elementId: 'tank_division_1',
        startPos: { x: 10, y: 80 },
        endPos: { x: 40, y: 50 },
        title: 'Mũi kìm thứ nhất',
        description: 'Bộ binh cơ giới bắt đầu tiến vào vùng Tam Giác Sắt.'
    },
    {
        day: 8,
        type: 'bombing',
        elementId: 'b52_strike',
        startPos: { x: 50, y: 30 },
        title: 'Không kích B52',
        description: 'Rải thảm bom hòng phá hủy cấu trúc địa đạo mặt nông.',
        audioKey: 'explosion_heavy'
    }
];