import { recoveryDownload } from './RecoveryDownloads.js';
import React, { useRef, useState } from 'react';
import { useAuth } from './auth.jsx';
import { supabase } from './supabase.js';
import { authenticatedJsonPost } from './authenticatedRequest.js';
import { recoveryQueue } from '../evaluations/validation-recovery-v1/cases.js';

export default function ValidationRecovery() {
  const { session, loading } = useAuth();
  const [capability, setCapability] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('Ready to run 32 frozen first requests.');
  const [running, setRunning] = useState(false);
  const started = useRef(false);
  const stop = useRef(false);
  async function run() {
    if (started.current) return;
    started.current = true;
    setRunning(true);
    const captured = [];
    for (const cell of recoveryQueue) {
      if (stop.current) break;
      setStatus(`${captured.length}/32 complete. Running ${cell.caseId} ${cell.arm} ${cell.kind}.`);
      try {
        const result = await authenticatedJsonPost('/api/validation-recovery', { ...cell, capability }, { auth: supabase.auth });
        captured.push(result);
      } catch (error) {
        captured.push({ ...cell, attempt: 1, error: error.message, completedAt: new Date().toISOString() });
        // Access/transport errors stop the queue; do not burn 32 failures on a broken runner.
        stop.current = true;
      }
      setResults([...captured]);
    }
    setRunning(false);
    setStatus(`${captured.length}/32 complete.${stop.current ? ' Stopped; captured attempts are preserved.' : ' Experiment complete.'}`);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'gigscapes-validation-recovery-v1.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <main style={{ maxWidth: 960, margin: '40px auto', padding: 24, fontFamily: 'system-ui' }}>
    <h1>Validation recovery evaluation</h1>
    <p>Six preserved cases and ten fresh fictional careers. Each request and failure is retained. Your saved résumé is never read or changed here.</p>
    {loading ? <p>Checking session…</p> : !session ? <a href="/sign-in?next=/app/validation-recovery">Sign in to continue</a> : <>
      <label>Experiment access key <input type="password" value={capability} onChange={e => setCapability(e.target.value)} disabled={started.current} autoComplete="off" /></label>
      <p><button onClick={run} disabled={!capability || started.current}>Run frozen comparison</button> <button disabled={!running} onClick={() => { stop.current = true; }}>Stop after current request</button> <button onClick={download} disabled={!results.length}>Download captured results</button></p>
    </>}
    <button disabled={running || !results.length} onClick={async()=>{setStatus("Building document downloads…");const report=await recoveryDownload(results);setStatus("Exports: "+report.filter(r=>r.exported).length+"/32 documents. See downloaded export report.");}}>Download DOCX and PDF bundle</button>
    <p role="status">{status}</p>
    <ol>{results.map((r, i) => <li key={i}>{r.caseId} · {r.arm} · {r.kind} · {r.error || (r.httpStatus >= 400 ? `HTTP ${r.httpStatus}` : 'Captured')} · {r.calls?.length || 0} provider calls</li>)}</ol>
    <details><summary>Raw captured results</summary><pre id="comparison-results" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(results)}</pre></details>
  </main>;
}
