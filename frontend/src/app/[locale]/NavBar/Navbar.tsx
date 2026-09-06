'use client'
import React, { useEffect, useState } from 'react'
import { usePathname } from "next/navigation";
import  Link  from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import axios from 'axios';
import { CalendarDays, ChartNoAxesColumn, Languages, LayoutDashboard, UserCog } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100').replace(/\/+$/, '');

const Navbar = () => {
  const pathname = usePathname();
  const isLoginRoute = pathname.endsWith('/login');
  const isDashboardRoute = pathname.endsWith('/dashboard');
  const isAdminRoute = /^\/(en|th)\/admin/.test(pathname);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 8 || currentScrollY < lastScrollY) {
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsNavVisible(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [hash, setHash] = useState('');
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [pathname]);

  useEffect(() => {
    if (isLoginRoute) {
      setIsAdmin(false);
      return;
    }
    let isActive = true;
    axios
      .get<{ user: { role: string } }>(`${API_BASE_URL}/auth/session`, { withCredentials: true })
      .then(({ data }) => {
        if (isActive) setIsAdmin(data.user.role === 'ADMIN');
      })
      .catch(() => {
        if (isActive) setIsAdmin(false);
      });
    return () => {
      isActive = false;
    };
  }, [isLoginRoute]);

  const locale = useLocale();
  const t = useTranslations('nav');
  const nextLocale = locale === 'en' ? 'th' : 'en';
  const localizedPath = pathname.replace(/^\/(en|th)(?=\/|$)/, `/${nextLocale}`);

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
      active
        ? 'bg-surface-active font-semibold text-accent-foreground'
        : 'font-medium text-text-nav hover:bg-surface-hover'
    }`;

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-xl transition-transform duration-300 ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href={`/${locale}${isLoginRoute ? '/login' : '/dashboard'}`} className="flex min-w-0 items-center gap-2.5" aria-label={t('home')}>
          <Image src="/images-removebg-preview (1) (1).png" alt="Prankrataipittayakom crest" width={40} height={40} className="size-10 object-contain" priority />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-bold text-text-primary">{t('school')}</div>
            <div className="text-[11px] text-text-muted">{t('product')}</div>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {!isLoginRoute && (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
              <Link href={`/${locale}/dashboard`} className={navLinkClass(isDashboardRoute && !hash)}>
                <LayoutDashboard className="size-4" /> {t('overview')}
              </Link>
              <Link href={`/${locale}/dashboard#schedule`} className={navLinkClass(isDashboardRoute && hash === '#schedule')}>
                <CalendarDays className="size-4" /> {t('schedule')}
              </Link>
              <Link href={`/${locale}/dashboard#reports`} className={navLinkClass(isDashboardRoute && hash === '#reports')}>
                <ChartNoAxesColumn className="size-4" /> {t('reports')}
              </Link>
              {isAdmin && (
                <Link href={`/${locale}/admin`} className={navLinkClass(isAdminRoute)}>
                  <UserCog className="size-4" /> {t('admin')}
                </Link>
              )}
            </nav>
          )}

          <Link
            href={localizedPath}
            replace
            scroll={false}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-bold text-text-secondary transition hover:border-border-strong hover:bg-surface-subtle"
            aria-label={t('language')}
            title={t('language')}
          >
            <Languages className="size-4 text-danger-accent" />
            {nextLocale.toUpperCase()}
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default Navbar
