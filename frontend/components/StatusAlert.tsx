type StatusAlertProps = {
  message: string;
  loading?: boolean;
};

export default function StatusAlert({ message, loading = false }: StatusAlertProps) {
  return (
    <div className="status-alert" role="status" aria-live="polite">
      <p>{loading ? 'Working…' : message}</p>
    </div>
  );
}
