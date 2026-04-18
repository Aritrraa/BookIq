import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBook } from "../services/api";
import { Spinner } from "../components/ui";

const GENRES = [
  "", "Mystery", "Science Fiction", "Romance", "Fantasy", "Thriller", "Horror",
  "Historical Fiction", "Self-Help", "Biography", "Children's Fiction", "Poetry",
  "Travel", "Art", "Music", "Sports", "Literary Fiction", "Psychology",
  "Philosophy", "Business", "Cooking",
];

const FIELD = ({ label, name, value, onChange, type = "text", placeholder = "", required = false, hint = "" }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="input"
    />
    {hint && <p className="text-xs text-slate-600">{hint}</p>}
  </div>
);

export default function UploadPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", author: "", rating: "", num_reviews: "0",
    description: "", genre: "", price: "",
    availability: "In stock", book_url: "", cover_image: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      ...form,
      rating: form.rating ? parseFloat(form.rating) : null,
      num_reviews: parseInt(form.num_reviews) || 0,
    };

    try {
      const book = await createBook(payload);
      setSuccess(`✓ "${book.title}" added! AI insights are being generated in the background.`);
      setTimeout(() => navigate(`/books/${book.id}`), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-white mb-2">Add a Book</h1>
        <p className="text-slate-400 text-sm">
          Manually add a book. AI insights (summary, genre, sentiment, embeddings) will be generated automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Error / success */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-300 text-sm flex items-center gap-2">
            <Spinner size="sm" /> {success}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <FIELD label="Title" name="title" value={form.title} onChange={onChange} required placeholder="Book title" />
          </div>
          <FIELD label="Author" name="author" value={form.author} onChange={onChange} placeholder="Author name" />

          {/* Genre dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Genre</label>
            <select name="genre" value={form.genre} onChange={onChange} className="input">
              {GENRES.map((g) => <option key={g} value={g}>{g || "Select genre…"}</option>)}
            </select>
          </div>

          <FIELD label="Rating (0–5)" name="rating" value={form.rating} onChange={onChange} type="number"
            placeholder="e.g. 4.5" hint="Leave blank if unknown" />
          <FIELD label="Number of Reviews" name="num_reviews" value={form.num_reviews} onChange={onChange} type="number" />
          <FIELD label="Price" name="price" value={form.price} onChange={onChange} placeholder="e.g. £12.99" />
          <FIELD label="Availability" name="availability" value={form.availability} onChange={onChange} placeholder="In stock" />
          <div className="sm:col-span-2">
            <FIELD label="Book URL" name="book_url" value={form.book_url} onChange={onChange}
              type="url" placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <FIELD label="Cover Image URL" name="cover_image" value={form.cover_image} onChange={onChange}
              type="url" placeholder="https://… (jpg, png)" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={5}
              placeholder="Book description or synopsis…"
              className="input resize-none"
            />
            <p className="text-xs text-slate-600">A richer description improves AI insights and RAG accuracy.</p>
          </div>
        </div>

        {/* Cover preview */}
        {form.cover_image && (
          <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl">
            <img src={form.cover_image} alt="preview" className="w-12 h-16 object-cover rounded-lg"
              onError={(e) => { e.target.style.display = "none"; }} />
            <p className="text-slate-400 text-xs">Cover preview</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading || !form.title} className="btn-primary flex items-center gap-2">
            {loading ? <><Spinner size="sm" /> Adding…</> : "Add Book & Generate Insights"}
          </button>
        </div>
      </form>

      {/* Info panel */}
      <div className="mt-6 card p-5 space-y-3">
        <p className="font-medium text-white text-sm">What happens after you add a book?</p>
        {[
          { icon: "✦", text: "AI generates a summary using Claude" },
          { icon: "🏷", text: "Genre is classified automatically" },
          { icon: "📊", text: "Sentiment is analyzed from the description" },
          { icon: "🔍", text: "Text is chunked & embedded into ChromaDB for RAG" },
        ].map((s) => (
          <div key={s.text} className="flex items-center gap-3 text-sm text-slate-400">
            <span className="text-brand-400">{s.icon}</span> {s.text}
          </div>
        ))}
      </div>
    </div>
  );
}
