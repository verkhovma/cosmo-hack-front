import { createContext, useContext, useState, ReactNode } from "react";
import type { ComputeResult } from "./types";

interface JobEntry {
  jobId: string;
  title: string;
  result: ComputeResult;
}

interface JobsCtx {
  jobs: JobEntry[];
  addJob: (entry: JobEntry) => void;
  removeJob: (jobId: string) => void;
  clear: () => void;
}

const Ctx = createContext<JobsCtx | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const addJob = (e: JobEntry) =>
    setJobs((prev) => [...prev.filter((j) => j.jobId !== e.jobId), e]);
  const removeJob = (jobId: string) =>
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
  const clear = () => setJobs([]);
  return (
    <Ctx.Provider value={{ jobs, addJob, removeJob, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useJobs must be used within JobsProvider");
  return ctx;
}