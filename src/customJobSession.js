const SOURCE_MODES = new Set(["url", "screenshots", "paste"]);

function normalizeSourceMode(value) {
  return SOURCE_MODES.has(value) ? value : "url";
}

export function createCustomJobRequestCoordinator(initialMode = "url") {
  let mode = normalizeSourceMode(initialMode);
  let sourceId = 1;
  let requestId = 0;
  let controller = null;

  const snapshot = () => Object.freeze({ mode, sourceId, requestId });
  const abortActiveRequest = () => {
    controller?.abort();
    controller = null;
  };

  return {
    snapshot,
    beginSource(nextMode = mode) {
      abortActiveRequest();
      mode = normalizeSourceMode(nextMode);
      sourceId += 1;
      requestId += 1;
      return snapshot();
    },
    beginRequest(kind = "request") {
      abortActiveRequest();
      requestId += 1;
      controller = new AbortController();
      return Object.freeze({
        kind,
        mode,
        sourceId,
        requestId,
        signal: controller.signal,
      });
    },
    isCurrent(request) {
      return Boolean(
        request
          && request.sourceId === sourceId
          && request.requestId === requestId
          && request.mode === mode
          && request.signal?.aborted !== true,
      );
    },
    finish(request) {
      if (!this.isCurrent(request)) return false;
      controller = null;
      return true;
    },
    cancelActiveRequest() {
      abortActiveRequest();
      requestId += 1;
      return snapshot();
    },
    dispose() {
      abortActiveRequest();
      sourceId += 1;
      requestId += 1;
    },
  };
}
