export function ExportStatusNotice({ message, C, onRefresh = () => globalThis.location?.reload() }) {
  if (!message) return null;
  const isError = message.type === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      data-export-status={message.category || message.type}
      style={{ color: isError ? C.red : C.textSub, fontSize: 12.5, margin: "10px 0 0", lineHeight: 1.5 }}
    >
      <span>{message.text}</span>
      {message.refreshRequired ? (
        <button
          type="button"
          onClick={onRefresh}
          className="wl-btn"
          style={{ marginTop: 8, display: "flex", border: `1px solid ${C.border}`, borderRadius: 980, background: C.bgCard, color: C.text, padding: "7px 11px", fontSize: 12, fontWeight: 700 }}
        >
          Refresh Gigscapes
        </button>
      ) : null}
    </div>
  );
}
