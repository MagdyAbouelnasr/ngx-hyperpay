import { decodeParam, hyperpayScriptUrl, isHyperpayScript, rawQueryParam } from './hyperpay-script';

describe('hyperpay-script', () => {
  it('picks the host from the mode and the region', () => {
    const url = (mode: 'test' | 'live', region: 'global' | 'eu') =>
      new URL(hyperpayScriptUrl('1', mode, region)).origin;

    expect(url('test', 'global')).toBe('https://test.oppwa.com');
    expect(url('live', 'global')).toBe('https://oppwa.com');
    expect(url('test', 'eu')).toBe('https://eu-test.oppwa.com');
    expect(url('live', 'eu')).toBe('https://eu-prod.oppwa.com');
  });

  it('never leaves the known hosts, and stays on test for an unknown mode', () => {
    expect(new URL(hyperpayScriptUrl('1', 'x' as never, 'evil' as never)).origin).toBe(
      'https://test.oppwa.com',
    );
  });

  it('keeps a checkout id inside its own parameter', () => {
    const url = new URL(hyperpayScriptUrl('a&b=c#d', 'test', 'global'));

    expect(url.searchParams.get('checkoutId')).toBe('a&b=c#d');
    expect([...url.searchParams.keys()]).toEqual(['checkoutId']);
    expect(url.hash).toBe('');
  });

  it('knows the scripts of HyperPay by their host', () => {
    expect(isHyperpayScript('https://eu-test.oppwa.com/v1/static/static.min.js')).toBe(true);
    expect(isHyperpayScript('https://oppwa.com/x.js')).toBe(true);
    expect(isHyperpayScript('https://notoppwa.com/static.min.js')).toBe(false);
    expect(isHyperpayScript('https://oppwa.com.evil.test/static.min.js')).toBe(false);
    expect(isHyperpayScript('')).toBe(false);
  });

  it('reads a parameter as it is in the address', () => {
    expect(rawQueryParam('?a=1&id=x%25', 'id')).toBe('x%25');
    expect(rawQueryParam('?id=a=b', 'id')).toBe('a=b');
    expect(rawQueryParam('?myid=1', 'id')).toBeNull();
    expect(rawQueryParam('?id=', 'id')).toBeNull();
    expect(rawQueryParam('', 'id')).toBeNull();
  });

  it('decodes what it can', () => {
    expect(decodeParam('x%25')).toBe('x%');
    expect(decodeParam('x%')).toBe('x%');
  });
});
