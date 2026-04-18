import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import BooksPage from "./pages/BooksPage";
import BookDetailPage from "./pages/BookDetailPage";
import AskPage from "./pages/AskPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main>
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/books"      element={<BooksPage />} />
          <Route path="/books/:id"  element={<BookDetailPage />} />
          <Route path="/ask"        element={<AskPage />} />
          <Route path="/upload"     element={<UploadPage />} />
          <Route path="*"           element={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <span className="text-6xl">404</span>
              <p className="text-slate-400">Page not found</p>
              <a href="/" className="btn-primary">Go home</a>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}
