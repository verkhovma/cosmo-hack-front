import { ReactNode } from "react";

/** Обёртка вокруг input/select с красной подсветкой при ошибке. */
export function Field({
  error, children,
}: {
  error?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={"field" + (error ? " field-error" : "")}
      title={error || undefined}
    >
      {children}
    </span>
  );
}

/** Заголовок группы (используется над списками — Очереди, Плоскости и т.д.) */
export function ListHeader({
  title, errors, onAdd,
}: {
  title: string;
  errors: { path: string; message: string }[];
  onAdd?: () => void;
}) {
  const listError = errors.find(e => !e.path.includes("["));
  return (
    <div className={"list-header" + (listError ? " field-error" : "")}
         title={listError?.message}>
      <h3>{title}</h3>
      {onAdd && <button className="btn tiny" onClick={onAdd}>+ добавить</button>}
    </div>
  );
}