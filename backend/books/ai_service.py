"""
BookIQ AI Service — OpenAI Edition
- Generates summaries, genre classification, sentiment analysis
- RAG pipeline using ChromaDB + sentence-transformers
- Smart chunking for book descriptions
"""
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

_chroma_client    = None
_collection       = None
_embedder         = None
_openai_client    = None


def _get_groq():
    global _openai_client
    if _openai_client is None:
        from groq import Groq
        from django.conf import settings
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise ValueError("GROQ_API_KEY not set. Add it to backend/.env")
        _openai_client = Groq(api_key=api_key)
    return _openai_client


def _get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading sentence-transformers model...")
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model ready.")
    return _embedder


def _get_chroma_collection():
    global _chroma_client, _collection
    if _collection is None:
        import chromadb
        from django.conf import settings
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        _collection = _chroma_client.get_or_create_collection(
            name="books",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"ChromaDB ready. {_collection.count()} docs stored.")
    return _collection


# ── Smart Chunking ────────────────────────────────────────────────────────────

def smart_chunk(text: str, book_id: int, title: str,
                chunk_size: int = 300, overlap: int = 50) -> list[dict]:
    if not text or len(text.strip()) < 20:
        return []

    text = re.sub(r"\s+", " ", text).strip()

    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    if len(paragraphs) > 1:
        source_units  = paragraphs
        strategy_used = "paragraph"
    else:
        source_units  = re.split(r"(?<=[.!?])\s+", text)
        strategy_used = "sentence"

    if len(source_units) <= 1:
        source_units  = text.split()
        strategy_used = "word"

    chunks: list[str] = []
    current_chunk: list[str] = []
    current_len = 0

    for unit in source_units:
        unit_words = unit.split() if strategy_used != "word" else [unit]
        if current_len + len(unit_words) > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = current_chunk[-overlap:] if overlap else []
            current_len   = len(current_chunk)
        current_chunk.extend(unit_words)
        current_len += len(unit_words)

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    total = len(chunks)
    return [
        {
            "id": f"book_{book_id}_chunk_{i}",
            "text": chunk_text,
            "metadata": {
                "book_id":      str(book_id),
                "title":        title,
                "chunk_index":  i,
                "total_chunks": total,
                "strategy":     strategy_used,
            },
        }
        for i, chunk_text in enumerate(chunks)
    ]


# ── Embedding & Storage ───────────────────────────────────────────────────────

def store_book_embeddings(book_id: int, title: str, text: str) -> int:
    chunks = smart_chunk(text, book_id, title)
    if not chunks:
        return 0
    try:
        embedder   = _get_embedder()
        collection = _get_chroma_collection()

        texts     = [c["text"]     for c in chunks]
        ids       = [c["id"]       for c in chunks]
        metadatas = [c["metadata"] for c in chunks]

        try:
            existing = collection.get(where={"book_id": str(book_id)})
            if existing["ids"]:
                collection.delete(ids=existing["ids"])
        except Exception:
            pass

        embeddings = embedder.encode(texts, batch_size=32, show_progress_bar=False).tolist()
        collection.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
        logger.info(f"Stored {len(chunks)} chunks for book {book_id}")
        return len(chunks)
    except Exception as e:
        logger.error(f"Embedding storage failed: {e}")
        return 0


def similarity_search(query: str, n_results: int = 5,
                      book_id: Optional[int] = None) -> list[dict]:
    try:
        embedder   = _get_embedder()
        collection = _get_chroma_collection()

        count = collection.count()
        if count == 0:
            return []

        query_embedding = embedder.encode([query]).tolist()[0]
        where_filter    = {"book_id": str(book_id)} if book_id else None

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, count),
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        chunks = []
        if results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                chunks.append({
                    "id":       doc_id,
                    "text":     results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "score":    1 - results["distances"][0][i],
                })
        return chunks
    except Exception as e:
        logger.error(f"Similarity search failed: {e}")
        return []


# ── Groq wrapper ────────────────────────────────────────────────────────────

def _gpt(prompt: str, system: str = "", max_tokens: int = 500, history: list = None) -> str:
    """Call Groq ChatCompletion."""
    try:
        client = _get_groq()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        
        if history:
            messages.extend(history)
            
        messages.append({"role": "user", "content": prompt})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return ""


# ── AI Insight Generators ─────────────────────────────────────────────────────

def generate_summary(title: str, description: str) -> str:
    if not description:
        return ""
    prompt = (
        f'Book: "{title}"\nDescription: {description[:1500]}\n\n'
        "Write a concise 2-3 sentence summary capturing the main themes and appeal."
    )
    return _gpt(
        prompt,
        system="You are a literary expert who writes engaging, accurate book summaries.",
        max_tokens=200,
    )


