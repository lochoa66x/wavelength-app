import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";

export const MAX_PAGE_BYTES = 1_500_000;
export const MAX_EXTRACTED_CHARS = 50_000;
const REQUEST_TIMEOUT_MS = 12_000;

function ipv4Number(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function inIpv4Range(address, base, bits) {
  const value = ipv4Number(address);
  const baseValue = ipv4Number(base);
  if (value === null || baseValue === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (baseValue & mask);
}

export function isPrivateOrReservedAddress(address) {
  const type = net.isIP(address);
  if (type === 4) {
    return [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
      ["224.0.0.0", 4], ["240.0.0.0", 4],
    ].some(([base, bits]) => inIpv4Range(address, base, bits));
  }
  if (type === 6) {
    const value = address.toLowerCase().split("%")[0];
    let source = value;
    let dottedIpv4 = null;
    const dottedMatch = /(\d+\.\d+\.\d+\.\d+)$/.exec(source);
    if (dottedMatch) {
      dottedIpv4 = dottedMatch[1];
      const ipv4 = ipv4Number(dottedIpv4);
      if (ipv4 === null) return true;
      source = source.slice(0, -dottedIpv4.length) + `${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
    }
    const halves = source.split("::");
    if (halves.length > 2) return true;
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];
    const missing = 8 - left.length - right.length;
    if (missing < 0 || (halves.length === 1 && missing !== 0)) return true;
    const groups = [...left, ...Array(missing).fill("0"), ...right].map((group) => Number.parseInt(group || "0", 16));
    if (groups.length !== 8 || groups.some((group) => !Number.isInteger(group) || group < 0 || group > 0xffff)) return true;
    if (groups.every((group) => group === 0) || (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1)) return true;
    if ((groups[0] & 0xfe00) === 0xfc00) return true;
    if ((groups[0] & 0xffc0) === 0xfe80 || (groups[0] & 0xffc0) === 0xfec0) return true;
    if ((groups[0] & 0xff00) === 0xff00) return true;
    if (groups[0] === 0x2001 && groups[1] === 0x0db8) return true;
    const embeddedIpv4 = (groups.slice(0, 5).every((group) => group === 0) && (groups[5] === 0 || groups[5] === 0xffff))
      ? `${groups[6] >>> 8}.${groups[6] & 255}.${groups[7] >>> 8}.${groups[7] & 255}`
      : dottedIpv4;
    return embeddedIpv4 ? isPrivateOrReservedAddress(embeddedIpv4) : false;
  }
  return true;
}

function resolvedAddresses(records) {
  const values = Array.isArray(records) ? records : [records];
  const addresses = values.map((record) => typeof record === "string" ? record : record?.address);
  if (!values.length || addresses.some((address) => typeof address !== "string" || net.isIP(address) === 0)) {
    throw new Error("That URL could not be resolved to a public network address.");
  }
  if (addresses.some(isPrivateOrReservedAddress)) {
    throw new Error("That URL resolves to a private or reserved network address.");
  }
  return addresses;
}

export function createPinnedLookup(address, family = net.isIP(address)) {
  return (_hostname, options, callback) => {
    if (options?.all) {
      callback(null, [{ address, family }]);
      return;
    }
    callback(null, address, family);
  };
}

export async function validatePublicHttpsUrl(rawUrl, resolveHost = (hostname) => dns.lookup(hostname, { all: true, verbatim: true })) {
  let url;
  try {
    url = new URL(String(rawUrl || "").trim());
  } catch {
    throw new Error("Enter a valid HTTPS job URL.");
  }
  if (url.protocol !== "https:") throw new Error("Only public HTTPS job URLs are supported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported.");
  if (url.port && url.port !== "443") throw new Error("Non-standard URL ports are not supported.");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("That host is not a public website.");
  }

  const literalType = net.isIP(hostname);
  const records = literalType ? [{ address: hostname }] : await resolveHost(hostname);
  resolvedAddresses(records);
  return url;
}

export function decodeHtmlEntities(value) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (named[lower]) return named[lower];
    if (lower.startsWith("#x") || lower.startsWith("#")) {
      const codePoint = Number.parseInt(lower.slice(lower.startsWith("#x") ? 2 : 1), lower.startsWith("#x") ? 16 : 10);
      if (Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) return String.fromCodePoint(codePoint);
    }
    return match;
  });
}

export function htmlToReadableText(html) {
  return decodeHtmlEntities(String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|canvas|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/section|\/article|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);
}

async function readLimitedBody(response) {
  const contentLength = Number(response.headers?.get?.("content-length") || 0);
  if (contentLength > MAX_PAGE_BYTES) throw new Error("That page is too large to process safely.");
  const buffer = response.arrayBuffer
    ? Buffer.from(await response.arrayBuffer())
    : Buffer.from(await response.text(), "utf8");
  if (buffer.byteLength > MAX_PAGE_BYTES) throw new Error("That page is too large to process safely.");
  return buffer.toString("utf8");
}

async function requestPinnedHttpsPage(url, resolveHost = (hostname) => dns.lookup(hostname, { all: true, verbatim: true })) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const records = await resolveHost(hostname);
  const resolved = resolvedAddresses(records);
  const address = resolved[0];
  const family = net.isIP(address);

  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: "GET",
      headers: { "User-Agent": "Gigscapes job-posting importer/1.0", Accept: "text/html,text/plain;q=0.9" },
      lookup: createPinnedLookup(address, family),
      servername: hostname,
    }, (response) => {
      const declaredLength = Number(response.headers["content-length"] || 0);
      if (declaredLength > MAX_PAGE_BYTES) {
        response.destroy();
        reject(new Error("That page is too large to process safely."));
        return;
      }
      const chunks = [];
      let bytes = 0;
      response.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > MAX_PAGE_BYTES) {
          response.destroy(new Error("That page is too large to process safely."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve({
          status: response.statusCode || 500,
          ok: (response.statusCode || 500) >= 200 && (response.statusCode || 500) < 300,
          headers: { get: (name) => response.headers[String(name).toLowerCase()] || null },
          arrayBuffer: async () => body,
        });
      });
    });
    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      const error = new Error("Job page request timed out");
      error.name = "AbortError";
      request.destroy(error);
    });
    request.on("error", reject);
    request.end();
  });
}

export async function fetchPublicJobPage(rawUrl, {
  fetchImpl,
  resolveHost,
  maxRedirects = 3,
} = {}) {
  let current = await validatePublicHttpsUrl(rawUrl, resolveHost);
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    let response;
    if (fetchImpl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        response = await fetchImpl(current.toString(), {
          method: "GET",
          redirect: "manual",
          headers: { "User-Agent": "Gigscapes job-posting importer/1.0", Accept: "text/html,text/plain;q=0.9" },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    } else {
      response = await requestPinnedHttpsPage(current, resolveHost);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirect === maxRedirects) throw new Error("That URL redirected too many times.");
      const location = response.headers?.get?.("location");
      if (!location) throw new Error("The job page returned an invalid redirect.");
      current = await validatePublicHttpsUrl(new URL(location, current).toString(), resolveHost);
      continue;
    }
    if (!response.ok) {
      const blocked = [401, 403, 429].includes(response.status);
      const error = new Error(blocked
        ? "This career site blocked automated reading. Paste the posting or upload screenshots instead."
        : `The job page returned HTTP ${response.status}. Try pasting the posting instead.`);
      if (blocked) error.code = "blocked";
      error.httpStatus = response.status;
      throw error;
    }
    const contentType = (response.headers?.get?.("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error("That URL did not return a readable job page. Try pasting the posting instead.");
    }
    const raw = await readLimitedBody(response);
    const isPlainText = contentType.includes("text/plain");
    const text = isPlainText ? raw.slice(0, MAX_EXTRACTED_CHARS) : htmlToReadableText(raw);
    if (text.length < 80) throw new Error("We could not read enough posting text from that page. Try pasting it instead.");
    return {
      text,
      html: isPlainText ? "" : raw,
      contentType: contentType || "text/html",
      url: current.toString(),
    };
  }
  throw new Error("Unable to read that job page.");
}
