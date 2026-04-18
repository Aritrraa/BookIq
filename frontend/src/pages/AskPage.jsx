import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { askQuestion, getBooks } from "../services/api";
import { Spinner, BookCover } from "../components/ui";

const EXAMPLE_QUESTIONS = [
  "Which books have the most positive tone?",
  "Recommend a mystery book with high rating",
  "What science fiction books do you have?",
  "Summarise the themes in literary fiction books",
  "Which book would be best for someone who likes philosophy?",
];

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-slide-up`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-1
        ${isUser ? "bg-brand-600 text-white" : "bg-slate-800 border border-slate-700 text-brand-400"}`}>
        {isUser ? "U" : "✦"}
      </div>

      <div className={`max-w-2xl space-y-3 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? "bg-brand-600 text-white rounded-tr-sm"
            : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm"
          }`}>
          {msg.content}
        </div>

        {/* Sources */}
        {msg.sources?.length > 0 && (
          <div className="space-y-2 w-full">
            <p className="text-xs text-slate-500 px-1">Sources used:</p>
            <div className="flex flex-wrap gap-2">
              {msg.sources.map((src) => (
                <Link
                  key={src.book_id}
                  to={`/books/${src.book_id}`}
                  className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2
                             hover:border-brand-600/50 transition-colors group"
                >
                  {src.cover_image && (
                    <BookCover src={src.cover_image} title={src.title} className="w-6 h-8 rounded object-cover" />
                  )}
                  <div>
                    <p className="text-xs font-medium text-slate-300 group-hover:text-white line-clamp-1 max-w-[120px]">
                      {src.title}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      {Math.round(src.relevance_score * 100)}% match
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Method badge */}
        {msg.method && (
          <span className="text-xs text-slate-600 px-1">
            via {msg.method === "rag" ? "RAG pipeline" : msg.method}
            {msg.chunks_used > 0 && ` · ${msg.chunks_used} chunks`}
            {msg.cached && " · cached"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AskPage() {
  const [searchParams] = useSearchParams();
  const preBookId    = searchParams.get("book_id");
  const preBookTitle = searchParams.get("title");

  const [messages, setMessages] = useState([{
    role: "assistant",
    content: preBookId
      ? `Hi! I'm BookIQ. Ask me anything about "${preBookTitle || "this book"}" and I'll search through its content to answer you.`
      : "Hi! I'm BookIQ, your AI book assistant. Ask me anything about the books in your library — I'll use RAG to find relevant passages and generate accurate answers.",
  }]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [bookId, setBookId]       = useState(preBookId ? parseInt(preBookId) : null);
  const [books, setBooks]         = useState([]);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { getBooks().then((d) => setBooks(d.results || [])).catch(() => {}); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (q = input.trim()) => {
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await askQuestion(q, bookId || null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources || [],
          method: res.method,
          chunks_used: res.chunks_used,
          cached: res.cached,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, something went wrong: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col min-h-[calc(100vh-4rem)] animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-brand-400">✦</span> Ask BookIQ
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">RAG-powered Q&A across your book library</p>
        </div>

        {/* Book scope selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 text-xs">Scope:</span>
          <select
            className="input w-auto text-sm"
            value={bookId || ""}
            onChange={(e) => setBookId(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">All books</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.title.slice(0, 40)}{b.title.length > 40 ? "…" : ""}</option>
            ))}
          </select>
          {bookId && (
            <button onClick={() => setBookId(null)} className="btn-ghost text-xs">✕ All</button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 card p-4 sm:p-6 overflow-y-auto space-y-6 min-h-[400px] mb-4">
        {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-brand-400 flex items-center justify-center text-sm shrink-0">✦</div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-slate-400 text-sm">Searching books…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Example questions */}
      {messages.length <= 1 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700
                           hover:border-brand-600/50 text-slate-400 hover:text-slate-200
                           rounded-full transition-all duration-150"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3">
        <textarea
          ref={inputRef}
          rows={1}
          className="input resize-none flex-1 py-3 leading-relaxed"
          placeholder="Ask anything about your books…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          style={{ minHeight: "48px", maxHeight: "120px" }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="btn-primary px-5 self-end shrink-0"
        >
          {loading ? <Spinner size="sm" /> : "Send"}
        </button>
      </div>
      <p className="text-xs text-slate-600 mt-2 text-center">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
