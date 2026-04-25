import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { askQuestion, getBooks } from "../services/api";
import { Spinner } from "../components/ui";

const EXAMPLES = [
  "Which books have the most positive tone?",
  "Recommend a mystery book with high rating",
  "What science fiction books do you have?",
  "Summarise themes in literary fiction",
  "Which book is best for someone who likes philosophy?",
];

function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display:"flex", gap:12, flexDirection: isUser ? "row-reverse" : "row" }} className="animate-slide-up">
      {/* Avatar */}
      <div style={{
        width:34, height:34, borderRadius:"50%", flexShrink:0, marginTop:2,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem",
        background: isUser ? "var(--brand)" : "var(--bg-2)",
        color: isUser ? "#fff" : "var(--brand)",
        border: isUser ? "none" : "1px solid var(--border)",
      }}>{isUser ? "U" : "✦"}</div>

      <div style={{ maxWidth:620, display:"flex", flexDirection:"column", gap:10, alignItems: isUser ? "flex-end" : "flex-start" }}>
        {/* Bubble */}
        <div className="whitespace-pre-wrap" style={{
          padding:"12px 16px", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          fontSize:"0.875rem", lineHeight:1.65,
          background: isUser ? "var(--brand)" : "var(--bg-2)",
          color: isUser ? "#fff" : "var(--text-1)",
          border: isUser ? "none" : "1px solid var(--border)",
        }}>{msg.content}</div>

        {/* Sources */}
        {msg.sources?.length > 0 && (
          <div>
            <p style={{ fontSize:"0.72rem", color:"var(--text-4)", marginBottom:6, paddingLeft:2 }}>Sources used:</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {msg.sources.map(src => (
                <Link key={src.book_id} to={`/books/${src.book_id}`} style={{
                  display:"flex", alignItems:"center", gap:8, textDecoration:"none",
                  background:"var(--bg-1)", border:"1px solid var(--border)", borderRadius:"var(--radius)",
                  padding:"6px 12px", transition:"border-color var(--transition)",
                }}>
                  {src.cover_image && <img src={src.cover_image} alt={src.title} style={{ width:20, height:28, objectFit:"cover", borderRadius:4 }} />}
                  <div>
                    <p style={{ fontSize:"0.75rem", fontWeight:500, color:"var(--text-2)", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{src.title}</p>
                    <p style={{ fontSize:"0.68rem", fontFamily:"'JetBrains Mono',monospace", color:"var(--text-3)" }}>{Math.round(src.relevance_score * 100)}% match</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Agent info */}
        {(msg.method || msg.agent_steps) && (
          <div style={{ display:"flex", flexDirection:"column", gap:4, paddingLeft:2 }}>
            <span style={{ fontSize:"0.7rem", color:"var(--text-4)" }}>
              via {msg.method === "rag" ? "RAG pipeline" : msg.method}
              {msg.question_type && ` · ${msg.question_type}`}
              {msg.chunks_used > 0 && ` · ${msg.chunks_used} chunks`}
              {msg.cached && " · cached"}
            </span>
            {msg.agent_steps?.length > 0 && (
              <span style={{ fontSize:"0.66rem", color:"var(--text-4)", fontFamily:"'JetBrains Mono',monospace" }}>
                graph: {msg.agent_steps.join(" → ")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AskPage() {
  const [searchParams] = useSearchParams();
  const preBookId = searchParams.get("book_id");
  const preBookTitle = searchParams.get("title");

  const [messages, setMessages] = useState([{
    role:"assistant",
    content: preBookId
      ? `Hi! I'm BookIQ. Ask me anything about "${preBookTitle || "this book"}" and I'll search through its content to answer you.`
      : "Hi! I'm BookIQ, your AI book assistant. Ask me anything about the books in your library — I'll use RAG to find relevant passages and generate accurate answers.",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookId, setBookId] = useState(preBookId ? parseInt(preBookId) : null);
  const [books, setBooks] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { getBooks().then(d => setBooks(d.results || [])).catch(() => {}); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = async (q = input.trim()) => {
    if (!q || loading) return;
    setInput("");
    const history = messages.slice(1).map(m => ({ role:m.role, content:m.content })).slice(-6);
    setMessages(prev => [...prev, { role:"user", content:q }]);
    setLoading(true);
    try {
      const res = await askQuestion(q, bookId || null, history);
      setMessages(prev => [...prev, {
        role:"assistant", content:res.answer, sources:res.sources||[],
        method:res.method, chunks_used:res.chunks_used, cached:res.cached,
        agent_steps:res.agent_steps||[], question_type:res.question_type||"",
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role:"assistant", content:`Sorry, something went wrong: ${e.message}` }]);
    } finally { setLoading(false); inputRef.current?.focus(); }
  };

  return (
    <div className="page-container-sm animate-fade-in" style={{ display:"flex", flexDirection:"column", minHeight:"calc(100vh - 4rem)" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:24 }}>
        <div>
          <h1 className="font-serif" style={{ fontSize:"1.6rem", fontWeight:800, color:"var(--text-1)", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ color:"var(--brand)" }}>✦</span> Ask BookIQ
          </h1>
          <p style={{ color:"var(--text-3)", fontSize:"0.85rem", marginTop:4 }}>RAG-powered Q&A across your book library</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:"var(--text-3)", fontSize:"0.78rem" }}>Scope:</span>
          <select className="input" style={{ width:"auto" }} value={bookId || ""} onChange={e => setBookId(e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">All books</option>
            {books.map(b => <option key={b.id} value={b.id}>{b.title.slice(0,40)}{b.title.length>40?"…":""}</option>)}
          </select>
          {bookId && <button onClick={() => setBookId(null)} className="btn-ghost" style={{ fontSize:"0.78rem" }}>✕ All</button>}
        </div>
      </div>

      {/* Chat area */}
      <div className="card" style={{ flex:1, padding:"1.5rem", overflowY:"auto", display:"flex", flexDirection:"column", gap:24, minHeight:400, marginBottom:16 }}>
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display:"flex", gap:12 }} className="animate-fade-in">
            <div style={{ width:34, height:34, borderRadius:"50%", background:"var(--bg-2)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--brand)", flexShrink:0 }}>✦</div>
            <div style={{ background:"var(--bg-2)", border:"1px solid var(--border)", borderRadius:"18px 18px 18px 4px", padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
              <Spinner size="sm" /><span style={{ color:"var(--text-3)", fontSize:"0.875rem" }}>Searching books…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Example prompts */}
      {messages.length <= 1 && (
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:"0.75rem", color:"var(--text-4)", marginBottom:8 }}>Try asking:</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {EXAMPLES.map(q => (
              <button key={q} onClick={() => send(q)} style={{
                fontSize:"0.75rem", padding:"6px 12px", borderRadius:99,
                background:"var(--bg-2)", border:"1px solid var(--border)",
                color:"var(--text-3)", cursor:"pointer", transition:"all var(--transition)",
              }}
              onMouseEnter={e => { e.target.style.background="var(--bg-3)"; e.target.style.color="var(--text-1)"; }}
              onMouseLeave={e => { e.target.style.background="var(--bg-2)"; e.target.style.color="var(--text-3)"; }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ display:"flex", gap:12 }}>
        <textarea ref={inputRef} rows={1} className="input" placeholder="Ask anything about your books…"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{ flex:1, resize:"none", minHeight:48, maxHeight:120, paddingTop:12, paddingBottom:12 }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} className="btn-primary" style={{ alignSelf:"flex-end", padding:"12px 20px" }}>
          {loading ? <Spinner size="sm" /> : "Send"}
        </button>
      </div>
      <p style={{ fontSize:"0.72rem", color:"var(--text-4)", marginTop:8, textAlign:"center" }}>Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
