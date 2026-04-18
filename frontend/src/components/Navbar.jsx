import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";

const links = [
  { to: "/",            label: "Dashboard",  icon: "◈" },
  { to: "/books",       label: "Library",    icon: "📚" },
  { to: "/ask",         label: "Ask BookIQ", icon: "✦" },
  { to: "/upload",      label: "Add Book",   icon: "＋" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            IQ
          </div>
          <span className="font-serif font-bold text-lg text-white hidden sm:block">
            Book<span className="text-brand-400">IQ</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                 ${isActive
                   ? "bg-brand-600/20 text-brand-400 border border-brand-600/30"
                   : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                 }`
              }
            >
              <span className="text-xs">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: API indicator + hamburger */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            API
          </div>
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setOpen(!open)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden border-t border-slate-800 bg-slate-950/95 px-4 py-3 flex flex-col gap-1 animate-fade-in">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium
                 ${isActive ? "bg-brand-600/20 text-brand-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`
              }
            >
              <span>{l.icon}</span>{l.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
