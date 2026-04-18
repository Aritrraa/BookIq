from django.db import models


class Book(models.Model):
    title = models.CharField(max_length=500)
    author = models.CharField(max_length=300, blank=True, default="Unknown")
    rating = models.FloatField(null=True, blank=True)
    num_reviews = models.IntegerField(default=0)
    description = models.TextField(blank=True, default="")
    genre = models.CharField(max_length=200, blank=True, default="")
    price = models.CharField(max_length=50, blank=True, default="")
    availability = models.CharField(max_length=100, blank=True, default="")
    book_url = models.URLField(max_length=1000, blank=True, default="")
    cover_image = models.URLField(max_length=1000, blank=True, default="")
    scraped_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # AI-generated fields
    ai_summary = models.TextField(blank=True, default="")
    ai_genre = models.CharField(max_length=200, blank=True, default="")
    ai_sentiment = models.CharField(max_length=50, blank=True, default="")
    ai_sentiment_score = models.FloatField(null=True, blank=True)
    ai_tags = models.JSONField(default=list, blank=True)
    embeddings_stored = models.BooleanField(default=False)

    class Meta:
        ordering = ["-scraped_at"]
        indexes = [
            models.Index(fields=["title"]),
            models.Index(fields=["genre"]),
            models.Index(fields=["ai_genre"]),
            models.Index(fields=["rating"]),
        ]

    def __str__(self):
        return f"{self.title} by {self.author}"

    def star_rating(self):
        """Convert numeric rating to star word."""
        mapping = {1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five"}
        return mapping.get(int(self.rating), "Unknown") if self.rating else "Unknown"


class ScrapeLog(models.Model):
    """Track scraping runs."""
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    books_scraped = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default="running")
    error_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"Scrape {self.status} @ {self.started_at:%Y-%m-%d %H:%M}"
