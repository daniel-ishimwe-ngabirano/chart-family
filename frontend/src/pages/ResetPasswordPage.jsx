import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import axios from "../lib/axios.js";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.post("/auth/forgot-password", { email });
      setMsg("If that email exists, a reset link was sent. Check your inbox.");
    } catch (err) {
      setError(err.response?.data?.error || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page-split">
        <div className="auth-form-panel glass" style={{ margin: "auto" }}>
          <div className="auth-form-container">
            <button className="auth-back-btn" onClick={() => navigate("/login")}>
              <ArrowLeft size={20} /> Back to Login
            </button>
            {msg ? (
              <>
                <h2>Check Your Email</h2>
                <p>{msg}</p>
              </>
            ) : (
              <>
                <h2>Forgot Password</h2>
                <p className="auth-subtitle">Enter your email to receive a reset link</p>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleForgotSubmit} className="auth-form">
                  <div className="input-group">
                    <label>Email</label>
                    <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? <Loader2 size={20} className="spin" /> : "Send Reset Link"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    try {
      await axios.post("/auth/reset-password", { token, password });
      setMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-split">
      <div className="auth-form-panel glass" style={{ margin: "auto" }}>
        <div className="auth-form-container">
          <button className="auth-back-btn" onClick={() => navigate("/login")}>
            <ArrowLeft size={20} /> Back to Login
          </button>
          {msg ? (
            <>
              <h2>Success!</h2>
              <p>{msg}</p>
            </>
          ) : (
            <>
              <h2>Reset Password</h2>
              <p className="auth-subtitle">Enter your new password</p>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="input-group">
                  <label>New Password</label>
                  <div className="password-wrapper">
                    <input type={showPw ? "text" : "password"} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" className="toggle-password" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="input-group">
                  <label>Confirm Password</label>
                  <input type={showPw ? "text" : "password"} placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <Loader2 size={20} className="spin" /> : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
