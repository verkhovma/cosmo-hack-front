export default function ErrorBanner({ message, onClose }: {
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className="error-banner" role="alert">
      <span>⚠ {message}</span>
      {onClose && <button onClick={onClose}>×</button>}
    </div>
  );
}