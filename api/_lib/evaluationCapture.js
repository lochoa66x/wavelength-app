import { randomUUID } from 'node:crypto';

// Inject only in an explicit evaluation harness. The production default has no
// recorder, persistence, private-content logs or client-controlled opt-in.
export function evaluationCapture(record, documentKind) {
  if (typeof record !== 'function') return async () => {};
  const requestId = randomUUID();
  let sequence = 0;
  return async (stage, data = {}) => {
    const event = structuredClone({ version: 1, requestId, documentKind, sequence: ++sequence, stage, ...data });
    try { await record(event); }
    catch { console.warn('[evaluation] recorder unavailable'); }
  };
}
