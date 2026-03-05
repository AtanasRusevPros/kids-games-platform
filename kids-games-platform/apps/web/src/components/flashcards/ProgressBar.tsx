interface Props {
  known: number;
  total: number;
}

export function ProgressBar({ known, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((known / total) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={known}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
      <span className="text-xs font-medium text-slate-500 shrink-0 tabular-nums">
        {known}/{total} known
      </span>
    </div>
  );
}
