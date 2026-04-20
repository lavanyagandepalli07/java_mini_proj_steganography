type StatusAlertProps = {
  message: string;
  loading?: boolean;
  variant?: 'info' | 'success' | 'error';
};

export default function StatusAlert({ message, loading = false, variant = 'info' }: StatusAlertProps) {
  if (!message && !loading) return null;
  return (
    <div className={`status-alert status-alert--${variant}`} role="status" aria-live="polite">
      <p>{loading ? 'Working…' : message}</p>
    </div>
  );
}
