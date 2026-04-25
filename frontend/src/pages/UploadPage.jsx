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

function Field({ label, required, hint, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <label className="label">{label} {required && <span style={{ color:"var(--red)" }}>*</span>}</label>
      {children}
      {hint && <p style={{ fontSize:"0.72rem", color:"var(--text-4)" }}>{hint}</p>}
    </div>
  );
}

export default function UploadPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title:"", author:"", rating:"", num_reviews:"0",
    description:"", genre:"", price:"",
    availability:"In stock", book_url:"", cover_image:"",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onChange = e => { const { name, value } = e.target; setForm(p => ({ ...p, [name]: value })); };

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError(""); setSuccess("");
    const payload = { ...form, rating: form.rating ? parseFloat(form.rating) : null, num_reviews: parseInt(form.num_reviews) || 0 };
    try {
      const book = await createBook(payload);
      setSuccess(`✓ "${book.title}" added! AI insights are being generated.`);
      setTimeout(() => navigate(`/books/${book.id}`), 2000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const grid2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" };

  return (
    <div className="page-container-sm animate-fade-in">
      <div style={{ marginBottom:"2rem" }}>
        <h1 className="font-serif" style={{ fontSize:"2rem", fontWeight:800, color:"var(--text-1)", marginBottom:8 }}>Add a Book</h1>
        <p style={{ color:"var(--text-3)", fontSize:"0.875rem" }}>Manually add a book. AI insights will be generated automatically in the background.</p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding:"1.75rem", display:"flex", flexDirection:"column", gap:"1.25rem" }}>
        {error && <div style={{ background:"rgba(248,81,73,.1)", border:"1px solid rgba(248,81,73,.3)", borderRadius:"var(--radius)", padding:"10px 14px", color:"#ff9492", fontSize:"0.875rem" }}>{error}</div>}
        {success && <div style={{ background:"rgba(63,185,80,.1)", border:"1px solid rgba(63,185,80,.3)", borderRadius:"var(--radius)", padding:"10px 14px", color:"var(--green)", fontSize:"0.875rem", display:"flex", alignItems:"center", gap:10 }}><Spinner size="sm" />{success}</div>}

        <Field label="Title" required>
          <input className="input" name="title" value={form.title} onChange={onChange} placeholder="Book title" required />
        </Field>

        <div style={grid2}>
          <Field label="Author">
            <input className="input" name="author" value={form.author} onChange={onChange} placeholder="Author name" />
          </Field>
          <Field label="Genre">
            <select className="input" name="genre" value={form.genre} onChange={onChange}>
              {GENRES.map(g => <option key={g} value={g}>{g || "Select genre…"}</option>)}
            </select>
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Rating (0–5)" hint="Leave blank if unknown">
            <input className="input" type="number" name="rating" value={form.rating} onChange={onChange} placeholder="e.g. 4.5" min={0} max={5} step={0.1} />
          </Field>
          <Field label="Price">
            <input className="input" name="price" value={form.price} onChange={onChange} placeholder="e.g. £12.99" />
          </Field>
        </div>

        <Field label="Book URL">
          <input className="input" type="url" name="book_url" value={form.book_url} onChange={onChange} placeholder="https://…" />
        </Field>

        <Field label="Cover Image URL">
          <input className="input" type="url" name="cover_image" value={form.cover_image} onChange={onChange} placeholder="https://… (jpg, png)" />
          {form.cover_image && (
            <img src={form.cover_image} alt="preview" style={{ marginTop:8, width:60, height:80, objectFit:"cover", borderRadius:"var(--radius-sm)", border:"1px solid var(--border)" }}
              onError={e => { e.target.style.display="none"; }} />
          )}
        </Field>

        <Field label="Description" hint="A richer description improves AI insights and RAG accuracy.">
          <textarea className="input" name="description" value={form.description} onChange={onChange} rows={5} placeholder="Book description or synopsis…" style={{ resize:"vertical" }} />
        </Field>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:12, paddingTop:8 }}>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading || !form.title} className="btn-primary" style={{ display:"flex", alignItems:"center", gap:8 }}>
            {loading ? <><Spinner size="sm" /> Adding…</> : "Add Book & Generate Insights"}
          </button>
        </div>
      </form>

      <div className="card" style={{ padding:"1.25rem", marginTop:"1.5rem" }}>
        <p style={{ fontWeight:600, color:"var(--text-1)", fontSize:"0.875rem", marginBottom:12 }}>What happens after you add a book?</p>
        {[
          { icon:"✦",  text:"AI generates a summary using Groq" },
          { icon:"🏷",  text:"Genre is classified automatically" },
          { icon:"📊", text:"Sentiment is analyzed from the description" },
          { icon:"🔍", text:"Text is chunked & embedded into ChromaDB for RAG" },
        ].map(s => (
          <div key={s.text} style={{ display:"flex", alignItems:"center", gap:10, fontSize:"0.875rem", color:"var(--text-3)", marginBottom:10 }}>
            <span style={{ color:"var(--brand)" }}>{s.icon}</span> {s.text}
          </div>
        ))}
      </div>
    </div>
  );
}
