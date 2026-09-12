import { api } from "../api";

export default function ExportButton({ jobId, disabled }: {
  jobId: string; disabled?: boolean;
}) {
  return (
    <a className={"btn" + (disabled ? " disabled" : "")}
       href={disabled ? undefined : api.exportUrl(jobId)}
       download>
      Скачать результат (весь сценарий)
    </a>
  );
}