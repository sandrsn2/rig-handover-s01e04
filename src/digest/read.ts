import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunStatus } from './types.js';

const statuses: RunStatus[] = ['ok', 'retry', 'fail'];

type Line = { at: string; job: string; status: RunStatus; owner: string | null; error: string | null };

function parseLine(text: string): Line | null {
  try {
    const o = JSON.parse(text) as Record<string, unknown>;
    if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
    if (!statuses.includes(o.status as RunStatus)) return null;
    return {
      at: o.at,
      job: o.job,
      status: o.status as RunStatus,
      owner: typeof o.owner === 'string' ? o.owner : null,
      error: typeof o.error === 'string' ? o.error : null,
    };
  } catch {
    return null;
  }
}

export const readNight: ReadNight = (runsDir, night): Night | null => {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  const counts: Record<RunStatus, number> = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    const l = parseLine(raw);
    if (!l) {
      badLines++;
      continue;
    }
    counts[l.status]++;
    const row = rows.get(l.job);
    if (!row) {
      rows.set(l.job, {
        job: l.job,
        owner: l.owner,
        runs: 1,
        retries: l.status === 'retry' ? 1 : 0,
        lastStatus: l.status,
        lastError: l.error,
        firstAt: l.at,
        lastAt: l.at,
      });
      continue;
    }
    row.runs++;
    if (l.status === 'retry') row.retries++;
    row.owner = l.owner ?? row.owner;
    row.lastStatus = l.status;
    row.lastError = l.error;
    row.lastAt = l.at;
  }
  return { rows: [...rows.values()].sort((a, b) => a.job.localeCompare(b.job)), badLines, counts };
};
