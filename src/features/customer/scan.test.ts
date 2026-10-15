import { claimTokenFromQr } from './scan';

const O = 'https://app.example.com';

describe('claimTokenFromQr', () => {
  it('accepts same-origin claim URLs', () => {
    expect(claimTokenFromQr(`${O}/c/claim/abc_DEF-123`, O)).toBe('abc_DEF-123');
    expect(claimTokenFromQr(`${O}/c/claim/abc/`, O)).toBe('abc');
  });
  it.each([
    'https://evil.example.com/c/claim/abc',
    `${O}/c/claim/`,
    `${O}/c/prize/abc`,
    `${O}/c/claim/abc/extra`,
    'hola',
    '',
    'javascript:alert(1)',
  ])('rejects %s', (v) => expect(claimTokenFromQr(v, O)).toBeNull());
});
