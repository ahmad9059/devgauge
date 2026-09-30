/**
 * Injected into the provider's own first-party page before content loads.
 * It observes the responses the site itself fetches (fetch/XHR) and forwards
 * usage-shaped JSON to React Native. It never reads form fields, passwords, or
 * typed credentials, and it does not modify the page.
 */
export const USAGE_BRIDGE_SCRIPT = `
(function () {
  if (window.__devgaugeBridgeInstalled) return;
  window.__devgaugeBridgeInstalled = true;
  function post(payload) {
    try {
      if (window.__devgaugeCaptureActive === false) return;
      if (payload.runId === undefined) payload.runId = window.__devgaugeRunId;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    } catch (e) {}
  }
  function looksLikeUsage(text) {
    if (typeof text !== 'string') return false;
    if (text.length === 0 || text.length > 200000) return false;
    return /utilization|resets_at|five_hour|seven_day|usage|limit/i.test(text);
  }
  function inspect(url, text, runId) {
    if (looksLikeUsage(text)) post({ type: 'usage', url: String(url || ''), body: text, runId: runId });
  }
  var lastText = '';
  window.__devgaugePostText = postText;
  function postText() {
    try {
      if (window.__devgaugeCaptureActive === false || window.__devgaugeCaptureMode === 'api') return;
      var body = document.body;
      if (!body) return;
      var text = body.innerText || '';
      if (text.length > 0 && text.length < 60000 && text !== lastText) {
        lastText = text;
        post({ type: 'text', text: text });
      }
    } catch (e) {}
  }
  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    postText();
    try {
      var ticks = 0;
      var timer = setInterval(function () {
        postText();
        ticks += 1;
        if (ticks > 40 || window.__devgaugeCaptureActive === false) clearInterval(timer);
      }, 250);
    } catch (e) {}
    try {
      var pending = null;
      var observer = new MutationObserver(function () {
        if (pending) return;
        pending = setTimeout(function () {
          pending = null;
          postText();
        }, 75);
      });
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
    } catch (e) {}
  }
  try {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      schedule();
    } else {
      document.addEventListener('DOMContentLoaded', schedule);
    }
    window.addEventListener('load', schedule);
  } catch (e) {}
  try {
    var originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function () {
        var args = arguments;
        var runId = window.__devgaugeRunId;
        return originalFetch.apply(this, args).then(function (response) {
          try {
            var url = response && response.url;
            response.clone().text().then(function (text) { inspect(url, text, runId); }).catch(function () {});
          } catch (e) {}
          return response;
        });
      };
    }
  } catch (e) {}
  try {
    var open = XMLHttpRequest.prototype.open;
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__devgaugeUrl = url;
      return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      var xhr = this;
      var runId = window.__devgaugeRunId;
      xhr.addEventListener('load', function () {
        try { inspect(xhr.__devgaugeUrl, xhr.responseText, runId); } catch (e) {}
      });
      return send.apply(this, arguments);
    };
  } catch (e) {}
})();
true;
`;

/**
 * Background-only fast path. Remember read-only requests in the page's memory,
 * including its own auth headers. Native code approves only URLs whose captured
 * JSON parsed into quota windows. Nothing here is persisted or exported.
 */
const SESSION_REFRESH_SCRIPT = `
(function () {
  if (window.__devgaugeRefreshInstalled) return;
  window.__devgaugeRefreshInstalled = true;
  var requests = new Map();
  var approved = new Set();
  var fetchWithBridge = window.fetch;
  var xhrOpen = XMLHttpRequest.prototype.open;
  var xhrSend = XMLHttpRequest.prototype.send;
  var xhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  function remember(request) {
    try {
      var url = new URL(request.url, location.href);
      if (request.method !== 'GET' || url.origin !== location.origin) return;
      if (requests.size >= 40 && !requests.has(url.href)) {
        var oldest = requests.keys().next().value;
        requests.delete(oldest);
        approved.delete(oldest);
      }
      requests.set(url.href, request);
    } catch (e) {}
  }
  window.fetch = function (input, init) {
    try { remember(new Request(input, init)); } catch (e) {}
    return fetchWithBridge.apply(this, arguments);
  };
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__devgaugeReadRequest = { method: method, url: url, headers: {} };
    return xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this.__devgaugeReadRequest) this.__devgaugeReadRequest.headers[name] = value;
    return xhrSetHeader.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    try {
      var request = this.__devgaugeReadRequest;
      if (request) remember(new Request(new URL(request.url, location.href).href, request));
    } catch (e) {}
    return xhrSend.apply(this, arguments);
  };
  window.__devgaugeApproveQuotaUrl = function (url) {
    try {
      var absolute = new URL(url, location.href).href;
      if (requests.has(absolute)) approved.add(absolute);
    } catch (e) {}
  };
  function miss(runId) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fast-miss', runId: runId }));
  }
  window.__devgaugeRefreshUsage = function (runId) {
    window.__devgaugeRunId = runId;
    window.__devgaugeCaptureActive = true;
    window.__devgaugeCaptureMode = 'api';
    var pending = [];
    approved.forEach(function (url) {
      var request = requests.get(url);
      if (request) {
        var headers = new Headers(request.headers);
        headers.delete('If-None-Match');
        headers.delete('If-Modified-Since');
        pending.push(fetchWithBridge.call(window, new Request(request, { cache: 'no-store', credentials: 'include', headers: headers })));
      }
    });
    if (!pending.length) { miss(runId); return; }
    Promise.all(pending).then(function (responses) {
      if (responses.some(function (response) { return !response.ok; })) miss(runId);
    }).catch(function () { miss(runId); });
  };
})();
true;
`;

export function createSyncBridgeScript(runId: number): string {
  return `window.__devgaugeRunId = ${runId};
window.__devgaugeCaptureActive = true;
window.__devgaugeCaptureMode = 'page';\n${USAGE_BRIDGE_SCRIPT}\n${SESSION_REFRESH_SCRIPT}`;
}

export function refreshSessionScript(runId: number): string {
  return `(function () {
    if (window.__devgaugeRefreshUsage) window.__devgaugeRefreshUsage(${runId});
    else window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fast-miss', runId: ${runId} }));
  })(); true;`;
}
