import { cn } from '@/lib/utils'

/** 轻量提示条。message: { type: 'ok' | 'error', text } | null */
export function Toast({ message, className }) {
  if (!message) return null
  return (
    <div
      role="status"
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg border border-transparent px-4 py-2 text-sm font-medium shadow-lg',
        message.type === 'ok'
          ? 'bg-primary text-primary-foreground'
          : 'bg-destructive text-white',
        className,
      )}
    >
      {message.text}
    </div>
  )
}
