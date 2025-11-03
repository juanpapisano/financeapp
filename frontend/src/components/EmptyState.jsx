export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
  tone = "brand",
}) {
  const toneMap = {
    brand: "bg-brand/20 text-brand",
    sky: "bg-sky-light/20 text-sky-light",
    neutral: "bg-base-dark/60 text-text-secondary",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/60 bg-base-card/70 px-6 py-8 text-center shadow-soft ${className}`}
    >
      {Icon && (
        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${toneMap[tone]}`}>
          <Icon size={22} />
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-text-secondary">{title}</p>
        {description && (
          <p className="text-xs text-text-muted">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 rounded-full border border-brand/60 px-4 py-2 text-xs font-semibold text-brand transition hover:bg-brand/10"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
