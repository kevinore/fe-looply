import { formatPhoneInput, isValidColombianMobile, phoneDigits } from './phone';

describe('formatPhoneInput', () => {
  it.each([
    ['', ''],
    ['3', '3'],
    ['310', '310'],
    ['3101', '310 1'],
    ['310123', '310 123'],
    ['3101234', '310 123 4'],
    ['3101234567', '310 123 4567'],
    ['310 123 4567', '310 123 4567'],
    ['31012345678999', '310 123 4567'],
    ['(310) 123-4567', '310 123 4567'],
  ])('%s → %s', (raw, out) => expect(formatPhoneInput(raw)).toBe(out));
});

describe('isValidColombianMobile', () => {
  it.each(['3101234567', '310 123 4567', '300-000-0000'])('accepts %s', (v) =>
    expect(isValidColombianMobile(v)).toBe(true),
  );
  it.each(['', '31012345', '6011234567', '31012345678', '2101234567'])('rejects %s', (v) =>
    expect(isValidColombianMobile(v)).toBe(false),
  );
});

it('phoneDigits caps at 10', () => expect(phoneDigits('+57 310 123 4567')).toBe('5731012345'));
