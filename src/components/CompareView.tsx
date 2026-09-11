import type { CompareResponse, ComputeResult } from "../types";

export default function CompareView({
  data, jobs,
}: {
  data: CompareResponse;
  jobs: { jobId: string; title: string; result: ComputeResult }[];
}) {
  const clients = Object.keys(data.metrics_diff);
  return (
    <div className="compare-view">
      <table className="compare">
        <thead>
          <tr>
            <th>Клиент</th>
            {jobs.map((j) => <th key={j.jobId}>{j.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {clients.map((cid) => (
            <tr key={cid}>
              <td>{cid}</td>
              {jobs.map((j) => {
                const m = data.metrics_diff[cid]?.[j.jobId];
                return (
                  <td key={j.jobId}>
                    {m ? (
                      <>
                        {(m.availability * 100).toFixed(2)}%
                        <br />
                        <small>перерыв {m.max_gap_s} с</small>
                      </>
                    ) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Различия конфигурации</h3>
      <ul>
        {Object.entries(data.config_diff).map(([jid, changes]) => (
          <li key={jid}>
            <b>{jobs.find((j) => j.jobId === jid)?.title ?? jid}</b>:
            <ul>
              {Object.entries(changes).map(([k, v]) => (
                <li key={k}>{k}: {JSON.stringify(v)}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}