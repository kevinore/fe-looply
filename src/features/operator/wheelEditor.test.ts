import type { CatalogPrize } from '@/api/types';
import {
  activeTotal,
  distributeEvenly,
  formatPercent,
  newDraftPrize,
  parsePercent,
  percentInput,
  prizeProblems,
  toDraft,
  prizeCategories,
  rewardSummary,
  toRequest,
  wheelProblems,
} from './wheelEditor';

function prize(over: Partial<CatalogPrize> = {}): CatalogPrize {
  return {
    id: 'p1',
    name: '10% de descuento',
    short_label: '10% dto',
    type: 'percent_off',
    value: 10,
    max_value_cop: 16000,
    category_id: null,
    weight: 40,
    expires_days: 90,
    color: 'primary',
    sort_order: 1,
    active: true,
    awarded: false,
    ...over,
  };
}

// The seeded wheel: relative weights 40/25/20/10/5.
const SEEDED = [
  prize(),
  prize({ id: 'p2', name: 'Topping', short_label: 'Topping', type: 'extra_item', value: 0, max_value_cop: null, weight: 25 }),
  prize({ id: 'p3', name: '20%', short_label: '20% dto', value: 20, weight: 20 }),
  prize({ id: 'p4', name: '50%', short_label: '50% dto', value: 50, weight: 10 }),
  prize({ id: 'p5', name: 'Gratis', short_label: 'Gratis', type: 'free_item', value: 0, weight: 5 }),
];

describe('percent text', () => {
  it('parses commas and dots with up to 2 decimals', () => {
    expect(parsePercent('37,5')).toBe(3750);
    expect(parsePercent('37.25')).toBe(3725);
    expect(parsePercent(' 100 ')).toBe(10000);
    expect(parsePercent('0,01')).toBe(1);
  });
  it('rejects anything else', () => {
    for (const bad of ['', 'abc', '1,234', '100,01', '-5', '12%']) expect(parsePercent(bad)).toBeNull();
  });
  it('formats in Spanish', () => {
    expect(formatPercent(3750)).toBe('37,5 %');
    expect(formatPercent(10000)).toBe('100 %');
    expect(percentInput(1)).toBe('0,01');
  });
});

describe('toDraft', () => {
  it('turns relative weights into percentages adding up to 100 %', () => {
    const rows = toDraft(SEEDED);
    expect(rows.map((r) => r.weight)).toEqual([4000, 2500, 2000, 1000, 500]);
    expect(activeTotal(rows)).toBe(10000);
  });
  it('fixes rounding on the largest prize', () => {
    const rows = toDraft([prize({ weight: 1 }), prize({ id: 'b', name: 'b', weight: 1 }), prize({ id: 'c', name: 'c', weight: 1 })]);
    expect(rows.map((r) => r.weight)).toEqual([3334, 3333, 3333]);
  });
  it('keeps a wheel that already adds up to 100 %', () => {
    const rows = toDraft([prize({ weight: 7500 }), prize({ id: 'b', name: 'b', weight: 2500 }), prize({ id: 'c', name: 'c', weight: 9, active: false })]);
    expect(rows.map((r) => r.weight)).toEqual([7500, 2500, 9]);
  });
});

describe('rules', () => {
  it('a clean wheel has no problems', () => {
    expect(wheelProblems(toDraft(SEEDED))).toEqual([]);
  });
  it('reports what is missing to reach 100 %', () => {
    const rows = toDraft(SEEDED);
    rows[0]!.weight = 2750;
    expect(wheelProblems(rows)).toEqual(['Faltan 12,5 % para llegar a 100 %.']);
  });
  it('needs 2 to 12 active prizes', () => {
    const rows = toDraft(SEEDED).map((r, i) => ({ ...r, active: i === 0, weight: 10000 }));
    expect(wheelProblems(rows)[0]).toMatch(/entre 2 y 12/);
  });
  it('checks each prize', () => {
    const rows = toDraft(SEEDED);
    const dup = { ...newDraftPrize(), name: '10% DE DESCUENTO', short_label: 'x'.repeat(15), value: 0 };
    expect(prizeProblems(dup, [...rows, dup])).toEqual([
      'Ya hay un premio con ese nombre.',
      'El texto de la ruleta debe tener entre 1 y 14 caracteres.',
      'El descuento debe estar entre 1 % y 100 %.',
    ]);
  });
  it('splits evenly among active prizes', () => {
    const rows = distributeEvenly(toDraft(SEEDED).map((r, i) => (i === 4 ? { ...r, active: false } : r)));
    expect(rows.map((r) => r.weight)).toEqual([2500, 2500, 2500, 2500, 500]);
    const three = distributeEvenly(toDraft(SEEDED.slice(0, 3)));
    expect(three.map((r) => r.weight)).toEqual([3334, 3333, 3333]);
  });
});

it('builds the request in wheel order, normalizing the reward', () => {
  const rows = toDraft(SEEDED);
  rows[1]!.max_value_cop = 9000; // extra items are never capped
  const fresh = { ...newDraftPrize(), name: ' Galleta ', short_label: 'Galleta', type: 'free_item' as const, value: 5 };
  const body = toRequest([fresh, ...rows]);
  expect(body.prizes[0]).toMatchObject({ id: null, name: 'Galleta', value: 0, type: 'free_item' });
  expect(body.prizes[2]).toMatchObject({ id: 'p2', max_value_cop: null });
  expect(body.prizes.map((p) => p.id)).toEqual([null, 'p1', 'p2', 'p3', 'p4', 'p5']);
});

it('keeps the category a prize applies to', () => {
  const rows = toDraft([prize({ category_id: 'ice' }), prize({ id: 'p2', name: 'Otro' })]);
  expect(rows.map((r) => r.category_id)).toEqual(['ice', null]);
  expect(toRequest(rows).prizes.map((p) => p.category_id)).toEqual(['ice', null]);
});

it('lists the categories of the products, once and in order', () => {
  const products = [
    { category_id: 'd', category: 'Bebidas' },
    { category_id: null, category: null },
    { category_id: 'i', category: 'Helados' },
    { category_id: 'd', category: 'Bebidas' },
  ];
  expect(prizeCategories(products)).toEqual([
    { id: 'd', name: 'Bebidas' },
    { id: 'i', name: 'Helados' },
  ]);
});

it('summarizes the reward with its category', () => {
  const cop = (n: number) => `$${n}`;
  expect(rewardSummary({ type: 'free_item', value: 0, max_value_cop: 5000 }, cop, 'Helados')).toBe(
    'Producto gratis · tope $5000 · Helados',
  );
  expect(rewardSummary({ type: 'percent_off', value: 20, max_value_cop: null }, cop)).toBe('20 % de descuento');
});
