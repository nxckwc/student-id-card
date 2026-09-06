"use client"

import { AlertTriangle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

export const ConfirmDialog = ({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-dialog"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-text-primary/40 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
          <motion.div
            className="relative w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-[0_20px_50px_rgba(38,51,46,0.25)]"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger-foreground">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            <p className="mt-1.5 text-sm text-text-nav">{body}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface-subtle disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-danger px-4 py-2 text-sm font-bold text-white transition hover:bg-danger-hover disabled:opacity-60"
          >
            {busy ? '…' : confirmLabel}
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
