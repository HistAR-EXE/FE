import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'

type Props = { to: string; label: string; ariaLabel?: string }

/** Explicit parent destination also works when a quest URL is opened directly. */
export function QuestBackLink({ to, label, ariaLabel = 'Điều hướng nhiệm vụ' }: Props) {
    return <nav aria-label={ariaLabel} className="py-3 md:py-4">
        <Link to={to} className="group inline-flex min-h-11 max-w-full items-center gap-3 rounded-2xl border border-[#0275FB]/20 bg-white px-4 py-2.5 text-sm font-extrabold text-[#075BBF] shadow-sm transition-colors hover:border-[#FDC908] hover:bg-[#FFF8D8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0275FB]">
            <MaterialIcon name="arrow_back" className="shrink-0 text-xl" />
            <span>{label}</span>
        </Link>
    </nav>
}
