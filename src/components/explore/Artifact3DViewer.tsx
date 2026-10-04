// src/components/explore/Artifact3DViewer.tsx
import { useState } from 'react';
import { MaterialIcon } from '../ui/MaterialIcon';

interface Artifact3DViewerProps {
    sketchfabId: string;
    title: string;
}

export function Artifact3DViewer({ sketchfabId, title }: Artifact3DViewerProps) {
    const [isLoading, setIsLoading] = useState(true);

    // Xây dựng URL nhúng Sketchfab với các thông số tối ưu UI/UX
    const embedUrl = `https://sketchfab.com/models/${sketchfabId}/embed?autostart=1&preload=1&transparent=1&ui_theme=dark&ui_watermark=0&ui_infos=0&ui_inspector=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_animations=0`;

    return (
        <div className="relative w-full h-full bg-[#111] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">

            {/* Hiệu ứng Ánh sáng Spotlight hắt từ trên xuống */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.1)_0%,transparent_70%)] pointer-events-none z-10" />

            {/* Màn hình chờ (Loading) */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111] z-20">
                    <MaterialIcon name="3d_rotation" className="text-4xl text-[#FDC908] animate-spin mb-4" />
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                        Đang tái tạo mô hình 3D...
                    </span>
                </div>
            )}

            {/* Iframe Nhúng từ Sketchfab */}
            <iframe
                title={title}
                src={embedUrl}
                onLoad={() => setIsLoading(false)}
                className="absolute inset-0 w-full h-full z-0 border-none"
                allowFullScreen
                allow="autoplay; fullscreen; xr-spatial-tracking; web-share"
            />

            {/* Chú thích Hướng dẫn tương tác (Chỉ hiện khi hover) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30">
                <span className="text-xs text-gray-300 font-semibold flex items-center gap-2 tracking-wide">
                    <MaterialIcon name="touch_app" className="text-sm text-[#FDC908]" />
                    Kéo để xoay • Cuộn để thu phóng
                </span>
            </div>
        </div>
    );
}