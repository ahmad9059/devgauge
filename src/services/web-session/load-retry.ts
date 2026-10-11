/** Automatic reloads after a failed sign-in page load, before showing an error. */
export const MAX_LOAD_RETRIES = 3;

const BASE_DELAY_MS = 1_500;
const MAX_DELAY_MS = 6_000;

/** Backoff before retry number `attempt` (1-based): 1.5s, 3s, 6s. */
export function loadRetryDelayMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** exponent);
}

type LoadErrorKind = 'offline' | 'dns' | 'interrupted' | 'secure' | 'unknown';

function classify(description: string | undefined): LoadErrorKind {
  const text = (description ?? '').toUpperCase();
  if (/INTERNET_DISCONNECTED|NETWORK_CHANGED|NETWORK_IO_SUSPENDED/.test(text))
    return 'offline';
  if (/NAME_NOT_RESOLVED|NAME_RESOLUTION_FAILED|DNS_/.test(text)) return 'dns';
  if (/SSL_|CERT_|BAD_SSL/.test(text)) return 'secure';
  if (
    /CONNECTION_(RESET|CLOSED|REFUSED|TIMED_OUT|FAILED|ABORTED)|TIMED_OUT|EMPTY_RESPONSE|SOCKET_NOT_CONNECTED|PROXY_|TUNNEL_/.test(
      text,
    )
  )
    return 'interrupted';
  return 'unknown';
}

/** Transient network failures are worth reloading; certificate problems are not. */
export function isRetryableLoadError(description: string | undefined): boolean {
  return classify(description) !== 'secure';
}

export type LoadErrorMessage = { title: string; description: string };

export function describeLoadError(
  host: string,
  description: string | undefined,
): LoadErrorMessage {
  switch (classify(description)) {
    case 'offline':
      return {
        title: 'You appear to be offline',
        description:
          'Check your Wi-Fi or mobile data connection, then tap Reload.',
      };
    case 'dns':
      return {
        title: `Can't find ${host}`,
        description:
          'The address could not be looked up. Check your connection, turn off Private DNS or a VPN if you use one, then tap Reload.',
      };
    case 'interrupted':
      return {
        title: `Can't reach ${host}`,
        description:
          'The connection was interrupted before the page loaded. Some networks, VPNs and Private DNS settings block or drop this site. Try switching between Wi-Fi and mobile data, or turn off your VPN, then tap Reload.',
      };
    case 'secure':
      return {
        title: 'Secure connection failed',
        description:
          "This page's security certificate could not be verified. Check that your device date and time are correct and that you are not on a network that intercepts traffic, then tap Reload.",
      };
    default:
      return {
        title: `Can't load ${host}`,
        description:
          'The page failed to load. Check your connection, then tap Reload.',
      };
  }
}
