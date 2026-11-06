import { PesoPipe } from './peso-pipe';

describe('PesoPipe', () => {
  const pipe = new PesoPipe();

  it('shows whole pesos without decimals', () => {
    expect(pipe.transform(35)).toBe('₱35');
  });

  it('shows centavos with two decimals', () => {
    expect(pipe.transform(37.5)).toBe('₱37.50');
  });

  it('treats null as zero', () => {
    expect(pipe.transform(null)).toBe('₱0');
  });
});
