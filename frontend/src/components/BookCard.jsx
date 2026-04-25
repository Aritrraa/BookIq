import React from "react";
import { Link } from "react-router-dom";
import { StarRating, SentimentBadge, GenreBadge, BookCover } from "./ui";

export default function BookCard({ book }) {
  const genre = book.ai_genre || book.genre;
  const summary = book.ai_summary || book.description;

  return (
    <Link to={`/books/${book.id}`} style={{ textDecoration:"none", display:"block" }} className="book-card-link">
      <div className="card-hover" style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Cover */}
        <div style={{ position:"relative", overflow:"hidden" }}>
          <BookCover src={book.cover_image} title={book.title}
            style={{ width:"100%", height:180, transition:"transform .3s" }}
          />
          {book.price && (
            <span style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,.7)", backdropFilter:"blur(4px)", color:"#fff", fontSize:"0.7rem", fontFamily:"'JetBrains Mono',monospace", padding:"2px 8px", borderRadius:6 }}>
              {book.price}
            </span>
          )}
          {book.ai_sentiment && (
            <span style={{ position:"absolute", bottom:8, left:8 }}>
              <SentimentBadge sentiment={book.ai_sentiment} />
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding:"14px 14px 16px", display:"flex", flexDirection:"column", gap:8, flex:1 }}>
          {genre && <GenreBadge genre={genre} />}
          <h3 className="font-serif line-clamp-2" style={{ fontWeight:700, color:"var(--text-1)", fontSize:"0.975rem", lineHeight:1.35 }}>
            {book.title}
          </h3>
          <p style={{ color:"var(--text-3)", fontSize:"0.75rem" }}>{book.author || "Unknown Author"}</p>
          <StarRating rating={book.rating} />
          {summary && (
            <p className="line-clamp-2" style={{ color:"var(--text-3)", fontSize:"0.75rem", lineHeight:1.5, marginTop:"auto", paddingTop:4 }}>
              {summary}
            </p>
          )}
        </div>
      </div>
      <style>{`.book-card-link:hover img{transform:scale(1.05);}`}</style>
    </Link>
  );
}
