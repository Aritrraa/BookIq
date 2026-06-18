import React, { useState, useEffect } from "react";
import { updateProfile } from "../services/api";

export default function SettingsPage({ user, onProfileUpdate }) {
  const [formData, setFormData] = useState({
    name: "",
    groq_api_key: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        groq_api_key: user.groq_api_key || localStorage.getItem("groq_api_key") || "",
        password: "",
        confirmPassword: "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.name,
        groq_api_key: formData.groq_api_key,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const updatedUser = await updateProfile(payload);
      
      // Update localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (payload.groq_api_key) {
        localStorage.setItem("groq_api_key", payload.groq_api_key);
      } else {
        localStorage.removeItem("groq_api_key");
      }

      if (onProfileUpdate) {
        onProfileUpdate(updatedUser);
      }

      setSuccess("Profile settings updated successfully!");
      setFormData({
        ...formData,
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(err.message || "Failed to update profile settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container-sm animate-fade-in" style={{ padding: "3rem 1.5rem" }}>
      <div className="card" style={cardStyle}>
        <div style={headerStyle}>
          <h1 className="font-serif" style={titleStyle}>Profile Settings</h1>
          <p style={subtitleStyle}>Manage your account and configure your API credentials</p>
        </div>

        {success && <div style={successStyle}>{success}</div>}
        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>General Info</h3>
            
            <div style={fieldStyle}>
              <label className="label">Username</label>
              <input
                type="text"
                value={user?.username || ""}
                className="input"
                disabled
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>

            <div style={fieldStyle}>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={user?.email || ""}
                className="input"
                disabled
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>

            <div style={fieldStyle}>
              <label className="label">Full Name</label>
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
          </div>

          <div style={dividerStyle} />

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Groq API Key Settings</h3>
            <div style={fieldStyle}>
              <label className="label">Groq API Key</label>
              <input
                type="password"
                name="groq_api_key"
                value={formData.groq_api_key}
                onChange={handleChange}
                placeholder="gsk_••••••••••••••••••••••••"
                className="input"
              />
              <span style={hintStyle}>
                Provide your custom key from the <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>Groq Developer Console</a>. 
                This will be saved to your profile and used for book indexing, ingestion, and RAG Q&A.
              </span>
            </div>
          </div>

          <div style={dividerStyle} />

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Change Password</h3>
            <div style={fieldStyle}>
              <label className="label">New Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
                className="input"
              />
            </div>

            <div style={fieldStyle}>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className="input"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", height: 42, marginTop: "1rem" }}
          >
            {loading ? "Saving Changes..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────
const cardStyle = {
  padding: "3rem",
  background: "rgba(13, 17, 23, 0.7)",
  backdropFilter: "blur(12px)",
  boxShadow: "var(--shadow-lg)",
  display: "flex",
  flexDirection: "column",
  gap: "2rem",
};

const headerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const titleStyle = {
  fontSize: "2rem",
  fontWeight: 800,
  color: "var(--text-1)",
};

const subtitleStyle = {
  fontSize: "0.9rem",
  color: "var(--text-3)",
};

const successStyle = {
  background: "rgba(63, 185, 80, 0.15)",
  color: "#56d364",
  border: "1px solid rgba(63, 185, 80, 0.25)",
  padding: "12px 16px",
  borderRadius: "var(--radius)",
  fontSize: "0.875rem",
  textAlign: "center",
};

const errorStyle = {
  background: "rgba(248, 81, 73, 0.15)",
  color: "#ff7b72",
  border: "1px solid rgba(248, 81, 73, 0.25)",
  padding: "12px 16px",
  borderRadius: "var(--radius)",
  fontSize: "0.875rem",
  textAlign: "center",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "2rem",
};

const sectionStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const sectionTitleStyle = {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "var(--text-1)",
  marginBottom: "0.25rem",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const hintStyle = {
  fontSize: "0.75rem",
  color: "var(--text-3)",
  lineHeight: 1.4,
};

const dividerStyle = {
  height: 1,
  background: "var(--border)",
  margin: "0.5rem 0",
};
