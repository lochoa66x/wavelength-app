import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const sha256 = (value) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');

export async function freezeEvaluation(directory, { cases, rubric, revision, runId }) {
  if (cases.length !== 10 || new Set(cases.map((entry) => entry.id)).size !== 10) throw new Error('Freeze exactly ten uniquely identified cases.');
  await mkdir(directory, { recursive: true });
  const manifest = { version: 1, runId, revision, frozenAt: new Date().toISOString(), rubricHash: sha256(rubric), corpusHash: sha256(cases), cases };
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  return manifest;
}

export async function recordEvaluationAttempt(directory, record) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  if (sha256(manifest.cases) !== manifest.corpusHash) throw new Error('Frozen evaluation inputs were modified.');
  if (!manifest.cases.some((entry) => entry.id === record.caseId)) throw new Error('Case is outside the frozen set.');
  if (!Number.isInteger(record.attempt) || record.attempt < 1 || !record.revision) throw new Error('Record attempt number and actual deployed revision.');
  if (!['completed', 'failed', 'partial'].includes(record.status)) throw new Error('Record the observed attempt outcome.');
  if (record.attempt > 1) await readFile(path.join(directory, `${record.caseId}-attempt-${record.attempt - 1}.json`));
  const saved = { ...record, recordedAt: new Date().toISOString(), corpusHash: manifest.corpusHash };
  await writeFile(path.join(directory, `${record.caseId}-attempt-${record.attempt}.json`), JSON.stringify(saved, null, 2), { flag: 'wx' });
  return saved;
}

export async function summarizeEvaluation(directory) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  const names = await readdir(directory);
  const attempts = await Promise.all(names.filter((name) => /^F\d+-attempt-\d+\.json$/.test(name)).map(async (name) => JSON.parse(await readFile(path.join(directory, name), 'utf8'))));
  const first = manifest.cases.map((entry) => attempts.find((attempt) => attempt.caseId === entry.id && attempt.attempt === 1) || { caseId: entry.id, status: 'not_run' });
  return { denominator: manifest.cases.length, completedFirstAttempts: first.filter((entry) => entry.status === 'completed').length, firstAttempts: first, retests: attempts.filter((entry) => entry.attempt > 1) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, directory, input] = process.argv.slice(2);
  if (command === 'freeze') {
    const { freshCareerCases } = await import('../evaluations/fresh-careers-v1.mjs');
    console.log(JSON.stringify(await freezeEvaluation(directory, { cases: freshCareerCases, rubric: await readFile(new URL('../evaluations/QUALITY_RUBRIC.md', import.meta.url), 'utf8'), revision: input, runId: 'fresh-careers-v1' }), null, 2));
  } else if (command === 'record') console.log(JSON.stringify(await recordEvaluationAttempt(directory, JSON.parse(await readFile(input, 'utf8')))));
  else if (command === 'summary') console.log(JSON.stringify(await summarizeEvaluation(directory), null, 2));
  else throw new Error('Usage: evaluationLedger.mjs freeze|record|summary DIRECTORY [REVISION|RECORD_FILE]');
}
