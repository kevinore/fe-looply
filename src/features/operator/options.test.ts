import type { OptionGroup } from '@/api/types';
import { groupHint, isValidSelection, lineKey, toggleOption, unitPrice } from './options';

const base: OptionGroup = {
  id: 'g1',
  name: 'Base',
  min_select: 1,
  max_select: 1,
  options: [
    { id: 'yog', name: 'Yogurt griego', price_delta_cop: 0 },
    { id: 'ave', name: 'Avena', price_delta_cop: 1000 },
  ],
};
const toppings: OptionGroup = {
  id: 'g2',
  name: 'Toppings',
  min_select: 0,
  max_select: 2,
  options: [
    { id: 'chia', name: 'Chía', price_delta_cop: 500 },
    { id: 'gra', name: 'Granola', price_delta_cop: 500 },
    { id: 'coco', name: 'Coco', price_delta_cop: 500 },
  ],
};

describe('product options', () => {
  it('line key ignores option order', () => {
    expect(lineKey('p', ['b', 'a'])).toBe(lineKey('p', ['a', 'b']));
    expect(lineKey('p')).toBe('p');
  });

  it('validates min/max per group and rejects options from other groups', () => {
    expect(isValidSelection([base], [])).toBe(false);
    expect(isValidSelection([base], ['ave'])).toBe(true);
    expect(isValidSelection([base], ['ave', 'yog'])).toBe(false);
    expect(isValidSelection([base], ['ave', 'chia'])).toBe(false);
    expect(isValidSelection([base, toppings], ['yog'])).toBe(true);
    expect(isValidSelection([base, toppings], ['yog', 'chia', 'gra', 'coco'])).toBe(false);
    expect(isValidSelection([], [])).toBe(true);
  });

  it('single-choice groups replace; multi-choice groups add up to max', () => {
    expect(toggleOption(base, ['yog'], 'ave')).toEqual(['ave']);
    expect(toggleOption(base, ['ave'], 'ave')).toEqual(['ave']);
    let sel = toggleOption(toppings, ['yog'], 'chia');
    sel = toggleOption(toppings, sel, 'gra');
    expect(toggleOption(toppings, sel, 'coco')).toEqual(['yog', 'chia', 'gra']);
    expect(toggleOption(toppings, sel, 'chia')).toEqual(['yog', 'gra']);
  });

  it('unit price adds option prices; hints read naturally', () => {
    expect(unitPrice({ price_cop: 14000, option_groups: [base, toppings] }, ['ave', 'chia'])).toBe(
      15500,
    );
    expect(groupHint(base)).toBe('Elige 1');
    expect(groupHint(toppings)).toBe('Opcional · hasta 2');
    expect(groupHint({ min_select: 1, max_select: 3 })).toBe('Elige de 1 a 3');
  });
});
