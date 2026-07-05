import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'

export function SettingsTeacherSection() {
  return (
    <section className="bg-surface-container border border-outline-variant rounded-xl p-lg">
      <h2 className="font-title-md mb-sm">Giáo viên</h2>
      <Link
        to="/teacher"
        className="inline-flex items-center gap-1 px-md py-sm border border-secondary text-secondary rounded-lg hover:bg-secondary/10"
      >
        <MaterialIcon name="school" className="text-sm" />
        Dashboard lớp (Giáo viên)
      </Link>
    </section>
  )
}
