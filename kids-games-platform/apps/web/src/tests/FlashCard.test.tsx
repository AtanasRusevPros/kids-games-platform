import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlashCard } from '../components/flashcards/FlashCard.js';
import type { Card } from '@kids-games/shared';

const baseCard: Card = {
  id: 'card-1',
  deckId: 'deck-1',
  term: 'Cat',
  imagePath: null,
  audioPath: null,
  tags: ['animal'],
};

const defaultProps = {
  card: baseCard,
  isKnown: false,
  index: 1,
  total: 5,
  onNext: vi.fn(),
  onPrev: vi.fn(),
  onToggleKnown: vi.fn(),
};

describe('FlashCard', () => {
  it('renders the card term', () => {
    render(<FlashCard {...defaultProps} />);
    expect(screen.getByText('Cat')).toBeTruthy();
  });

  it('shows first character of term when no imagePath', () => {
    render(<FlashCard {...defaultProps} card={{ ...baseCard, imagePath: null }} />);
    expect(screen.getByText('C')).toBeTruthy();
  });

  it('renders an img when imagePath is provided', () => {
    render(<FlashCard {...defaultProps} card={{ ...baseCard, imagePath: '/img/cat.svg' }} />);
    const img = screen.getByRole('img', { name: /cat/i });
    expect(img).toBeTruthy();
    expect((img as HTMLImageElement).src).toContain('/img/cat.svg');
  });

  it('shows card counter with correct position', () => {
    render(<FlashCard {...defaultProps} index={1} total={5} />);
    // index 1 → "Card 2 of 5"
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('renders tags', () => {
    render(<FlashCard {...defaultProps} card={{ ...baseCard, tags: ['animal', 'pet'] }} />);
    expect(screen.getByText('animal')).toBeTruthy();
    expect(screen.getByText('pet')).toBeTruthy();
  });

  it('renders no tag elements when tags array is empty', () => {
    const { container } = render(
      <FlashCard {...defaultProps} card={{ ...baseCard, tags: [] }} />,
    );
    expect(container.querySelectorAll('.rounded-full').length).toBe(0);
  });

  it('audio button is disabled when audioPath is null', () => {
    render(<FlashCard {...defaultProps} card={{ ...baseCard, audioPath: null }} />);
    const audioBtn = screen.getByRole('button', { name: /play audio/i });
    expect((audioBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('audio button is enabled when audioPath is provided', () => {
    render(
      <FlashCard {...defaultProps} card={{ ...baseCard, audioPath: '/audio/cat.mp3' }} />,
    );
    const audioBtn = screen.getByRole('button', { name: /play audio/i });
    expect((audioBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows "Mark as known" when isKnown is false', () => {
    render(<FlashCard {...defaultProps} isKnown={false} />);
    expect(screen.getByText(/mark as known/i)).toBeTruthy();
  });

  it('shows "Known!" when isKnown is true', () => {
    render(<FlashCard {...defaultProps} isKnown={true} />);
    expect(screen.getByText(/known!/i)).toBeTruthy();
  });

  it('calls onToggleKnown when known button is clicked', () => {
    const onToggleKnown = vi.fn();
    render(<FlashCard {...defaultProps} onToggleKnown={onToggleKnown} />);
    fireEvent.click(screen.getByText(/mark as known/i));
    expect(onToggleKnown).toHaveBeenCalledTimes(1);
  });

  it('Prev button is disabled when index is 0', () => {
    render(<FlashCard {...defaultProps} index={0} />);
    const prevBtn = screen.getByRole('button', { name: /previous card/i });
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('Prev button is enabled when index > 0', () => {
    render(<FlashCard {...defaultProps} index={1} />);
    const prevBtn = screen.getByRole('button', { name: /previous card/i });
    expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('Next button is disabled when at last card', () => {
    render(<FlashCard {...defaultProps} index={4} total={5} />);
    const nextBtn = screen.getByRole('button', { name: /next card/i });
    expect((nextBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('Next button is enabled when not at last card', () => {
    render(<FlashCard {...defaultProps} index={3} total={5} />);
    const nextBtn = screen.getByRole('button', { name: /next card/i });
    expect((nextBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls onPrev when Prev button is clicked', () => {
    const onPrev = vi.fn();
    render(<FlashCard {...defaultProps} index={2} onPrev={onPrev} />);
    fireEvent.click(screen.getByRole('button', { name: /previous card/i }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when Next button is clicked', () => {
    const onNext = vi.fn();
    render(<FlashCard {...defaultProps} index={2} total={5} onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: /next card/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
