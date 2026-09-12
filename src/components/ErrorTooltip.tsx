import { ReactNode } from "react";

export function Field({
  error, children,
}: { error?: string; children: ReactNode }) {
  return (
    <span className={"field" + (error ? " field-error" : "")}
          title={error || undefined}>
      {children}
    </span>
  );
}

export function ErrorList({
  errors, onClose,
}: { errors: { path: string; message: string }[]; onClose?: () => void }) {
  if (!errors.length) return null;
  return (
    <div className="error-list">
      <strong>Найдены ошибки:</strong>
      <ul>
        {errors.map((e, i) => (
          <li key={i}><code>{e.path}</code> — {e.message}</li>
        ))}
      </ul>
      {onClose && <button onClick={onClose}>×</button>}
    </div>
  );
}