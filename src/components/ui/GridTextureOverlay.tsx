/** Decorative grid — avoids /media/grid.svg (R2 rewrite) which is not deployed. */
export function GridTextureOverlay({
    className = 'opacity-10',
}: {
    className?: string;
}) {
    return (
        <div
            className={`absolute inset-0 pointer-events-none mix-blend-overlay bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[length:24px_24px] ${className}`}
            aria-hidden
        />
    );
}
