import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import BooksPage from "./pages/BooksPage";
import BookDetailPage from "./pages/BookDetailPage";
import AskPage from "./pages/AskPage";
import UploadPage from "./pages/UploadPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("groq_api_key");
    setUser(null);
    navigate("/login");
  };

  // If user is not authenticated, force login screen first
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage onLoginSuccess={setUser} />} />
      </Routes>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>
      <Navbar user={user} onLogout={handleLogout} />
      <main>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/books"     element={<BooksPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/ask"       element={<AskPage />} />
          <Route path="/upload"    element={<UploadPage />} />
          <Route path="/settings"  element={<SettingsPage user={user} onProfileUpdate={setUser} />} />
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


