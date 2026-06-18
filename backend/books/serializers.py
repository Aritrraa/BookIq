from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Book, ScrapeLog, UserProfile


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
    history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )


class UserSerializer(serializers.ModelSerializer):
    groq_api_key = serializers.SerializerMethodField()
    name = serializers.CharField(source="first_name")

    class Meta:
        model = User
        fields = ["id", "username", "email", "name", "groq_api_key"]

    def get_groq_api_key(self, obj):
        try:
            return obj.profile.groq_api_key
        except UserProfile.DoesNotExist:
            return ""


class UserRegisterSerializer(serializers.ModelSerializer):
    name = serializers.CharField(write_only=True, required=False)
    groq_api_key = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "name", "groq_api_key"]
        extra_kwargs = {
            "password": {"write_only": True},
            "email": {"required": True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        name = validated_data.pop("name", "")
        groq_api_key = validated_data.pop("groq_api_key", "")
        
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=name,
        )
        
        UserProfile.objects.create(user=user, groq_api_key=groq_api_key)
        return user

