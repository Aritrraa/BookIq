"""
Management command: embed_books
Generates and stores ChromaDB embeddings for all books that don't have them yet.
Usage: python manage.py embed_books
       python manage.py embed_books --all   (re-embed everything)
"""
from django.core.management.base import BaseCommand
from books.models import Book
from books.ai_service import store_book_embeddings


class Command(BaseCommand):
    help = "Generate embeddings for books and store in ChromaDB"

    def add_arguments(self, parser):
        parser.add_argument("--all", action="store_true", help="Re-embed all books, even those already stored")

    def handle(self, *args, **options):
        if options["all"]:
            books = Book.objects.all()
        else:
            books = Book.objects.filter(embeddings_stored=False)

        total = books.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("All books already have embeddings!"))
            return

        self.stdout.write(f"Embedding {total} books...")
        self.stdout.write("(First run downloads the model ~80MB, please wait)\n")

        success = 0
        for i, book in enumerate(books, 1):
            text = book.description or book.ai_summary or ""
            if not text:
                self.stdout.write(f"  [{i}/{total}] SKIP {book.title} (no text)")
                continue

            chunks = store_book_embeddings(book.id, book.title, text)
            if chunks > 0:
                book.embeddings_stored = True
                book.save(update_fields=["embeddings_stored"])
                success += 1
                self.stdout.write(f"  [{i}/{total}] OK   {book.title} -> {chunks} chunks")
            else:
                self.stdout.write(f"  [{i}/{total}] FAIL {book.title}")

        self.stdout.write(self.style.SUCCESS(f"\nDone! {success}/{total} books embedded."))
