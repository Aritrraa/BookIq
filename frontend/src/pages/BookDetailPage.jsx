import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getBook, getRecommendations } from "../services/api";
import { StarRating, SentimentBadge, GenreBadge, BookCover, TagList, Spinner, ErrorBox, EmptyState } from "../components/ui";
import BookCard from "../components/BookCard";

function InsightRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-slate-800 last:border-0">
      <span className="label">{label}</span>
      <div className="text-slate-200 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function ScoreBar({ score }) {
  // score: -1 to 1
  const pct = ((score + 1) / 2) * 100;
  const color = score > 0.2 ? "bg-green-500" : score < -0.2 ? "bg-red-500" : "bg-slate-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-12 text-right">-1</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2 relative">
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-600" />
        <div
          className={`absolute top-0 h-full ${color} rounded-full transition-all duration-700`}
          style={{ left: `${Math.min(pct - 2, 98)}%`, width: "4%" }}
        />
      </div>
      <span className="text-xs text-slate-500 w-12">+1</span>
      <span className="text-xs font-mono text-slate-400">{score?.toFixed(2)}</span>
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
    setLoading(true);
    setError("");
    Promise.all([getBook(id), getRecommendations(id)])
      .then(([b, r]) => { setBook(b); setRecs(r.recommendations || []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto mt-12 px-4">
      <ErrorBox message={error} />
    </div>
  );

  if (!book) return <EmptyState icon="📚" title="Book not found" />;

  const genre = book.ai_genre || book.genre;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">

      {/* Back */}
      <Link to="/books" className="btn-ghost text-sm inline-flex items-center gap-1 mb-6">
        ← Back to Library
      </Link>

      {/* Main layout */}
      <div className="grid md:grid-cols-3 gap-8">

        {/* Left: Cover + meta */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <BookCover
              src={book.cover_image}
              title={book.title}
              className="w-full h-72 md:h-80"
            />
          </div>

          {/* Metadata card */}
          <div className="card p-4 space-y-3 text-sm">
            {book.price && (
              <div className="flex justify-between">
                <span className="text-slate-500">Price</span>
                <span className="text-white font-mono font-medium">{book.price}</span>
              </div>
            )}
            {book.availability && (
              <div className="flex justify-between">
                <span className="text-slate-500">Availability</span>
                <span className="text-green-400 text-xs">{book.availability}</span>
              </div>
            )}
            {book.num_reviews > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Reviews</span>
                <span className="text-slate-300">{book.num_reviews}</span>
              </div>
            )}
            {book.book_url && book.book_url !== "https://books.toscrape.com/" && (
              <a
                href={book.book_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center btn-secondary text-xs mt-2"
              >
                View on Source ↗
              </a>
            )}
            <Link
              to={`/ask?book_id=${book.id}&title=${encodeURIComponent(book.title)}`}
              className="block w-full text-center btn-primary text-sm"
            >
              ✦ Ask about this book
            </Link>
          </div>
        </div>

        {/* Right: Details + AI insights */}
        <div className="md:col-span-2 space-y-6">

          {/* Title block */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {genre && <GenreBadge genre={genre} />}
              {book.ai_sentiment && <SentimentBadge sentiment={book.ai_sentiment} />}
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-white leading-tight mb-2">
              {book.title}
            </h1>
            <p className="text-slate-400 text-lg mb-3">by {book.author || "Unknown Author"}</p>
            <StarRating rating={book.rating} size="lg" />
          </div>

          {/* Description */}
          {book.description && (
            <div className="card p-5">
              <h2 className="label mb-3">Description</h2>
              <p className="text-slate-300 leading-relaxed text-sm">{book.description}</p>
            </div>
          )}

          {/* AI Insights */}
          <div className="card p-5">
            <h2 className="font-serif font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">✦</span> AI Insights
            </h2>

            <div>
              {book.ai_summary ? (
                <InsightRow label="AI Summary">
                  {book.ai_summary}
                </InsightRow>
              ) : (
                <InsightRow label="AI Summary">
                  <span className="text-slate-500 italic">Not generated yet. Trigger a scrape or re-process.</span>
                </InsightRow>
              )}

              <InsightRow label="Genre Classification">
                {genre
                  ? <GenreBadge genre={genre} />
                  : <span className="text-slate-500 italic">Unclassified</span>
                }
              </InsightRow>

              <InsightRow label="Sentiment Analysis">
                <div className="space-y-2">
                  <SentimentBadge sentiment={book.ai_sentiment} />
                  {book.ai_sentiment_score != null && (
                    <ScoreBar score={book.ai_sentiment_score} />
                  )}
                </div>
              </InsightRow>

              {book.ai_tags?.length > 0 && (
                <InsightRow label="Thematic Tags">
                  <TagList tags={book.ai_tags} />
                </InsightRow>
              )}

              <InsightRow label="Embeddings">
                <span className={book.embeddings_stored ? "text-green-400" : "text-slate-500"}>
                  {book.embeddings_stored ? "✓ Stored in ChromaDB — RAG ready" : "✗ Not yet embedded"}
                </span>
              </InsightRow>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif text-2xl font-bold text-white mb-2">
            If you like this, you'll like…
          </h2>
          <p className="text-slate-400 text-sm mb-6">Recommended based on genre and embedding similarity</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recs.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}
