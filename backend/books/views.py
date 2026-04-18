"""
BookIQ REST API Views
GET  /api/books/           - List all books (with filtering/search)
GET  /api/books/<id>/      - Book detail
GET  /api/books/<id>/recommendations/ - Related books
POST /api/books/           - Upload/create a book
POST /api/books/scrape/    - Trigger scraping
POST /api/books/ask/       - RAG Q&A
GET  /api/books/stats/     - Dashboard stats
"""
import logging
import threading

from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Book, ScrapeLog
from .serializers import (
    BookCreateSerializer, BookDetailSerializer,
    BookListSerializer, QuestionSerializer, ScrapeLogSerializer,
)

logger = logging.getLogger(__name__)


class BookListCreateView(APIView):
    """GET all books | POST create a book."""

    def get(self, request):
        books = Book.objects.all()

        # Filtering
        genre = request.query_params.get("genre")
        sentiment = request.query_params.get("sentiment")
        search = request.query_params.get("search")
        min_rating = request.query_params.get("min_rating")
        sort = request.query_params.get("sort", "-scraped_at")

        if genre:
            books = books.filter(ai_genre__icontains=genre)
        if sentiment:
            books = books.filter(ai_sentiment__iexact=sentiment)
        if search:
            books = books.filter(title__icontains=search)
        if min_rating:
            try:
                books = books.filter(rating__gte=float(min_rating))
            except ValueError:
                pass

        # Sorting
        allowed_sorts = ["title", "-title", "rating", "-rating", "-scraped_at", "scraped_at"]
        if sort in allowed_sorts:
            books = books.order_by(sort)

        serializer = BookListSerializer(books, many=True)
        return Response({
            "count": books.count(),
            "results": serializer.data,
        })

    def post(self, request):
        """Manually upload a book and generate AI insights."""
        serializer = BookCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        book = serializer.save()

        # Generate AI insights asynchronously
        threading.Thread(target=_process_book_ai, args=(book.id,), daemon=True).start()

        return Response(BookDetailSerializer(book).data, status=status.HTTP_201_CREATED)


