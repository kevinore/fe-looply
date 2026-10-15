import { longWeekdayDate, shortDate, shortDateYear, shortWeekdayDate } from './dates';

describe('dates (Bogotá)', () => {
  it('short formats match the mockups', () => {
    expect(shortWeekdayDate(new Date('2026-09-27T15:00:00Z'))).toBe('Domingo 27 sep');
    expect(shortDate('2026-11-12T15:00:00Z')).toBe('12 nov');
    expect(shortDateYear('2027-01-02T15:00:00Z')).toBe('2 ene 2027');
  });
  it('long format keeps "de"', () => {
    expect(longWeekdayDate('2026-10-04')).toBe('Domingo 4 de octubre');
  });
});
