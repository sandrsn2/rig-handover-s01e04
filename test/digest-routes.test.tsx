import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
writeFileSync(join(dir, '2026-01-01.jsonl'), '');
writeFileSync(
  join(dir, '2026-01-02.jsonl'),
  '{"at":"2026-01-02T01:00:00+01:00","job":"b","status":"fail","owner":null,"error":"x"}\nnot json\n' +
    '{"at":"2026-01-02T02:00:00+01:00","job":"a","status":"ok","owner":"rook"}\n',
);
const app = createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: dir });

describe('digest routes', () => {
  it('page: 200 with rows sorted by job, fail marked, null owner as —', async () => {
    const res = await app.request('/digest/2026-01-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('>a<')).toBeLessThan(html.indexOf('>b<'));
    expect(html).toContain('fail !');
    expect(html).toContain('—');
    expect(html).toContain('1 unreadable line');
  });

  it('page: 404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-02-02')).status).toBe(404);
    expect((await app.request('/api/digest/2026-02-02')).status).toBe(404);
  });

  it('page: empty night renders "nothing ran"', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('json: same jobs in the same order as the page', async () => {
    const rows = (await (await app.request('/api/digest/2026-01-02')).json()) as { job: string }[];
    expect(rows.map((r) => r.job)).toEqual(['a', 'b']);
  });

  it('board links each night to its digest with counts', async () => {
    const html = await (await app.request('/')).text();
    expect(html).toContain('href="/digest/2026-01-02"');
    expect(html).toContain('ok 1 · retry 0 · fail 1');
  });
});
