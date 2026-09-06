"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Activity, CalendarDays, FlaskConical, GraduationCap, LayoutDashboard, Nfc, Settings, Users } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  isActive: (pathname: string) => boolean
}

const AdminNav = ({ variant, username }: { variant: 'sidebar' | 'mobile'; username?: string }) => {
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('admin')

  const items: NavItem[] = [
    {
      href: `/${locale}/admin`,
      label: t('nav.overview'),
      icon: <LayoutDashboard className="size-4" />,
      isActive: (path) => path === `/${locale}/admin`,
    },
    {
      href: `/${locale}/admin/accounts`,
      label: t('accounts'),
      icon: <Users className="size-4" />,
      isActive: (path) => path.startsWith(`/${locale}/admin/accounts`),
    },
    {
      href: `/${locale}/admin/students`,
      label: t('students'),
      icon: <GraduationCap className="size-4" />,
      isActive: (path) => path.startsWith(`/${locale}/admin/students`),
    },
    {
      href: `/${locale}/admin/activity`,
      label: t('logs'),
      icon: <Activity className="size-4" />,
      isActive: (path) => path.startsWith(`/${locale}/admin/activity`),
    },
    {
      href: `/${locale}/admin/reader`,
      label: 'Reader',
      icon: <Nfc className="size-4" />,
      isActive: (path) => path.startsWith(`/${locale}/admin/reader`),
    },
    {
      href: `/${locale}/admin/test`,
      label: 'API Test',
      icon: <FlaskConical className="size-4" />,
      isActive: (path) => path.startsWith(`/${locale}/admin/test`),
    },
    {
      href: `/${locale}/admin/settings`,
      label: 'Settings',
      icon: <Settings className="size-4" />,
      isActive: (path) => path.startsWith(`/${locale}/admin/settings`),
    },
  ]

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
      active
        ? 'bg-[#e7f0eb] font-bold text-[#356b5c]'
        : 'font-medium text-[#68756d] hover:bg-[#edf2ee] hover:text-[#356b5c]'
    }`

  if (variant === 'mobile') {
    return (
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-[#dce5de] bg-white/85 p-1" aria-label={t('nav.overview')}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold sm:text-sm ${item.isActive(pathname) ? 'bg-[#3f7565] text-white' : 'text-[#69766e] hover:bg-[#edf3ef]'}`}>
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <div className="flex min-h-full flex-col">
      <nav className="flex flex-col gap-1 px-3" aria-label={t('navSection')}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={`${linkClass(item.isActive(pathname))} ${item.href.endsWith('/activity') ? 'mb-2' : ''}`} aria-current={item.isActive(pathname) ? 'page' : undefined}>
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export const AdminSidebar = ({ username }: { username?: string }) => (
  <aside className="hidden w-60 shrink-0 border-r border-[#dce5de] bg-white/50 lg:block">
    <div className="sticky top-16 flex min-h-[calc(100vh-4rem)] flex-col pt-5">
      <AdminNav variant="sidebar" username={username} />
    </div>
  </aside>
)

export const AdminMobileNav = () => <div className="lg:hidden"><AdminNav variant="mobile" /></div>
