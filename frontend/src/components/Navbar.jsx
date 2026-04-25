import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";

const links = [
  { to: "/",       label: "Dashboard",  icon: "◈" },
  { to: "/books",  label: "Library",    icon: "📚" },
  { to: "/ask",    label: "Ask BookIQ", icon: "✦" },
  { to: "/upload", label: "Add Book",   icon: "＋" },
];

const navStyle = {
  position: "sticky", top: 0, zIndex: 50,
  background: "rgba(3,7,18,0.85)",
  backdropFilter: "blur(20px)",
  borderBottom: "1px solid var(--border)",
};
const innerStyle = {
  maxWidth: 1280, margin: "0 auto", padding: "0 1.5rem",
  height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
};
const logoBoxStyle = {
  width: 34, height: 34, background: "var(--brand)", borderRadius: 10,
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "-.5px",
};

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const linkCls = (active) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 8, fontSize: "0.875rem", fontWeight: 500,
    textDecoration: "none", transition: "all 150ms",
    background: active ? "var(--brand-glow)" : "transparent",
    color: active ? "var(--brand)" : "var(--text-3)",
    border: active ? "1px solid rgba(79,134,247,.25)" : "1px solid transparent",
  });

  return (
    <header style={navStyle}>
      <div style={innerStyle}>
        {/* Logo */}
        <Link to="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }} onClick={() => setOpen(false)}>
          <div style={logoBoxStyle}>IQ</div>
          <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"1.15rem", color:"var(--text-1)" }}>
            Book<span style={{ color:"var(--brand)" }}>IQ</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display:"flex", alignItems:"center", gap:4 }} className="desktop-nav">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} style={({ isActive }) => linkCls(isActive)}>
              <span style={{ fontSize:"0.8rem" }}>{l.icon}</span>{l.label}
            </NavLink>
          ))}
        </nav>

        {/* Status + hamburger */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.75rem", color:"var(--text-3)" }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--green)", display:"inline-block", animation:"pulse 2s infinite" }} />
            Live
          </div>
          <button onClick={() => setOpen(!open)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-2)", fontSize:"1.2rem", padding:"4px 8px" }} className="hamburger">
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav style={{ borderTop:"1px solid var(--border)", background:"var(--bg-1)", padding:"12px 16px", display:"flex", flexDirection:"column", gap:4 }} className="animate-fade-in">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} onClick={() => setOpen(false)}
              style={({ isActive }) => ({ ...linkCls(isActive), padding:"10px 14px" })}>
              <span>{l.icon}</span>{l.label}
            </NavLink>
          ))}
        </nav>
      )}

      <style>{`
        @media(min-width:768px){ .hamburger{display:none!important} }
        @media(max-width:767px){ .desktop-nav{display:none!important} }
      `}</style>
    </header>
  );
}
