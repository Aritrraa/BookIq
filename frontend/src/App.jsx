import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import BooksPage from "./pages/BooksPage";
import BookDetailPage from "./pages/BookDetailPage";
import AskPage from "./pages/AskPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>
      <Navbar />
      <main>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/books"     element={<BooksPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/ask"       element={<AskPage />} />
          <Route path="/upload"    element={<UploadPage />} />
          <Route path="*" element={
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:16 }}>
              <span style={{ fontSize:"4rem" }}>404</span>
              <p style={{ color:"var(--text-3)" }}>Page not found</p>
              <Link to="/" className="btn-primary">Go home</Link>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}
