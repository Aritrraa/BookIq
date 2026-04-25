import React from "react";

export function StarRating({ rating, max = 5, size = "sm" }) {
  const sz = size === "lg" ? "1.1rem" : "0.85rem";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ fontSize:sz, color: i < Math.round(rating) ? "var(--amber)" : "var(--bg-3)" }}>★</span>
      ))}
      {rating != null && (
        <span style={{ marginLeft:6, fontSize:"0.72rem", color:"var(--text-3)", fontFamily:"'JetBrains Mono',monospace" }}>
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  );
}

export function SentimentBadge({ sentiment }) {
  if (!sentiment) return null;
  const map = { Positive: "badge-green", Negative: "badge-red", Neutral: "badge-slate" };
  const icons = { Positive: "↑", Negative: "↓", Neutral: "→" };
  return <span className={`badge ${map[sentiment] || "badge-slate"}`}>{icons[sentiment]} {sentiment}</span>;
}

export function GenreBadge({ genre }) {
  if (!genre) return null;
  return <span className="badge badge-blue">{genre}</span>;
}

export function Spinner({ size = "md" }) {
  const s = { sm: 16, md: 24, lg: 40 }[size];
  return (
    <div style={{
      width: s, height: s, borderRadius: "50%",
      border: `2px solid rgba(79,134,247,.2)`,
      borderTopColor: "var(--brand)",
      animation: "spin .7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

export function EmptyState({ icon = "📚", title, subtitle, action }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"5rem 1rem", gap:16, textAlign:"center" }}>
      <div style={{ fontSize:"3rem" }}>{icon}</div>
      <div>
        <p style={{ color:"var(--text-1)", fontWeight:600, fontSize:"1.1rem" }}>{title}</p>
        {subtitle && <p style={{ color:"var(--text-3)", fontSize:"0.875rem", marginTop:4, maxWidth:320 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ marginTop:8 }}>{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div style={{ background:"rgba(248,81,73,.1)", border:"1px solid rgba(248,81,73,.3)", borderRadius:"var(--radius)", padding:"14px 16px", display:"flex", alignItems:"flex-start", gap:12 }}>
      <span style={{ color:"var(--red)", fontSize:"1.1rem" }}>⚠</span>
      <div>
        <p style={{ color:"#ff9492", fontSize:"0.875rem" }}>{message}</p>
        {onRetry && <button onClick={onRetry} style={{ color:"var(--red)", background:"none", border:"none", cursor:"pointer", fontSize:"0.75rem", marginTop:6, textDecoration:"underline" }}>Try again</button>}
      </div>
    </div>
  );
}

export function BookCover({ src, title, style = {} }) {
  const [err, setErr] = React.useState(false);
  if (err || !src) {
    return (
      <div style={{ background:"linear-gradient(135deg,var(--brand-dim),var(--bg-2))", display:"flex", alignItems:"center", justifyContent:"center", ...style }}>
        <span style={{ fontSize:"2.5rem" }}>📖</span>
      </div>
    );
  }
  return <img src={src} alt={title} style={{ objectFit:"cover", ...style }} onError={() => setErr(true)} />;
}

export function StatCard({ label, value, icon, color = "blue" }) {
  const palettes = {
    blue:   { bg:"linear-gradient(135deg,rgba(79,134,247,.15),rgba(79,134,247,.05))", border:"rgba(79,134,247,.3)",  text:"var(--brand)" },
    green:  { bg:"linear-gradient(135deg,rgba(63,185,80,.15),rgba(63,185,80,.05))",   border:"rgba(63,185,80,.3)",   text:"var(--green)" },
    amber:  { bg:"linear-gradient(135deg,rgba(227,179,65,.15),rgba(227,179,65,.05))", border:"rgba(227,179,65,.3)",  text:"var(--amber)" },
    purple: { bg:"linear-gradient(135deg,rgba(188,140,255,.15),rgba(188,140,255,.05))",border:"rgba(188,140,255,.3)",text:"var(--purple)" },
  };
  const p = palettes[color] || palettes.blue;
  return (
    <div style={{ background:p.bg, border:`1px solid ${p.border}`, borderRadius:"var(--radius-lg)", padding:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <p className="label" style={{ marginBottom:6 }}>{label}</p>
          <p style={{ fontSize:"2rem", fontWeight:800, color:"var(--text-1)", fontFamily:"'JetBrains Mono',monospace" }}>{value}</p>
        </div>
        <span style={{ fontSize:"1.6rem", opacity:.8 }}>{icon}</span>
      </div>
    </div>
  );
}

export function SectionHeading({ title, subtitle, action }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, marginBottom:"1.5rem" }}>
      <div>
        <h2 className="section-title font-serif">{title}</h2>
        {subtitle && <p style={{ color:"var(--text-3)", fontSize:"0.875rem", marginTop:4 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding:"1rem", overflow:"hidden" }}>
      <div style={{ width:"100%", height:160, background:"var(--bg-2)", borderRadius:"var(--radius)", marginBottom:12, animation:"pulse 1.5s infinite" }} />
      <div style={{ height:14, background:"var(--bg-2)", borderRadius:4, width:"75%", marginBottom:8, animation:"pulse 1.5s infinite" }} />
      <div style={{ height:12, background:"var(--bg-2)", borderRadius:4, width:"50%", animation:"pulse 1.5s infinite" }} />
    </div>
  );
}

export function TagList({ tags = [] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {tags.map(t => <span key={t} className="badge badge-slate"># {t}</span>)}
    </div>
  );
}
