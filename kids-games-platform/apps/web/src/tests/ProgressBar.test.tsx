import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../components/flashcards/ProgressBar.js';

describe('ProgressBar', () => {
  it('displays known/total text', () => {
    render(<ProgressBar known={3} total={10} />);
    expect(screen.getByText('3/10 known')).toBeTruthy();
  });

  it('sets progressbar aria attributes', () => {
    render(<ProgressBar known={5} total={20} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('5');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('20');
  });

  it('handles zero total without errors', () => {
    render(<ProgressBar known={0} total={0} />);
    expect(screen.getByText('0/0 known')).toBeTruthy();
  });

  it('shows 100% width style when all known', () => {
    render(<ProgressBar known={10} total={10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('style')).toContain('100%');
  });
});
