import { useTranslation } from 'react-i18next'
import { MaterialIcon } from '../ui/MaterialIcon'
import { nextAppLocale, setAppLocale } from '../../shared/i18n'
import { useTheme } from '../../shared/theme/ThemeProvider'

export function AppSettingsBar({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const { i18n, t } = useTranslation()
  const nextLocale = nextAppLocale(i18n.language)

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={toggleTheme}
        className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        title={theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
        aria-label={theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
      >
        <MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} className="text-lg" />
      </button>
      <button
        type="button"
        onClick={() => setAppLocale(nextLocale)}
        className="h-9 min-w-9 px-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
        title={nextLocale}
        aria-label={nextLocale}
      >
        {nextLocale === 'zh-CN' ? '中' : nextLocale.toUpperCase()}
      </button>
    </div>
  )
}
