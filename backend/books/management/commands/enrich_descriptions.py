"""
Management command: enrich_descriptions
Expands book descriptions using Groq to generate richer, longer text for better RAG chunking.
Usage: python manage.py enrich_descriptions
"""
from django.core.management.base import BaseCommand
from books.models import Book
from books.ai_service import _gpt, store_book_embeddings


class Command(BaseCommand):
    help = "Enrich book descriptions using AI for better RAG chunking"

    def handle(self, *args, **options):
        books = Book.objects.all()
        total = books.count()
        self.stdout.write(f"Enriching {total} books with detailed descriptions...\n")

        for i, book in enumerate(books, 1):
            short = book.description or book.ai_summary or ""
            if len(short) > 600:
                self.stdout.write(f"  [{i}/{total}] SKIP {book.title} (already long)")
                continue

            prompt = (
                f'Book: "{book.title}" by {book.author or "Unknown"}\n'
                f'Genre: {book.ai_genre or book.genre or "Fiction"}\n'
                f'Brief: {short}\n\n'
                'Write a detailed 300-400 word description of this book covering:\n'
                '1. Plot overview and main characters\n'
                '2. Key themes and motifs\n'
                '3. Writing style and tone\n'
                '4. Why readers enjoy it\n'
                'Write in third person. Do NOT use headers or bullet points. Write flowing paragraphs.'
            )

            result = _gpt(prompt, system="You are a literary expert writing detailed book descriptions.", max_tokens=500)

            if result and len(result) > 200:
                book.description = result.strip()
                book.save(update_fields=["description"])

                # Re-embed with the new richer text
                text = f"{book.title} by {book.author}. {book.description}"
                n = store_book_embeddings(book.id, book.title, text)
                book.embeddings_stored = n > 0
                book.save(update_fields=["embeddings_stored"])

                self.stdout.write(f"  [{i}/{total}] OK   {book.title} -> {len(result)} chars, {n} chunks")
            else:
                self.stdout.write(f"  [{i}/{total}] FAIL {book.title}")

        self.stdout.write(self.style.SUCCESS(f"\nDone! All books enriched and re-embedded."))
