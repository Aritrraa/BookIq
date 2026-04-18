import React from "react";
import { Link } from "react-router-dom";
import { StarRating, SentimentBadge, GenreBadge, BookCover } from "./ui";

export default function BookCard({ book }) {
  const genre = book.ai_genre || book.genre;
  const summary = book.ai_summary || book.description;

  return (
    <Link to={`/books/${book.id}`} className="block group">
      <div className="card-hover h-full flex flex-col overflow-hidden">
        {/* Cover */}
        <div className="relative overflow-hidden">
          <BookCover
            src={book.cover_image}
            title={book.title}
            className="w-full h-44 group-hover:scale-105 transition-transform duration-300"
          />
          {/* Price badge */}
          {book.price && (
            <span className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-xs font-mono px-2 py-0.5 rounded-lg">
              {book.price}
            </span>
          )}
          {/* Sentiment */}
          {book.ai_sentiment && (
            <span className="absolute bottom-2 left-2">
              <SentimentBadge sentiment={book.ai_sentiment} />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          {/* Genre */}
          {genre && <GenreBadge genre={genre} />}

          {/* Title */}
          <h3 className="font-serif font-bold text-white text-base leading-snug line-clamp-2 group-hover:text-brand-300 transition-colors">
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-slate-500 text-xs">{book.author || "Unknown Author"}</p>

          {/* Rating */}
          <StarRating rating={book.rating} />

          {/* AI Summary */}
          {summary && (
            <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 mt-auto pt-1">
              {summary}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
