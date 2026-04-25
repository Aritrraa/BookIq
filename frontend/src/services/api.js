import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  timeout: 120000,
  headers: { "Content-Type": "application/json" },
});

// Response interceptor for error normalisation
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.response?.data?.detail ||
      err.message ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

// ── Books ────────────────────────────────────────────────
export const getBooks = (params = {}) =>
  api.get("/books/", { params }).then((r) => r.data);

export const getBook = (id) =>
  api.get(`/books/${id}/`).then((r) => r.data);

export const createBook = (data) =>
  api.post("/books/", data).then((r) => r.data);

export const getRecommendations = (id) =>
  api.get(`/books/${id}/recommendations/`).then((r) => r.data);

// ── AI / RAG ─────────────────────────────────────────────
export const askQuestion = (question, book_id = null, history = []) =>
  api.post("/books/ask/", { question, book_id, history }).then((r) => r.data);

// ── Scraping ─────────────────────────────────────────────
export const triggerScrape = (max_pages = 3, use_selenium = false) =>
  api.post("/scrape/", { max_pages, use_selenium }).then((r) => r.data);

export const getScrapeLogs = () =>
  api.get("/scrape/").then((r) => r.data);

// ── Stats & Meta ─────────────────────────────────────────
export const getStats = () =>
  api.get("/stats/").then((r) => r.data);

export const getGenres = () =>
  api.get("/genres/").then((r) => r.data);

export default api;
