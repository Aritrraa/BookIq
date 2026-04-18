import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStats, triggerScrape } from "../services/api";
import { StatCard, SectionHeading, Spinner, ErrorBox, BookCover } from "../components/ui";
import BookCard from "../components/BookCard";

function GenreBar({ genre, count, total }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 text-xs w-32 truncate shrink-0">{genre}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-slate-500 text-xs font-mono w-6 text-right">{count}</span>
    </div>
  );
}

function ScrapePanel({ onDone }) {
  const [pages, setPages] = useState(3);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleScrape = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await triggerScrape(pages);
      setMsg(`✓ ${res.message} — check back in a minute.`);
      setTimeout(onDone, 5000);
    } catch (e) {
      setMsg(`✗ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 border-dashed border-brand-700/50">
      <p className="text-slate-300 font-medium mb-3">🕷 Scrape books.toscrape.com</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-slate-500 text-xs whitespace-nowrap">Pages (1–10):</label>
          <input
            type="number" min={1} max={10} value={pages}
            onChange={(e) => setPages(Number(e.target.value))}
            className="input w-20 text-center"
          />
        </div>
        <button onClick={handleScrape} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Spinner size="sm" /> : "▶"}
          {loading ? "Starting…" : "Start Scrape"}
        </button>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto mt-12 px-4">
      <ErrorBox message={error} onRetry={load} />
    </div>
  );

  const genres = Object.entries(stats?.genre_distribution || {});
  const totalGenre = genres.reduce((s, [, c]) => s + c, 0);
  const sentiments = stats?.sentiment_distribution || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10 animate-fade-in">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-slate-900 to-slate-950 border border-brand-800/50 p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(64,96,240,0.15),transparent_60%)]" />
        <div className="relative z-10 max-w-2xl">
          <p className="badge-blue mb-4">AI-Powered Document Intelligence</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Discover Books<br />
            <span className="text-brand-400">Intelligently</span>
          </h1>
          <p className="text-slate-400 text-lg mb-6">
            RAG-powered Q&A, AI insights, genre classification, and smart recommendations across your entire book library.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/ask" className="btn-primary flex items-center gap-2">
              ✦ Ask BookIQ
            </Link>
            <Link to="/books" className="btn-secondary flex items-center gap-2">
              📚 Browse Library
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Books"     value={stats?.total_books ?? 0}            icon="📚" color="blue"   />
        <StatCard label="With AI Insights" value={stats?.books_with_ai ?? 0}         icon="✦"  color="purple" />
        <StatCard label="With Embeddings" value={stats?.books_with_embeddings ?? 0}  icon="🔍" color="green"  />
        <StatCard label="Avg Rating"      value={stats?.avg_rating ?? "—"}           icon="★"  color="amber"  />
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Genre distribution */}
        <div className="card p-6 space-y-4">
          <h3 className="font-serif font-bold text-white">Genre Distribution</h3>
          {genres.length === 0 ? (
            <p className="text-slate-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {genres.map(([g, c]) => (
                <GenreBar key={g} genre={g} count={c} total={totalGenre} />
              ))}
            </div>
          )}
        </div>

        {/* Sentiment breakdown */}
        <div className="card p-6 space-y-4">
          <h3 className="font-serif font-bold text-white">Tone Analysis</h3>
          <div className="space-y-3">
            {[
              { label: "Positive", key: "Positive", cls: "bg-green-500",  icon: "↑" },
              { label: "Neutral",  key: "Neutral",  cls: "bg-slate-500",  icon: "→" },
              { label: "Negative", key: "Negative", cls: "bg-red-500",    icon: "↓" },
            ].map(({ label, key, cls, icon }) => {
              const count = sentiments[key] || 0;
              const total = Object.values(sentiments).reduce((a, b) => a + b, 0) || 1;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-20 shrink-0">{icon} {label}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full ${cls} rounded-full transition-all duration-700`} style={{ width: `${(count/total)*100}%` }} />
                  </div>
                  <span className="text-slate-500 text-xs font-mono w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="border-t border-slate-800 pt-4 space-y-2">
            <p className="label">Quick Actions</p>
            <Link to="/ask" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors py-1">
              <span className="text-brand-400">✦</span> Ask a question about your books
            </Link>
            <Link to="/upload" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors py-1">
              <span className="text-brand-400">＋</span> Add a book manually
            </Link>
          </div>
        </div>

        {/* Scrape panel */}
        <div className="space-y-4">
          <ScrapePanel onDone={load} />
          <div className="card p-4">
            <p className="label mb-3">RAG Pipeline</p>
            <div className="space-y-2">
              {[
                { step: "1", label: "Scrape & Store", done: (stats?.total_books ?? 0) > 0 },
                { step: "2", label: "Generate AI Insights", done: (stats?.books_with_ai ?? 0) > 0 },
                { step: "3", label: "Build Embeddings", done: (stats?.books_with_embeddings ?? 0) > 0 },
                { step: "4", label: "Query with RAG", done: false },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-2.5 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0
                    ${s.done ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-500"}`}>
                    {s.done ? "✓" : s.step}
                  </span>
                  <span className={s.done ? "text-slate-300" : "text-slate-500"}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent books */}
      {stats?.recent_books?.length > 0 && (
        <div>
          <SectionHeading
            title="Recently Added"
            subtitle="Latest books in the library"
            action={<Link to="/books" className="btn-ghost text-sm">View all →</Link>}
          />
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.recent_books.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}
