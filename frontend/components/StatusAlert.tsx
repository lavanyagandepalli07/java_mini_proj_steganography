type StatusAlertProps = {
  message: string;
  loading?: boolean;
  variant?: 'info' | 'success' | 'error';
};

export default function StatusAlert({ message, loading = false, variant = 'info' }: StatusAlertProps) {
  if (!message && !loading) return null;
  const getIcon = () => {
    if (loading) return '\u{23F3}';
    switch (variant) {
      case 'success': return '\u{2705}';
      case 'error': return '\u{2620}\u{FE0F}';
      default: return '\u{1F4E1}';
    }
  };

  return (
    <div className={`status-alert status-alert--${variant}`} role="status" aria-live="polite">
      <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>{getIcon()}</span>
        <span>{loading ? 'Working…' : message}</span>
      </p>
    </div>
  );
}
