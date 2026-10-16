import { displayProgress, estimateDiscount, prizeAppliesTo } from './api';

describe('displayProgress (matches backend build_card)', () => {
  it('no purchases: empty, every purchase to go', () => {
    expect(displayProgress(0, 5)).toEqual({ progress: 0, every: 5, remaining: 5 });
  });
  it('mid-cycle', () => {
    expect(displayProgress(3, 5)).toEqual({ progress: 3, every: 5, remaining: 2 });
    expect(displayProgress(7, 5)).toEqual({ progress: 2, every: 5, remaining: 3 });
  });
  it('on a milestone shows full, not 0', () => {
    expect(displayProgress(5, 5)).toEqual({ progress: 5, every: 5, remaining: 5 });
    expect(displayProgress(10, 5)).toEqual({ progress: 5, every: 5, remaining: 5 });
  });
  it('unknown milestone size → null', () => {
    expect(displayProgress(3, null)).toBeNull();
    expect(displayProgress(3, 0)).toBeNull();
  });
});

const drink = (price_cop: number) => ({ price_cop });

describe('estimateDiscount (display only)', () => {
  it('percent of one unit', () => {
    expect(estimateDiscount({ type: 'percent_off', value: 10, max_value_cop: 16000 }, drink(14000))).toBe(1400);
  });
  it('is capped by max_value_cop', () => {
    expect(estimateDiscount({ type: 'percent_off', value: 50, max_value_cop: 5000 }, drink(16000))).toBe(5000);
    expect(estimateDiscount({ type: 'free_item', value: 0, max_value_cop: 12000 }, drink(16000))).toBe(12000);
  });
  it('free drink without cap is the drink price', () => {
    expect(estimateDiscount({ type: 'free_item', value: 0, max_value_cop: null }, drink(14000))).toBe(14000);
  });
  it('extra item costs nothing; no product → no estimate', () => {
    expect(estimateDiscount({ type: 'extra_item', value: 0, max_value_cop: null }, drink(14000))).toBe(0);
    expect(estimateDiscount({ type: 'percent_off', value: 10, max_value_cop: null }, undefined)).toBeNull();
  });
});

describe('prizeAppliesTo (matches backend applies_to)', () => {
  const ice = { prize_eligible: true, category_id: 'ice' };
  it('a prize without category applies to any product that takes prizes', () => {
    expect(prizeAppliesTo({ category_id: null }, ice)).toBe(true);
    expect(prizeAppliesTo({ category_id: null }, { ...ice, prize_eligible: false })).toBe(false);
  });
  it('a prize with category applies only to that category', () => {
    expect(prizeAppliesTo({ category_id: 'ice' }, ice)).toBe(true);
    expect(prizeAppliesTo({ category_id: 'drinks' }, ice)).toBe(false);
    expect(prizeAppliesTo({ category_id: 'ice' }, { ...ice, prize_eligible: false })).toBe(false);
  });
});
