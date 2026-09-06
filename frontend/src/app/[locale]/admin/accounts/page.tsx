"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, Check, Search, Trash2, UserPlus, UserMinus, Users } from 'lucide-react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, ErrorState, PageHeader, RoleBadge } from '../components/AdminShell'
import { changeAccountRole, deleteAccountApi, fetchAccounts, getApiErrorMessage, type Account, type SessionUser } from '../lib/api'
import { fetchSession } from '../lib/api'

const AccountsPage = () => {
  const locale = useLocale()
  const t = useTranslations('admin')
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<{ type: 'delete' | 'demote'; account: Account } | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    if (!feedback) return
    const timeout = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timeout)
  }, [feedback])

  const sessionQuery = useQuery({ queryKey: ['admin', 'session'], queryFn: fetchSession, staleTime: 5 * 60_000 })
  const me = sessionQuery.data as SessionUser | undefined
  const accountsQuery = useQuery({ queryKey: ['admin', 'accounts', search], queryFn: () => fetchAccounts(search) })

  const invalidateAccounts = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
  }

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: 'USER' | 'ADMIN' }) => changeAccountRole(id, role),
    onSuccess: (_account, { id }) => {
      const target = accountsQuery.data?.find((account) => account.id === id)
      setConfirm(null)
      setFeedback({ kind: 'success', message: t('roleUpdated', { username: target?.username ?? '' }) })
      invalidateAccounts()
    },
    onError: (error) => {
      setConfirm(null)
      setFeedback({ kind: 'error', message: getApiErrorMessage(error) ?? t('loadError') })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAccountApi(id),
    onSuccess: (_result, id) => {
      const target = accountsQuery.data?.find((account) => account.id === id)
      setConfirm(null)
      setFeedback({ kind: 'success', message: t('accountDeleted', { username: target?.username ?? '' }) })
      invalidateAccounts()
    },
    onError: (error) => {
      setConfirm(null)
      setFeedback({ kind: 'error', message: getApiErrorMessage(error) ?? t('loadError') })
    },
  })

  const toggleRole = (account: Account) => {
    if (account.role === 'ADMIN') {
      setConfirm({ type: 'demote', account })
      return
    }
    roleMutation.mutate({ id: account.id, role: 'ADMIN' })
  }

  const accounts = accountsQuery.data ?? []

  return (
    <>
      <PageHeader
        eyebrow={t('accountManagement')}
        title={t('accounts')}
        description={t('accountsDescription')}
      />

      {feedback && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
            feedback.kind === 'error' ? 'border-[#e8bcb6] bg-[#fff8f6] text-[#99483f]' : 'border-[#b9d4c6] bg-[#eef7f2] text-[#356b5c]'
          }`}
          role="status"
        >
          {feedback.kind === 'error' ? <AlertCircle className="size-4 shrink-0" /> : <Check className="size-4 shrink-0" />}
          {feedback.message}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aa89f]" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('searchAccounts')}
            aria-label={t('searchAccounts')}
            className="w-full rounded-lg border border-[#dce5de] bg-white/85 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#3f7565]"
          />
        </div>
        <p className="text-sm text-[#748078]">{t('accountCount', { count: accounts.length })}</p>
      </div>

      {accountsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton h-16 rounded-lg" />)}
        </div>
      ) : accountsQuery.isError ? (
        <ErrorState message="" onRetry={() => void accountsQuery.refetch()} />
      ) : accounts.length === 0 ? (
        <EmptyState message={search ? t('noAccountsFound') : t('noAccounts')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#dce5de] bg-white/85">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8eee9] text-xs uppercase text-[#9aa89f]">
                <th scope="col" className="px-4 py-3 font-bold">{t('account')}</th>
                <th scope="col" className="px-4 py-3 font-bold">{t('role')}</th>
                <th scope="col" className="px-4 py-3 font-bold">{t('scheduleCoverage')}</th>
                <th scope="col" className="px-4 py-3 font-bold">{t('memberSinceLabel')}</th>
                <th scope="col" className="px-4 py-3 text-right font-bold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const isSelf = me?.id === account.id
                const isLastAdmin = account.role === 'ADMIN' && accounts.filter((item) => item.role === 'ADMIN').length <= 1
                const actionsDisabled = isSelf || isLastAdmin
                return (
                  <tr key={account.id} className="border-b border-[#e8eee9] last:border-0 hover:bg-[#f5f9f6]">
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/admin/accounts/${account.id}`} className="flex items-center gap-3 font-bold text-[#26332e] hover:text-[#356b5c]">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#deece4] text-[#356b5c]">
                          <Users className="size-4" />
                        </span>
                        <span className="flex items-center gap-2">
                          {account.username}
                          {isSelf && <span className="rounded bg-[#eef1ef] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#748078]">{t('you')}</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={account.role} /></td>
                    <td className="px-4 py-3 tabular-nums text-[#69766e]">{account._count?.scheduleEntries ?? 0} {t('periods')}</td>
                    <td className="px-4 py-3 text-[#69766e]">
                      {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(account.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/${locale}/admin/accounts/${account.id}`}
                          title={t('manageSchedules')}
                          aria-label={`${t('manageSchedules')} ${account.username}`}
                          className="rounded-md p-2 text-[#527263] transition hover:bg-[#e7f0eb] hover:text-[#356b5c]"
                        >
                          <CalendarDays className="size-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleRole(account)}
                          disabled={actionsDisabled}
                          title={actionsDisabled ? t('roleLocked') : t(account.role === 'ADMIN' ? 'demote' : 'promote')}
                          aria-label={`${t(account.role === 'ADMIN' ? 'demote' : 'promote')} ${account.username}`}
                          className="rounded-md p-2 text-[#527263] transition hover:bg-[#e7f0eb] hover:text-[#356b5c] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {account.role === 'ADMIN' ? <UserMinus className="size-4" /> : <UserPlus className="size-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirm({ type: 'delete', account })}
                          disabled={actionsDisabled}
                          title={actionsDisabled ? t('deleteLocked') : t('deleteAccount')}
                          aria-label={`${t('deleteAccount')} ${account.username}`}
                          className="rounded-md p-2 text-[#99483f] transition hover:bg-[#f9e8e4] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirm?.type === 'delete'}
        title={t('deleteConfirmTitle')}
        body={t('deleteConfirmBody', { username: confirm?.account.username ?? '' })}
        confirmLabel={t('deleteAccount')}
        cancelLabel={t('cancel')}
        busy={deleteMutation.isPending}
        onConfirm={() => confirm && deleteMutation.mutate(confirm.account.id)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === 'demote'}
        title={t('demoteConfirmTitle')}
        body={t('demoteConfirmBody', { username: confirm?.account.username ?? '' })}
        confirmLabel={t('demote')}
        cancelLabel={t('cancel')}
        busy={roleMutation.isPending}
        onConfirm={() => confirm && roleMutation.mutate({ id: confirm.account.id, role: 'USER' })}
        onCancel={() => setConfirm(null)}
      />

      <span className="sr-only" role="status" aria-live="polite">
        {feedback?.message ?? ''}
      </span>
    </>
  )
}

export default AccountsPage
