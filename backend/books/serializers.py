from rest_framework import serializers
from .models import Book, ScrapeLog


class BookListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing books."""
    class Meta:
        model = Book
        fields = [
            "id", "title", "author", "rating", "num_reviews",
            "genre", "ai_genre", "price", "book_url", "cover_image",
            "ai_summary", "ai_sentiment", "scraped_at",
        ]


class BookDetailSerializer(serializers.ModelSerializer):
    """Full serializer for book detail page."""
    star_rating = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = "__all__"

    def get_star_rating(self, obj):
        return obj.star_rating()


class BookCreateSerializer(serializers.ModelSerializer):
    """Serializer for uploading/creating books."""
    class Meta:
        model = Book
        fields = [
            "title", "author", "rating", "num_reviews", "description",
            "genre", "price", "availability", "book_url", "cover_image",
        ]

    def validate_rating(self, value):
        if value is not None and not (0 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 0 and 5.")
        return value


class ScrapeLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScrapeLog
        fields = "__all__"


class QuestionSerializer(serializers.Serializer):
    question = serializers.CharField(min_length=3, max_length=1000)
    book_id = serializers.IntegerField(required=False, allow_null=True)
