type FooterProps = {
  variant?: 'default' | 'login'
}

export function Footer({ variant = 'default' }: FooterProps) {
  if (variant === 'login') {
    return (
      <footer className="w-full py-md mt-auto bg-surface-container-lowest border-t border-outline-variant/20 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-safe-area-inset md:px-xl py-lg w-full max-w-[1440px] mx-auto">
          <div className="font-title-md text-title-md text-on-surface mb-sm md:mb-0">
            TimeLens
          </div>
          <div className="font-label-sm text-label-sm text-secondary mb-sm md:mb-0">
            © 2024 TimeLens - Hành Trình Di Sản Số. All rights reserved.
          </div>
          <div className="flex gap-md">
            <a
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-opacity"
              href="#"
            >
              Điều khoản
            </a>
            <a
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-opacity"
              href="#"
            >
              Bảo mật
            </a>
            <a
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-opacity"
              href="#"
            >
              Liên hệ
            </a>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-surface-container-lowest w-full py-md mt-auto border-t border-outline-variant/20 relative z-20">
      <div className="flex flex-col md:flex-row justify-between items-center px-xl py-lg w-full max-w-[1440px] mx-auto">
        <div className="font-title-md text-title-md text-on-surface mb-md md:mb-0">
          TimeLens
        </div>
        <div className="font-label-sm text-label-sm text-on-surface-variant text-center md:text-left mb-md md:mb-0">
          © 2024 TimeLens - Hành Trình Di Sản Số. All rights reserved.
        </div>
        <div className="flex gap-md font-label-sm text-label-sm text-on-surface-variant">
          <a className="hover:text-primary transition-opacity" href="#">
            Điều khoản
          </a>
          <a className="hover:text-primary transition-opacity" href="#">
            Bảo mật
          </a>
          <a className="hover:text-primary transition-opacity" href="#">
            Liên hệ
          </a>
        </div>
      </div>
    </footer>
  )
}
