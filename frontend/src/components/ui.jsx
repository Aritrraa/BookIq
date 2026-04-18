import React from "react";

// ── Stars ────────────────────────────────────────────────────────────────────
export function StarRating({ rating, max = 5, size = "sm" }) {
  const sz = size === "lg" ? "text-lg" : "text-sm";
  return (
    <div className={`flex items-center gap-0.5 ${sz}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < Math.round(rating) ? "text-amber-400" : "text-slate-700"}>
          ★
        </span>
      ))}
      {rating != null && (
        <span className="ml-1 text-slate-400 text-xs font-mono">{Number(rating).toFixed(1)}</span>
      )}
    </div>
  );
}

// ── Sentiment badge ───────────────────────────────────────────────────────────
export function SentimentBadge({ sentiment }) {
  if (!sentiment) return null;
  const map = {
    Positive: "badge-green",
    Negative: "badge-red",
    Neutral:  "badge-slate",
  };
  const icons = { Positive: "↑", Negative: "↓", Neutral: "→" };
  return (
    <span className={map[sentiment] || "badge-slate"}>
      {icons[sentiment]} {sentiment}
    </span>
  );
}

// ── Genre badge ───────────────────────────────────────────────────────────────
export function GenreBadge({ genre }) {
  if (!genre) return null;
  return <span className="badge-blue">{genre}</span>;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = "md", className = "" }) {
  const sz = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" }[size];
  return (
    <div className={`${sz} border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin ${className}`} />
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = "📚", title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="text-5xl">{icon}</div>
      <div>
        <p className="text-slate-200 font-medium text-lg">{title}</p>
        {subtitle && <p className="text-slate-500 text-sm mt-1 max-w-xs">{subtitle}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ── Error box ─────────────────────────────────────────────────────────────────
export function ErrorBox({ message, onRetry }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
      <span className="text-red-400 text-lg mt-0.5">⚠</span>
      <div className="flex-1">
        <p className="text-red-300 text-sm">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-red-400 hover:text-red-300 text-xs mt-2 underline">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

// ── Book cover ────────────────────────────────────────────────────────────────
export function BookCover({ src, title, className = "" }) {
  const [err, setErr] = React.useState(false);
  if (err || !src) {
    return (
      <div className={`bg-gradient-to-br from-brand-800 to-slate-800 flex items-center justify-center ${className}`}>
        <span className="text-3xl">📖</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={title}
      className={`object-cover ${className}`}
      onError={() => setErr(true)}
    />
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color = "blue" }) {
  const colors = {
    blue:   "from-brand-600/20 to-brand-800/10 border-brand-700/40 text-brand-400",
    green:  "from-green-600/20 to-green-800/10 border-green-700/40 text-green-400",
    amber:  "from-amber-600/20 to-amber-800/10 border-amber-700/40 text-amber-400",
    purple: "from-purple-600/20 to-purple-800/10 border-purple-700/40 text-purple-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="label mb-1">{label}</p>
          <p className="text-3xl font-bold text-white font-mono">{value}</p>
        </div>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
export function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse space-y-3">
      <div className="w-full h-40 bg-slate-800 rounded-xl" />
      <div className="h-4 bg-slate-800 rounded w-3/4" />
      <div className="h-3 bg-slate-800 rounded w-1/2" />
      <div className="h-3 bg-slate-800 rounded w-2/3" />
    </div>
  );
}

// ── Tag pills ─────────────────────────────────────────────────────────────────
export function TagList({ tags = [] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t} className="badge-slate"># {t}</span>
      ))}
    </div>
  );
}
