from django.urls import path
from . import views

urlpatterns = [
    # Book CRUD
    path("books/", views.BookListCreateView.as_view(), name="book-list-create"),
    path("books/<int:pk>/", views.BookDetailView.as_view(), name="book-detail"),
    path("books/<int:pk>/recommendations/", views.BookRecommendationsView.as_view(), name="book-recommendations"),

    # AI & RAG
    path("books/ask/", views.AskView.as_view(), name="ask"),

    # Scraping
    path("scrape/", views.ScrapeView.as_view(), name="scrape"),

    # Dashboard
    path("stats/", views.StatsView.as_view(), name="stats"),
    path("genres/", views.GenreListView.as_view(), name="genres"),

    # Auth
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/me/", views.UserProfileView.as_view(), name="me"),
]
