export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  // Offsets kept as logged (styleguide: never convert to UTC).
  firstAt: string;
  lastAt: string;
};

// counts: log lines by status, over the whole night.
export type Night = { rows: DigestRow[]; badLines: number; counts: Record<RunStatus, number> };

// Returns null when runs/<night>.jsonl does not exist.
export type ReadNight = (runsDir: string, night: string) => Night | null;
