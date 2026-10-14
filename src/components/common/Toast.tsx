import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToast, type ToastVariant } from '../../context/ToastContext';

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="size-4 text-[var(--color-success)]" />,
  error: <XCircle className="size-4 text-[var(--color-danger)]" />,
  info: <Info className="size-4 text-[var(--color-accent)]" />,
};

export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]
            p-3 text-sm text-[var(--color-text)] shadow-lg"
        >
          {ICONS[toast.variant]}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => dismissToast(toast.id)} aria-label="Dismiss" className="text-[var(--color-text-muted)]">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
