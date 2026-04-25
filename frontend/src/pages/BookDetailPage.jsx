import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getBook, getRecommendations } from "../services/api";
import { StarRating, SentimentBadge, GenreBadge, BookCover, TagList, Spinner, ErrorBox, EmptyState } from "../components/ui";
import BookCard from "../components/BookCard";

function InsightRow({ label, children }) {
  return (
    <div style={{ padding:"14px 0", borderBottom:"1px solid var(--border)" }}>
      <p className="label" style={{ marginBottom:8 }}>{label}</p>
      <div style={{ color:"var(--text-2)", fontSize:"0.875rem", lineHeight:1.6 }}>{children}</div>
    </div>
  );
}

function ScoreBar({ score }) {
  const pct = ((score + 1) / 2) * 100;
  const color = score > 0.2 ? "var(--green)" : score < -0.2 ? "var(--red)" : "var(--text-3)";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8 }}>
      <span style={{ fontSize:"0.7rem", color:"var(--text-3)", width:20, textAlign:"right" }}>-1</span>
      <div style={{ flex:1, background:"var(--bg-2)", borderRadius:99, height:6, position:"relative" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:1, height:"100%", background:"var(--border)" }} />
        <div style={{ position:"absolute", top:0, height:"100%", width:"6%", background:color, borderRadius:99, left:`${Math.min(pct-3,94)}%`, transition:"left .7s" }} />
      </div>
      <span style={{ fontSize:"0.7rem", color:"var(--text-3)", width:20 }}>+1</span>
      <span style={{ fontSize:"0.72rem", fontFamily:"'JetBrains Mono',monospace", color:"var(--text-2)" }}>{score?.toFixed(2)}</span>
    </div>
  );
}

export default function BookDetailPage() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    Promise.all([getBook(id), getRecommendations(id)])
      .then(([b, r]) => { setBook(b); setRecs(r.recommendations || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"50vh" }}><Spinner size="lg" /></div>;
  if (error) return <div style={{ maxWidth:520, margin:"3rem auto", padding:"0 1rem" }}><ErrorBox message={error} /></div>;
  if (!book) return <EmptyState icon="📚" title="Book not found" />;

  const genre = book.ai_genre || book.genre;

  return (
    <div className="page-container animate-fade-in">
      <Link to="/books" className="btn-ghost" style={{ marginBottom:24, display:"inline-flex" }}>← Back to Library</Link>

      {/* Main layout */}
      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:"2rem" }}>
        {/* Left */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card" style={{ overflow:"hidden" }}>
            <BookCover src={book.cover_image} title={book.title} style={{ width:"100%", height:340 }} />
          </div>
          <div className="card" style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:12, fontSize:"0.875rem" }}>
            {book.price && (
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-3)" }}>Price</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:600, color:"var(--text-1)" }}>{book.price}</span>
              </div>
            )}
            {book.availability && (
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-3)" }}>Availability</span>
                <span style={{ color:"var(--green)", fontSize:"0.78rem" }}>{book.availability}</span>
              </div>
            )}
            {book.num_reviews > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-3)" }}>Reviews</span>
                <span style={{ color:"var(--text-2)" }}>{book.num_reviews}</span>
              </div>
            )}
            <Link to={`/ask?book_id=${book.id}&title=${encodeURIComponent(book.title)}`} className="btn-primary" style={{ marginTop:4, width:"100%", justifyContent:"center" }}>
              ✦ Ask about this book
            </Link>
            {book.book_url && book.book_url !== "https://books.toscrape.com/" && (
              <a href={book.book_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ width:"100%", justifyContent:"center", fontSize:"0.78rem" }}>
                View on Source ↗
              </a>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
          <div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
              {genre && <GenreBadge genre={genre} />}
              {book.ai_sentiment && <SentimentBadge sentiment={book.ai_sentiment} />}
            </div>
            <h1 className="font-serif" style={{ fontSize:"clamp(1.6rem,3vw,2.5rem)", fontWeight:800, color:"var(--text-1)", lineHeight:1.2, marginBottom:8 }}>
              {book.title}
            </h1>
            <p style={{ color:"var(--text-3)", fontSize:"1rem", marginBottom:12 }}>by {book.author || "Unknown Author"}</p>
            <StarRating rating={book.rating} size="lg" />
          </div>

          {book.description && (
            <div className="card" style={{ padding:"1.25rem" }}>
              <p className="label" style={{ marginBottom:10 }}>Description</p>
              <p style={{ color:"var(--text-2)", lineHeight:1.7, fontSize:"0.9rem" }}>{book.description}</p>
            </div>
          )}

          <div className="card" style={{ padding:"1.25rem" }}>
            <h2 className="font-serif" style={{ fontWeight:700, color:"var(--text-1)", marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:"var(--brand)" }}>✦</span> AI Insights
            </h2>
            <InsightRow label="AI Summary">
              {book.ai_summary || <span style={{ color:"var(--text-3)", fontStyle:"italic" }}>Not generated yet.</span>}
            </InsightRow>
            <InsightRow label="Genre Classification">
              {genre ? <GenreBadge genre={genre} /> : <span style={{ color:"var(--text-3)", fontStyle:"italic" }}>Unclassified</span>}
            </InsightRow>
            <InsightRow label="Sentiment Analysis">
              <SentimentBadge sentiment={book.ai_sentiment} />
              {book.ai_sentiment_score != null && <ScoreBar score={book.ai_sentiment_score} />}
            </InsightRow>
            {book.ai_tags?.length > 0 && (
              <InsightRow label="Thematic Tags"><TagList tags={book.ai_tags} /></InsightRow>
            )}
            <InsightRow label="Embeddings">
              <span style={{ color: book.embeddings_stored ? "var(--green)" : "var(--text-3)" }}>
                {book.embeddings_stored ? "✓ Stored in ChromaDB — RAG ready" : "✗ Not yet embedded"}
              </span>
            </InsightRow>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <div style={{ marginTop:"3rem" }}>
          <h2 className="font-serif" style={{ fontSize:"1.6rem", fontWeight:700, color:"var(--text-1)", marginBottom:6 }}>If you like this, you'll like…</h2>
          <p style={{ color:"var(--text-3)", fontSize:"0.875rem", marginBottom:"1.5rem" }}>Recommended based on genre and embedding similarity</p>
          <div className="grid-books">
            {recs.map(b => <BookCard key={b.id} book={b} />)}
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:700px){
          .detail-grid{grid-template-columns:1fr!important}
        }
      `}</style>
    </div>
  );
}
