import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, registerUser } from "../services/api";

export default function LoginPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    groq_api_key: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let data;
      if (isRegister) {
        data = await registerUser({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          name: formData.name,
          groq_api_key: formData.groq_api_key,
        });
      } else {
        data = await loginUser(formData.username, formData.password);
      }

      // Save credentials and token
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user?.groq_api_key) {
        localStorage.setItem("groq_api_key", data.user.groq_api_key);
      } else if (formData.groq_api_key) {
        localStorage.setItem("groq_api_key", formData.groq_api_key);
      }

      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle} className="animate-fade-in">
      <div style={cardStyle} className="card">
        <div style={headerStyle}>
          <div style={logoStyle}>IQ</div>
          <h1 className="font-serif" style={titleStyle}>
            {isRegister ? "Create Account" : "Welcome Back"}
          </h1>
          <p style={subtitleStyle}>
            {isRegister ? "Join BookIQ to build your library" : "Access your AI-powered library"}
          </p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          {isRegister && (
            <div style={fieldGroupStyle}>
              <label className="label" style={labelStyle}>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="input"
                required
              />
            </div>
          )}

          <div style={fieldGroupStyle}>
            <label className="label" style={labelStyle}>
              {isRegister ? "Username" : "Username or Email"}
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder={isRegister ? "johndoe" : "username or email"}
              className="input"
              required
            />
          </div>

          {isRegister && (
            <div style={fieldGroupStyle}>
              <label className="label" style={labelStyle}>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="input"
                required
              />
            </div>
          )}

          <div style={fieldGroupStyle}>
            <label className="label" style={labelStyle}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="input"
              required
            />
          </div>

          <div style={fieldGroupStyle}>
            <label className="label" style={labelStyle}>
              Groq API Key <span style={{ color: "var(--text-3)", textTransform: "none", fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              type="password"
              name="groq_api_key"
              value={formData.groq_api_key}
              onChange={handleChange}
              placeholder="gsk_••••••••••••••••"
              className="input"
            />
            <span style={hintStyle}>
              Your key will be securely saved to your account profile so you don't need to re-enter it.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={buttonStyle}
          >
            {loading ? (
              <span style={spinnerStyle}></span>
            ) : (
              isRegister ? "Sign Up" : "Log In"
            )}
          </button>
        </form>

        <div style={footerStyle}>
          <span>
            {isRegister ? "Already have an account?" : "New to BookIQ?"}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            style={toggleButtonStyle}
          >
            {isRegister ? "Log In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────
const containerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "calc(100vh - 64px)",
  padding: "2rem 1.5rem",
  background: "radial-gradient(circle at top, var(--brand-dim) 0%, var(--bg) 70%)",
};

const cardStyle = {
  width: "100%",
  maxWidth: 440,
  padding: "2.5rem",
  background: "rgba(13, 17, 23, 0.7)",
  backdropFilter: "blur(12px)",
  boxShadow: "var(--shadow-lg)",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const headerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: "0.5rem",
};

const logoStyle = {
  width: 42,
  height: 42,
  background: "var(--brand)",
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 800,
  fontSize: 16,
  marginBottom: "0.5rem",
  boxShadow: "0 0 20px var(--brand-glow)",
};

const titleStyle = {
  fontSize: "1.75rem",
  fontWeight: 800,
  color: "var(--text-1)",
};

const subtitleStyle = {
  fontSize: "0.875rem",
  color: "var(--text-3)",
};

const errorStyle = {
  background: "rgba(248, 81, 73, 0.15)",
  color: "#ff7b72",
  border: "1px solid rgba(248, 81, 73, 0.25)",
  padding: "10px 14px",
  borderRadius: "var(--radius)",
  fontSize: "0.875rem",
  textAlign: "center",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const fieldGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
};

const labelStyle = {
  fontSize: "0.75rem",
  marginBottom: 2,
};

const hintStyle = {
  fontSize: "0.7rem",
  color: "var(--text-3)",
  marginTop: 2,
  lineHeight: 1.3,
};

const buttonStyle = {
  width: "100%",
  height: 42,
  marginTop: "0.5rem",
};

const footerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  fontSize: "0.875rem",
  color: "var(--text-3)",
  borderTop: "1px solid var(--border)",
  paddingTop: "1.25rem",
};

const toggleButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--brand)",
  fontWeight: 600,
  cursor: "pointer",
  outline: "none",
  fontSize: "0.875rem",
};

const spinnerStyle = {
  display: "inline-block",
  width: 18,
  height: 18,
  border: "2px solid rgba(255,255,255,0.3)",
  borderTopColor: "#fff",
  borderRadius: "50%",
  animation: "spin 0.6s linear infinite",
};
