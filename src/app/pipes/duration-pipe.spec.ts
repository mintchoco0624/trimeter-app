import { DurationPipe } from './duration-pipe';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('formats minutes and seconds', () => {
    expect(pipe.transform(75)).toBe('1:15');
  });

  it('formats hours', () => {
    expect(pipe.transform(3725)).toBe('1:02:05');
  });
});
