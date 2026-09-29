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
  function inspect(url, text) {
    if (looksLikeUsage(text)) post({ type: 'usage', url: String(url || ''), body: text });
  }
  function postText() {
    try {
      var body = document.body;
      if (!body) return;
      var text = body.innerText || '';
      if (text.length > 0 && text.length < 60000) post({ type: 'text', text: text });
    } catch (e) {}
  }
  function schedule() {
    postText();
    try {
      var ticks = 0;
      var timer = setInterval(function () {
        postText();
        ticks += 1;
        if (ticks > 25) clearInterval(timer);
      }, 2000);
    } catch (e) {}
    try {
      var pending = null;
      var observer = new MutationObserver(function () {
        if (pending) return;
        pending = setTimeout(function () {
          pending = null;
          postText();
        }, 800);
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
        return originalFetch.apply(this, args).then(function (response) {
          try {
            var url = response && response.url;
            response.clone().text().then(function (text) { inspect(url, text); }).catch(function () {});
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
      xhr.addEventListener('load', function () {
        try { inspect(xhr.__devgaugeUrl, xhr.responseText); } catch (e) {}
      });
      return send.apply(this, arguments);
    };
  } catch (e) {}
})();
true;
`;