def classify_genre(title: str, description: str) -> str:
    if not description:
        return "Fiction"
    prompt = (
        f'Book: "{title}"\nDescription: {description[:800]}\n\n'
        "Classify into exactly ONE genre from this list:\n"
        "Mystery, Science Fiction, Romance, Fantasy, Thriller, Horror, "
        "Historical Fiction, Self-Help, Biography, Children's Fiction, Poetry, "
        "Travel, Art, Music, Sports, Literary Fiction, Psychology, Philosophy, "
        "Business, Cooking\n\nReturn ONLY the genre name, nothing else."
    )
    result = _gpt(prompt, max_tokens=20)
    return result.split("\n")[0].strip() if result else "Fiction"


def analyze_sentiment(title: str, description: str) -> tuple[str, float]:
    if not description:
        return "Neutral", 0.0
    prompt = (
        f'Book: "{title}"\nDescription: {description[:800]}\n\n'
        'Analyze the emotional tone. Respond ONLY with valid JSON:\n'
        '{"sentiment": "Positive", "score": 0.7}\n\n'
        "Rules: sentiment must be exactly Positive, Neutral, or Negative. "
        "score is a float from -1.0 (very negative) to 1.0 (very positive)."
    )
    result = _gpt(prompt, max_tokens=80)
    try:
        import json
        match = re.search(r"\{.*?\}", result, re.DOTALL)
        if match:
            data  = json.loads(match.group())
            label = data.get("sentiment", "Neutral")
            score = float(data.get("score", 0.0))
            return label, max(-1.0, min(1.0, score))
    except Exception:
        pass
    return "Neutral", 0.0


def _extract_tags(title: str, description: str) -> list[str]:
    prompt = (
        f'Book: "{title}"\nDescription: {description[:500]}\n\n'
        "Extract 3-5 keyword tags for this book's themes.\n"
        "Return ONLY comma-separated words like: adventure, family, courage"
    )
    result = _gpt(prompt, max_tokens=50)
    if result:
        return [t.strip().lower() for t in result.split(",") if t.strip()][:5]
    return []


# ── Recommendations ───────────────────────────────────────────────────────────

def get_recommendations(book, all_books: list, n: int = 4) -> list:
    similar_ids: list[int] = []

    if book.description:
        try:
            chunks = similarity_search(
                query=f"{book.title} {book.description[:300]}",
                n_results=20,
            )
            seen: set[int] = set()
            for chunk in chunks:
                bid = int(chunk["metadata"]["book_id"])
                if bid != book.id and bid not in seen:
                    seen.add(bid)
                    similar_ids.append(bid)
                if len(similar_ids) >= n:
                    break
        except Exception as e:
            logger.warning(f"RAG recs failed: {e}")

    if len(similar_ids) < n:
        target = book.ai_genre or book.genre
        for b in all_books:
            if b.id != book.id and b.id not in similar_ids:
                if b.ai_genre == target or b.genre == target:
                    similar_ids.append(b.id)
            if len(similar_ids) >= n:
                break

    if len(similar_ids) < n:
        for b in sorted(all_books, key=lambda x: x.rating or 0, reverse=True):
            if b.id != book.id and b.id not in similar_ids:
                similar_ids.append(b.id)
            if len(similar_ids) >= n:
                break

    id_map = {b.id: b for b in all_books}
    return [id_map[bid] for bid in similar_ids if bid in id_map]


# ── RAG Pipeline ──────────────────────────────────────────────────────────────

def rag_query(question: str, book_id: Optional[int] = None, history: list = None) -> dict:
    """
    Full RAG pipeline:
    1. Embed question → similarity search in ChromaDB
    2. If good chunks found → build context → GPT answers with citations
    3. Fallback → answer from rich DB metadata directly via GPT
    """
    logger.info(f"RAG query: '{question}' (book_id={book_id})")

    contextual_query = question
    if history:
        recent = " ".join([m["content"] for m in history[-2:]])
        contextual_query = f"{recent} {question}"

    chunks = []
    if _embedder is not None:
        try:
            chunks = similarity_search(contextual_query, n_results=5, book_id=book_id)
        except Exception as e:
            logger.warning(f"Vector search error: {e}")
    else:
        logger.info("Embedder not loaded yet — skipping vector search, using metadata fallback.")

    good_chunks = [c for c in chunks if c.get("score", 0) >= 0.15]

    if good_chunks:
        context_parts: list[str] = []
        sources: list[dict]      = []
        seen: set[str]           = set()

        for chunk in good_chunks[:4]:
            meta = chunk["metadata"]
            context_parts.append(
                f'[Source: "{meta["title"]}" chunk {meta["chunk_index"]+1}]\n{chunk["text"]}'
            )
            if meta["book_id"] not in seen:
                seen.add(meta["book_id"])
                sources.append({
                    "book_id":         int(meta["book_id"]),
                    "title":           meta["title"],
                    "relevance_score": round(chunk["score"], 3),
                })

        context = "\n\n".join(context_parts)
        system  = (
            "You are BookIQ, an intelligent book assistant. "
            "Answer questions based on the book context provided. "
            "Cite which book your answer comes from. Be helpful and specific. "
            "IMPORTANT: Use clear formatting with line breaks, bullet points, and short paragraphs so your answer is easy to read. Do not output a single congested paragraph."
        )
        prompt  = f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer with source citations."
        answer  = _gpt(prompt, system=system, max_tokens=500, history=history)

        if answer:
            return {
                "answer":      answer,
                "sources":     sources,
                "chunks_used": len(context_parts),
                "method":      "rag",
            }

    return _fallback_answer(question, book_id, history=history)


