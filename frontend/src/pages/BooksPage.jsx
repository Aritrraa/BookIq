import React, { useEffect, useState, useCallback } from "react";
import { getBooks, getGenres } from "../services/api";
import BookCard from "../components/BookCard";
import { SectionHeading, Spinner, ErrorBox, EmptyState, SkeletonCard } from "../components/ui";

const SORTS = [
  { value:"-scraped_at", label:"Newest First" },
  { value:"scraped_at",  label:"Oldest First" },
  { value:"-rating",     label:"Highest Rated" },
  { value:"rating",      label:"Lowest Rated" },
  { value:"title",       label:"A → Z" },
  { value:"-title",      label:"Z → A" },
];
const SENTIMENTS = ["", "Positive", "Neutral", "Negative"];

export default function BooksPage() {
  const [books, setBooks]       = useState([]);
  const [genres, setGenres]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [genre, setGenre]       = useState("");
  const [sentiment, setSentiment] = useState("");
  const [sort, setSort]         = useState("-scraped_at");
  const [minRating, setMinRating] = useState("");

  const loadBooks = useCallback(() => {
    setLoading(true); setError("");
    const params = { sort };
    if (search) params.search = search;
    if (genre) params.genre = genre;
    if (sentiment) params.sentiment = sentiment;
    if (minRating) params.min_rating = minRating;
    getBooks(params)
      .then(data => { setBooks(data.results || []); setTotal(data.count || 0); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, genre, sentiment, sort, minRating]);

  useEffect(() => { loadBooks(); }, [loadBooks]);
  useEffect(() => { getGenres().then(setGenres).catch(() => {}); }, []);

  const clearFilters = () => { setSearch(""); setGenre(""); setSentiment(""); setSort("-scraped_at"); setMinRating(""); };
  const hasFilters = search || genre || sentiment || minRating;

  return (
    <div className="page-container animate-fade-in">
      <SectionHeading title="Book Library" subtitle={`${total} book${total !== 1 ? "s" : ""} in your collection`} />

      {/* Filters */}
      <div className="card" style={{ padding:"1.25rem", marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--text-3)", fontSize:"1rem" }}>⌕</span>
          <input className="input" style={{ paddingLeft:36 }} placeholder="Search by title…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
          <select className="input" style={{ width:"auto", flex:"1 1 140px" }} value={genre} onChange={e => setGenre(e.target.value)}>
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="input" style={{ width:"auto", flex:"1 1 140px" }} value={sentiment} onChange={e => setSentiment(e.target.value)}>
            {SENTIMENTS.map(s => <option key={s} value={s}>{s || "All Tones"}</option>)}
          </select>
          <select className="input" style={{ width:"auto", flex:"1 1 130px" }} value={minRating} onChange={e => setMinRating(e.target.value)}>
            <option value="">Any Rating</option>
            {[1,2,3,4,5].map(r => <option key={r} value={r}>★ {r}+ stars</option>)}
          </select>
          <select className="input" style={{ width:"auto", flex:"1 1 150px" }} value={sort} onChange={e => setSort(e.target.value)}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasFilters && <button onClick={clearFilters} className="btn-ghost" style={{ fontSize:"0.875rem" }}>✕ Clear</button>}
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={loadBooks} />}

      {loading && (
        <div className="grid-books">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && !error && books.length === 0 && (
        <EmptyState
          icon="🔍"
          title={hasFilters ? "No books match your filters" : "No books yet"}
          subtitle={hasFilters ? "Try adjusting or clearing your filters." : "Use the scraper on the Dashboard or upload a book manually."}
          action={hasFilters ? <button onClick={clearFilters} className="btn-secondary">Clear filters</button> : null}
        />
      )}

      {!loading && books.length > 0 && (
        <div className="grid-books">
          {books.map(b => <BookCard key={b.id} book={b} />)}
        </div>
      )}
    </div>
  );
}
