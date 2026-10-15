import { hourRange, PAYMENT_METHODS, paymentLabel } from './labels';

it.each([
  [15, '3–4 pm'],
  [9, '9–10 am'],
  [11, '11 am–12 pm'],
  [12, '12–1 pm'],
  [23, '11 pm–12 am'],
  [0, '12–1 am'],
])('hourRange(%i) → %s', (h, out) => expect(hourRange(h)).toBe(out));

describe('payment methods', () => {
  it('offers transfer, cash and card for new sales', () => {
    expect(PAYMENT_METHODS.map((m) => m.label)).toEqual(['Transferencia', 'Efectivo', 'Datáfono']);
  });

  it('labels old Nequi / Bre-B sales as transfers', () => {
    expect(paymentLabel('transfer')).toBe('Transferencia');
    expect(paymentLabel('nequi')).toBe('Transferencia');
    expect(paymentLabel('breb')).toBe('Transferencia');
    expect(paymentLabel('card')).toBe('Datáfono');
    expect(paymentLabel('other')).toBe('Otro medio');
  });
});
