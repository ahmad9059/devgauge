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