def _fallback_answer(question: str, book_id: Optional[int], history: list = None) -> dict:
    """Answer from book metadata — works without any embeddings stored."""
    from .models import Book

    try:
        if book_id:
            try:
                books_qs = list(Book.objects.filter(id=book_id))
            except Exception:
                books_qs = list(Book.objects.all()[:15])
        else:
            books_qs = list(Book.objects.all()[:15])

        if not books_qs:
            return {
                "answer": (
                    "No books found in the library. "
                    "Please add books using the scraper on the Dashboard or the Add Book page."
                ),
                "sources": [], "chunks_used": 0, "method": "fallback",
            }

        context_lines = []
        for b in books_qs:
            parts = [f'Title: "{b.title}"']
            if b.author and b.author != "Unknown":
                parts.append(f"Author: {b.author}")
            genre = b.ai_genre or b.genre
            if genre:
                parts.append(f"Genre: {genre}")
            if b.rating:
                parts.append(f"Rating: {b.rating}/5")
            if b.ai_sentiment:
                parts.append(f"Tone: {b.ai_sentiment}")
            if b.ai_summary:
                parts.append(f"Summary: {b.ai_summary}")
            elif b.description:
                parts.append(f"Description: {b.description[:400]}")
            if b.ai_tags:
                parts.append(f"Themes: {', '.join(b.ai_tags)}")
            context_lines.append(" | ".join(parts))

        context = "\n".join(context_lines)
        system  = (
            "You are BookIQ, a knowledgeable and friendly book assistant. "
            "Answer the user's question using the library data provided. "
            "Be specific — reference actual book titles, authors, genres and themes. "
            "IMPORTANT: Use clear formatting with line breaks, bullet points, and short paragraphs so your answer is easy to read. Do not output a single congested paragraph. Never say you cannot answer."
        )
        prompt  = (
            f"Book library:\n\n{context}\n\n"
            f"User question: {question}\n\n"
            "Give a specific, helpful answer referencing actual books from the library above."
        )

        answer = _gpt(prompt, system=system, max_tokens=500, history=history)

        if not answer:
            return {
                "answer": (
                    "Could not generate a response. "
                    "Please check that GROQ_API_KEY is correctly set in backend/.env "
                    "and restart the Django server."
                ),
                "sources": [], "chunks_used": 0, "method": "error",
            }

        sources = [
            {
                "book_id":         b.id,
                "title":           b.title,
                "relevance_score": 0.0,
                "author":          b.author,
                "cover_image":     b.cover_image,
                "book_url":        b.book_url,
            }
            for b in books_qs[:5]
        ]

        return {
            "answer":      answer,
            "sources":     sources,
            "chunks_used": 0,
            "method":      "metadata-fallback",
        }

    except Exception as e:
        logger.error(f"_fallback_answer error: {e}")
        return {
            "answer": (
                f"Error: {e}. "
                "Make sure GROQ_API_KEY is set in backend/.env and restart the server."
            ),
            "sources": [], "chunks_used": 0, "method": "error",
        }


# ── Bulk insight generation ───────────────────────────────────────────────────

def generate_all_insights(book) -> dict:
    updates: dict = {}
    desc  = book.description or ""
    title = book.title
    logger.info(f"Generating AI insights for: {title}")

    summary = generate_summary(title, desc)
    if summary:
        updates["ai_summary"] = summary

    genre = classify_genre(title, desc)
    if genre:
        updates["ai_genre"] = genre

    label, score = analyze_sentiment(title, desc)
    updates["ai_sentiment"]       = label
    updates["ai_sentiment_score"] = score

    if desc:
        updates["ai_tags"] = _extract_tags(title, desc)

    return updates