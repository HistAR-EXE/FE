import { Link } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'

type DetailHeaderProps = {
  backTo?: string
  backLabel?: string
}

export function DetailHeader({ backTo = '/explore', backLabel = 'Quay lại Khám phá' }: DetailHeaderProps) {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 hidden md:flex justify-between items-center h-16 px-xl">
      <Link
        to={backTo}
        className="flex items-center gap-sm text-on-surface-variant hover:text-secondary transition-colors font-title-md text-title-md"
      >
        <MaterialIcon name="arrow_back" />
        {backLabel}
      </Link>
      <div className="flex items-center gap-sm">
        <button type="button" className="p-2 text-on-surface-variant hover:text-secondary rounded-full hover:bg-surface-variant/50">
          <MaterialIcon name="bookmark" />
        </button>
        <Link to="/share" className="p-2 text-on-surface-variant hover:text-secondary rounded-full hover:bg-surface-variant/50">
          <MaterialIcon name="share" />
        </Link>
      </div>
    </header>
  )
}
