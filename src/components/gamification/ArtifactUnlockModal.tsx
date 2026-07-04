import { MaterialIcon } from '../ui/MaterialIcon'
import type { UnlockedArtifact } from '../../features/gamification/engagementTypes'

type ArtifactUnlockModalProps = {
  artifacts: UnlockedArtifact[]
  onClose: () => void
}

export function ArtifactUnlockModal({ artifacts, onClose }: ArtifactUnlockModalProps) {
  const artifact = artifacts[0]
  if (!artifact) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-md bg-black/60"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-sm rounded-xl border border-primary/40 p-md pointer-events-auto text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <MaterialIcon name="auto_awesome" className="text-primary text-3xl mb-sm" />
        <h3 className="font-title-md text-primary">Mở khoá cổ vật mới!</h3>
        {artifact.imageUrl && (
          <img
            src={artifact.imageUrl}
            alt={artifact.name}
            className="w-full h-40 object-cover rounded-lg my-md"
          />
        )}
        <p className="font-title-sm text-on-surface">{artifact.name}</p>
        {artifacts.length > 1 && (
          <p className="text-xs text-on-surface-variant mt-xs">+{artifacts.length - 1} cổ vật khác</p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-md px-4 py-2 rounded-full bg-primary text-on-primary font-title-sm"
        >
          Tuyệt vời!
        </button>
      </div>
    </div>
  )
}
