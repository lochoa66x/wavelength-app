const refreshes = new WeakMap();
const sessionError = () => new Error('Your session expired. Sign in again, then retry.');

async function refreshOnce(auth) {
  if (!refreshes.has(auth)) {
    const pending = Promise.resolve().then(() => auth.refreshSession());
    refreshes.set(auth, pending);
    pending.finally(() => { if (refreshes.get(auth) === pending) refreshes.delete(auth); }).catch(() => {});
  }
  return refreshes.get(auth);
}

// These application endpoints authenticate before processing a request. Retry
// only an explicit 401; never replay a timeout, a generation failure, or a 403.
export async function authenticatedJsonPost(path, payload, {auth, signal, fetchImpl = globalThis.fetch} = {}) {
  signal?.throwIfAborted();
  const initial = await auth.getSession();
  const session = initial.data?.session;
  if (initial.error || !session?.access_token || !session.user?.id) throw sessionError();
  const body = JSON.stringify(payload);
  const send = async current => {
    signal?.throwIfAborted();
    return fetchImpl(path, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${current.access_token}`},
      body, cache:'no-store', credentials:'same-origin', signal,
    });
  };
  let response = await send(session);
  if (response.status === 401) {
    signal?.throwIfAborted();
    const latest = await auth.getSession();
    if (latest.error || latest.data?.session?.user?.id !== session.user.id) throw sessionError();
    let renewed = latest;
    if (latest.data.session.access_token === session.access_token) {
      try { renewed = await refreshOnce(auth); } catch { throw sessionError(); }
    }
    const next = renewed.data?.session;
    if (renewed.error || !next?.access_token || next.user?.id !== session.user.id) throw sessionError();
    response = await send(next);
  }
  if (response.status === 401) throw sessionError();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
