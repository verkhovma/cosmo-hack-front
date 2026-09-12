import type { ValidationError } from "../utils/validate";

export default function ErrorList({
  errors, title, onClose,
}: {
  errors: ValidationError[];
  title?: string;
  onClose?: () => void;
}) {
  if (!errors.length) return null;
  return (
    <div className="error-list" role="alert">
      <div className="error-list-head">
        <strong>{title ?? "Найдены ошибки"} ({errors.length})</strong>
        {onClose && <button className="btn tiny" onClick={onClose}>×</button>}
      </div>
      <ul>
        {errors.map((e, i) => (
          <li key={i}>
            <code>{e.path}</code> — {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}