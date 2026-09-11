import { api } from "../api";

export default function ExportButton({ jobId }: { jobId: string }) {
  return (
    <a className="btn" href={api.exportUrl(jobId)} download>
      Скачать результат (JSON)
    </a>
  );
}