class BookDetailView(APIView):
    """GET full book details."""

    def get(self, request, pk):
        try:
            book = Book.objects.get(pk=pk)
        except Book.DoesNotExist:
            return Response({"error": "Book not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = BookDetailSerializer(book)
        return Response(serializer.data)


class BookRecommendationsView(APIView):
    """GET recommended books similar to a given book."""

    def get(self, request, pk):
        try:
            book = Book.objects.get(pk=pk)
        except Book.DoesNotExist:
            return Response({"error": "Book not found"}, status=status.HTTP_404_NOT_FOUND)

        # Cache recommendations for 1 hour
        cache_key = f"recs_{pk}"
        cached = cache.get(cache_key)
        if cached:
            return Response({"book_id": pk, "recommendations": cached})

        from .ai_service import get_recommendations
        all_books = list(Book.objects.all())
        recs = get_recommendations(book, all_books, n=4)
        rec_data = BookListSerializer(recs, many=True).data

        cache.set(cache_key, rec_data, 3600)
        return Response({"book_id": pk, "recommendations": rec_data})


class AskView(APIView):
    """POST a question — full RAG pipeline."""

    def post(self, request):
        serializer = QuestionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        question = serializer.validated_data["question"]
        book_id = serializer.validated_data.get("book_id")

        # Cache identical questions
        cache_key = f"qa_{hash(question)}_{book_id}"
        cached = cache.get(cache_key)
        if cached:
            cached["cached"] = True
            return Response(cached)

        from .ai_service import rag_query
        result = rag_query(question, book_id=book_id)

        # Enrich sources with full book data
        if result.get("sources"):
            enriched = []
            for src in result["sources"]:
                try:
                    b = Book.objects.get(id=src["book_id"])
                    enriched.append({
                        **src,
                        "author": b.author,
                        "cover_image": b.cover_image,
                        "book_url": b.book_url,
                    })
                except Book.DoesNotExist:
                    enriched.append(src)
            result["sources"] = enriched

        result["question"] = question
        result["cached"] = False
        cache.set(cache_key, result, 1800)  # cache 30 mins
        return Response(result)


class ScrapeView(APIView):
    """POST to trigger web scraping."""

    def post(self, request):
        max_pages = min(int(request.data.get("max_pages", 3)), 10)
        use_selenium = request.data.get("use_selenium", False)

        log = ScrapeLog.objects.create(status="running")

        thread = threading.Thread(
            target=_run_scrape,
            args=(log.id, max_pages, use_selenium),
            daemon=True,
        )
        thread.start()

        return Response({
            "message": f"Scraping started (up to {max_pages} pages)",
            "scrape_log_id": log.id,
            "status": "running",
        }, status=status.HTTP_202_ACCEPTED)

    def get(self, request):
        """GET scrape logs."""
        logs = ScrapeLog.objects.all()[:10]
        return Response(ScrapeLogSerializer(logs, many=True).data)


class StatsView(APIView):
    """GET dashboard statistics."""

    def get(self, request):
        cache_key = "dashboard_stats"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        books = Book.objects.all()
        total = books.count()

        # Genre distribution
        genre_dist = {}
        for book in books:
            g = book.ai_genre or book.genre or "Unknown"
            genre_dist[g] = genre_dist.get(g, 0) + 1

        # Sentiment distribution
        sentiment_dist = {}
        for book in books:
            s = book.ai_sentiment or "Unknown"
            sentiment_dist[s] = sentiment_dist.get(s, 0) + 1

        # Rating distribution
        ratings = [b.rating for b in books if b.rating]
        avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0

        stats = {
            "total_books": total,
            "books_with_ai": books.filter(ai_summary__gt="").count(),
            "books_with_embeddings": books.filter(embeddings_stored=True).count(),
            "avg_rating": avg_rating,
            "genre_distribution": dict(sorted(genre_dist.items(), key=lambda x: x[1], reverse=True)[:10]),
            "sentiment_distribution": sentiment_dist,
            "recent_books": BookListSerializer(books[:5], many=True).data,
        }

        cache.set(cache_key, stats, 300)
        return Response(stats)


class GenreListView(APIView):
    """GET list of all available genres."""
    def get(self, request):
        genres = set()
        for book in Book.objects.all():
            if book.ai_genre:
                genres.add(book.ai_genre)
            if book.genre:
                genres.add(book.genre)
        return Response(sorted(genres))


# ── Background Tasks ──────────────────────────────────────────────────────────

def _process_book_ai(book_id: int):
    """Run AI processing for a single book (background thread)."""
    import django
    django.setup()
    try:
        book = Book.objects.get(id=book_id)
        from .ai_service import generate_all_insights, store_book_embeddings

        updates = generate_all_insights(book)
        for field, value in updates.items():
            setattr(book, field, value)

        # Store embeddings
        if book.description:
            text = f"{book.title}. {book.description}"
            n = store_book_embeddings(book.id, book.title, text)
            book.embeddings_stored = n > 0

        book.save()
        logger.info(f"AI processing complete for book {book_id}")
        cache.delete("dashboard_stats")

    except Exception as e:
        logger.error(f"AI processing failed for book {book_id}: {e}")


def _run_scrape(log_id: int, max_pages: int, use_selenium: bool):
    """Background scraping task."""
    import django
    django.setup()
    from django.utils import timezone

    try:
        from .scraper import scrape_books, try_selenium_scrape
        from .ai_service import generate_all_insights, store_book_embeddings

        scrape_fn = try_selenium_scrape if use_selenium else scrape_books
        books_data = scrape_fn(max_pages=max_pages)

        created = 0
        for data in books_data:
            # Avoid duplicates by title
            book, is_new = Book.objects.get_or_create(
                title=data["title"],
                defaults=data,
            )
            if not is_new:
                # Update existing
                for field, val in data.items():
                    setattr(book, field, val)
                book.save()
            else:
                created += 1

            # Generate AI insights for new books
            if is_new or not book.ai_summary:
                try:
                    updates = generate_all_insights(book)
                    for field, value in updates.items():
                        setattr(book, field, value)

                    if book.description:
                        text = f"{book.title}. {book.description}"
                        n = store_book_embeddings(book.id, book.title, text)
                        book.embeddings_stored = n > 0

                    book.save()
                except Exception as ai_err:
                    logger.warning(f"AI failed for '{book.title}': {ai_err}")

        log = ScrapeLog.objects.get(id=log_id)
        log.books_scraped = len(books_data)
        log.status = "completed"
        log.finished_at = timezone.now()
        log.save()

        cache.delete("dashboard_stats")
        logger.info(f"Scrape complete: {len(books_data)} books ({created} new)")

    except Exception as e:
        logger.error(f"Scrape failed: {e}")
        try:
            log = ScrapeLog.objects.get(id=log_id)
            log.status = "failed"
            log.error_message = str(e)
            log.finished_at = timezone.now()
            log.save()
        except Exception:
            pass
