import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStats, triggerScrape } from "../services/api";
import { StatCard, SectionHeading, Spinner, ErrorBox } from "../components/ui";
import BookCard from "../components/BookCard";

function GenreBar({ genre, count, total }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <span style={{ color:"var(--text-2)", fontSize:"0.78rem", width:120, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{genre}</span>
      <div style={{ flex:1, background:"var(--bg-2)", borderRadius:99, height:6, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,var(--brand),#79aafb)", borderRadius:99, transition:"width .7s" }} />
      </div>
      <span style={{ color:"var(--text-3)", fontSize:"0.72rem", fontFamily:"'JetBrains Mono',monospace", width:20, textAlign:"right" }}>{count}</span>
    </div>
  );
}

function ScrapePanel({ onDone }) {
  const [pages, setPages] = useState(3);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleScrape = async () => {
    setLoading(true); setMsg("");
    try {
      const res = await triggerScrape(pages);
      setMsg(`✓ ${res.message} — check back soon.`);
      setTimeout(onDone, 5000);
    } catch (e) { setMsg(`✗ ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div className="card" style={{ padding:"1.25rem", borderStyle:"dashed", borderColor:"rgba(79,134,247,.3)" }}>
      <p style={{ color:"var(--text-1)", fontWeight:600, marginBottom:12 }}>🕷 Scrape books.toscrape.com</p>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
          <label style={{ color:"var(--text-3)", fontSize:"0.75rem", whiteSpace:"nowrap" }}>Pages (1–10):</label>
          <input type="number" min={1} max={10} value={pages} onChange={e => setPages(Number(e.target.value))} className="input" style={{ width:70, textAlign:"center" }} />
        </div>
        <button onClick={handleScrape} disabled={loading} className="btn-primary" style={{ display:"flex", alignItems:"center", gap:8 }}>
          {loading ? <Spinner size="sm" /> : "▶"} {loading ? "Starting…" : "Start Scrape"}
        </button>
      </div>
      {msg && <p style={{ marginTop:10, fontSize:"0.85rem", color: msg.startsWith("✓") ? "var(--green)" : "var(--red)" }}>{msg}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getStats().then(setStats).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"50vh" }}><Spinner size="lg" /></div>;
  if (error) return <div style={{ maxWidth:520, margin:"3rem auto", padding:"0 1rem" }}><ErrorBox message={error} onRetry={load} /></div>;

  const genres = Object.entries(stats?.genre_distribution || {});
  const totalGenre = genres.reduce((s, [, c]) => s + c, 0);
  const sentiments = stats?.sentiment_distribution || {};
  const sentimentRows = [
    { label:"Positive", key:"Positive", color:"var(--green)",  icon:"↑" },
    { label:"Neutral",  key:"Neutral",  color:"var(--text-3)", icon:"→" },
    { label:"Negative", key:"Negative", color:"var(--red)",    icon:"↓" },
  ];

  return (
    <div className="page-container animate-fade-in" style={{ display:"flex", flexDirection:"column", gap:"2.5rem" }}>
      {/* Hero */}
      <div style={{
        position:"relative", overflow:"hidden", borderRadius:"var(--radius-xl)",
        background:"linear-gradient(135deg,#0d1b40,var(--bg-1),var(--bg))",
        border:"1px solid rgba(79,134,247,.2)", padding:"3rem 2.5rem",
      }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at top left,rgba(79,134,247,.12),transparent 60%)", pointerEvents:"none" }} />
        <div style={{ position:"relative", maxWidth:580 }}>
          <span className="badge badge-blue" style={{ marginBottom:16 }}>AI-Powered Book Intelligence</span>
          <h1 className="font-serif" style={{ fontSize:"clamp(2rem,5vw,3.2rem)", fontWeight:800, color:"var(--text-1)", lineHeight:1.15, marginBottom:16 }}>
            Discover Books<br/><span style={{ color:"var(--brand)" }}>Intelligently</span>
          </h1>
          <p style={{ color:"var(--text-2)", fontSize:"1.05rem", marginBottom:24, lineHeight:1.6 }}>
            RAG-powered Q&A, AI insights, genre classification and smart recommendations across your library.
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
            <Link to="/ask" className="btn-primary">✦ Ask BookIQ</Link>
            <Link to="/books" className="btn-secondary">📚 Browse Library</Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4">
        <StatCard label="Total Books"     value={stats?.total_books ?? 0}           icon="📚" color="blue"   />
        <StatCard label="With AI Insights" value={stats?.books_with_ai ?? 0}         icon="✦"  color="purple" />
        <StatCard label="With Embeddings" value={stats?.books_with_embeddings ?? 0}  icon="🔍" color="green"  />
        <StatCard label="Avg Rating"      value={stats?.avg_rating ?? "—"}           icon="★"  color="amber"  />
      </div>

      {/* Main grid */}
      <div className="grid-3">
        {/* Genre distribution */}
        <div className="card" style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:16 }}>
          <h3 className="font-serif" style={{ fontWeight:700, color:"var(--text-1)" }}>Genre Distribution</h3>
          {genres.length === 0
            ? <p style={{ color:"var(--text-3)", fontSize:"0.875rem" }}>No data yet</p>
            : <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {genres.map(([g, c]) => <GenreBar key={g} genre={g} count={c} total={totalGenre} />)}
              </div>
          }
        </div>

        {/* Sentiment */}
        <div className="card" style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:16 }}>
          <h3 className="font-serif" style={{ fontWeight:700, color:"var(--text-1)" }}>Tone Analysis</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {sentimentRows.map(({ label, key, color, icon }) => {
              const count = sentiments[key] || 0;
              const total = Object.values(sentiments).reduce((a,b) => a+b, 0) || 1;
              return (
                <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ color:"var(--text-2)", fontSize:"0.75rem", width:80, flexShrink:0 }}>{icon} {label}</span>
                  <div style={{ flex:1, background:"var(--bg-2)", borderRadius:99, height:6, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(count/total)*100}%`, background:color, borderRadius:99, transition:"width .7s" }} />
                  </div>
                  <span style={{ color:"var(--text-3)", fontSize:"0.72rem", fontFamily:"'JetBrains Mono',monospace", width:20, textAlign:"right" }}>{count}</span>
                </div>
              );
            })}
          </div>
          <hr className="separator" />
          <p className="label">Quick Actions</p>
          <Link to="/ask" style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.875rem", color:"var(--text-3)", textDecoration:"none", padding:"4px 0" }}>
            <span style={{ color:"var(--brand)" }}>✦</span> Ask about your books
          </Link>
          <Link to="/upload" style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.875rem", color:"var(--text-3)", textDecoration:"none", padding:"4px 0" }}>
            <span style={{ color:"var(--brand)" }}>＋</span> Add a book manually
          </Link>
        </div>

        {/* Scrape + RAG steps */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <ScrapePanel onDone={load} />
          <div className="card" style={{ padding:"1.25rem" }}>
            <p className="label" style={{ marginBottom:12 }}>RAG Pipeline</p>
            {[
              { step:"1", label:"Scrape & Store",       done:(stats?.total_books ?? 0) > 0 },
              { step:"2", label:"Generate AI Insights",  done:(stats?.books_with_ai ?? 0) > 0 },
              { step:"3", label:"Build Embeddings",      done:(stats?.books_with_embeddings ?? 0) > 0 },
              { step:"4", label:"Query with RAG",        done:false },
            ].map(s => (
              <div key={s.step} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <span style={{
                  width:22, height:22, borderRadius:"50%", flexShrink:0, fontSize:"0.7rem",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: s.done ? "rgba(63,185,80,.15)" : "var(--bg-2)",
                  color: s.done ? "var(--green)" : "var(--text-3)",
                  border: `1px solid ${s.done ? "rgba(63,185,80,.3)" : "var(--border)"}`,
                }}>{s.done ? "✓" : s.step}</span>
                <span style={{ fontSize:"0.85rem", color: s.done ? "var(--text-2)" : "var(--text-3)" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent books */}
      {stats?.recent_books?.length > 0 && (
        <div>
          <SectionHeading
            title="Recently Added"
            subtitle="Latest books in the library"
            action={<Link to="/books" className="btn-ghost" style={{ fontSize:"0.875rem" }}>View all →</Link>}
          />
          <div className="grid-books">
            {stats.recent_books.map(b => <BookCard key={b.id} book={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}
