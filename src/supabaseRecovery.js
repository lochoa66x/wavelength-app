export function isFutureJwtError(error) {
  return /jwt issued at future/i.test(String(error?.message || error || ""));
}

export async function runWithFutureJwtRecovery(
  operation,
  {
    refreshSession,
    wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    retryDelays = [1800, 1200],
  } = {},
) {
  let result = await operation();
  if (!isFutureJwtError(result?.error)) return result;

  await wait(retryDelays[0]);
  result = await operation();
  if (!isFutureJwtError(result?.error) || !refreshSession) return result;

  const refreshed = await refreshSession();
  if (refreshed?.error) return result;

  await wait(retryDelays[1]);
  return operation();
}
