import type { Card } from '@kids-games/shared';

interface Props {
  card: Card;
  isKnown: boolean;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onToggleKnown: () => void;
}

export function FlashCard({
  card,
  isKnown,
  index,
  total,
  onNext,
  onPrev,
  onToggleKnown,
}: Props) {
  const hasImage = !!card.imagePath;
  const hasAudio = !!card.audioPath;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Counter */}
      <p className="text-sm text-slate-500 tabular-nums">
        Card <span className="font-semibold text-slate-700">{index + 1}</span> of{' '}
        <span className="font-semibold text-slate-700">{total}</span>
      </p>

      {/* Card face */}
      <div className="w-full max-w-sm rounded-3xl shadow-lg overflow-hidden border-2 border-slate-100 bg-white aspect-[4/3] flex flex-col">
        {/* Image area */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
          {hasImage ? (
            <img
              src={card.imagePath!}
              alt={card.term}
              className="max-h-full max-w-full object-contain rounded-2xl"
            />
          ) : (
            <div className="text-8xl select-none">{card.term[0]}</div>
          )}
        </div>

        {/* Term */}
        <div className="bg-white px-6 py-4 text-center border-t border-slate-100">
          <p className="text-2xl font-bold text-slate-800">{card.term}</p>
          {card.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-2">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3 w-full max-w-sm">
        {/* Audio button */}
        <button
          className="btn-secondary p-2.5 rounded-xl"
          disabled={!hasAudio}
          title={hasAudio ? 'Play audio' : 'Audio coming soon'}
          aria-label="Play audio"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-4.5-9a4.5 4.5 0 000 6" />
          </svg>
        </button>

        {/* Known toggle */}
        <button
          onClick={onToggleKnown}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isKnown
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-white border border-slate-300 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
          }`}
        >
          <svg className="w-4 h-4" fill={isKnown ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {isKnown ? 'Known!' : 'Mark as known'}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 w-full max-w-sm">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="btn-secondary flex-1"
          aria-label="Previous card"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        <button
          onClick={onNext}
          disabled={index === total - 1}
          className="btn-primary flex-1"
          aria-label="Next card"
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
