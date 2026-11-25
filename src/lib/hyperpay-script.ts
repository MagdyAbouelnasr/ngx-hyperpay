export type HyperpayMode = 'test' | 'live';
export type HyperpayRegion = 'global' | 'eu';

/** The only hosts the widget script is ever loaded from. */
const HOSTS: Record<HyperpayRegion, Record<HyperpayMode, string>> = {
  global: { test: 'https://test.oppwa.com', live: 'https://oppwa.com' },
  eu: { test: 'https://eu-test.oppwa.com', live: 'https://eu-prod.oppwa.com' },
};

export function hyperpayScriptUrl(
  checkoutId: string,
  mode: HyperpayMode,
  region: HyperpayRegion,
): string {
  // Anything but an explicit "live" stays on the test host.
  const host = HOSTS[region === 'eu' ? 'eu' : 'global'][mode === 'live' ? 'live' : 'test'];
  return `${host}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(checkoutId)}`;
}

/** True for a script that HyperPay put on the page, whichever of its hosts it came from. */
export function isHyperpayScript(src: string): boolean {
  try {
    const { hostname } = new URL(src);
    return hostname === 'oppwa.com' || hostname.endsWith('.oppwa.com');
  } catch {
    return false;
  }
}

/** The value of a query parameter exactly as it is in the address, null when it is missing or empty. */
export function rawQueryParam(search: string, name: string): string | null {
  const pair = search
    .replace(/^\?/, '')
    .split('&')
    .find(part => part.startsWith(`${name}=`));
  return pair?.slice(name.length + 1) || null;
}

/** The decoded value, or the raw one when it is not valid percent-encoding. */
export function decodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
