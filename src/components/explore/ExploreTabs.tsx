import { NavLink } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'

const tabs = [
  { to: '/explore', label: 'Di tích', icon: 'location_on' },
  { to: '/characters', label: 'Nhân vật', icon: 'groups' },
] as const

export function ExploreTabs() {
  return (
    <div className="flex items-center gap-sm">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-full font-title-md text-title-md transition-all ${
              isActive
                ? 'bg-secondary/10 border border-secondary text-secondary shadow-[0_0_10px_rgba(68,219,213,0.15)]'
                : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <MaterialIcon name={tab.icon} className="text-[18px]" />
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}
