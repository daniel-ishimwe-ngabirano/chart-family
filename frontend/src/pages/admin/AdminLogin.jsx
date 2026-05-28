import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore.js";
import { useAdminAuthStore } from "../../stores/adminAuthStore.js";
import { Shield, Lock, Key, Mail, Loader2, Eye, EyeOff, ArrowLeft, Copy, Check, Globe } from "lucide-react";

function generatePassword(length = 20) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
  let pwd = "";
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export default function AdminLogin() {
  const { authUser, login, isLoggingIn } = useAuthStore();
  const { checkPasswordStatus, setupPassword, loginAdmin, checkAdminSession } = useAdminAuthStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    init();
  }, [authUser]);

  const init = async () => {
    const result = await checkPasswordStatus();
    if (result.fromEnv) {
      if (!authUser) { setMode("login"); return; }
      if (authUser.role !== "admin") { navigate("/chat"); return; }
      setMode("admin-env-login");
    } else if (!result.hasPassword) {
      const pwd = generatePassword();
      setGeneratedPassword(pwd);
      setPassword(pwd);
      setMode("admin-setup");
    } else {
      if (!authUser) { setMode("login"); return; }
      if (authUser.role !== "admin") { navigate("/chat"); return; }
      setMode("admin-login");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login({ email, password });
    setLoading(false);
    if (result.success) {
      setPassword("");
      setEmail("");
    } else {
      setError(result.error || "Invalid credentials");
    }
  };

  const handleAdminSetup = async () => {
    setError("");
    setLoading(true);
    const result = await setupPassword(generatedPassword);
    setLoading(false);
    if (result.success) {
      await checkAdminSession();
      navigate("/admin");
    } else {
      setError(result.error);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!password) { setError("Enter your admin password"); return; }
    setLoading(true);
    const result = await loginAdmin(password);
    setLoading(false);
    if (result.success) {
      await checkAdminSession();
      navigate("/admin");
    } else {
      setError(result.error);
    }
  };

  const copyPassword = (pwd) => {
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-icon">
          <Shield size={48} />
        </div>

        {mode === "login" && (
          <>
            <h1>Admin Login</h1>
            <p className="admin-login-sub">Sign in with your admin account</p>
            <form onSubmit={handleLogin} className="admin-login-form">
              <div className="admin-login-field">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="Admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="admin-login-field">
                <Lock size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="admin-login-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="admin-login-error">{error}</p>}
              <button type="submit" className="admin-login-btn" disabled={loading || isLoggingIn}>
                {(loading || isLoggingIn) ? <Loader2 size={18} className="spin" /> : <Shield size={18} />}
                Sign In to Admin
              </button>
            </form>
            <button className="admin-login-back" onClick={() => navigate("/")}>
              <ArrowLeft size={16} /> Back to Home
            </button>
          </>
        )}

        {mode === "admin-setup" && (
          <>
            <h1>Admin Setup</h1>
            <p className="admin-login-sub">{authUser?.fullName}, secure your admin panel</p>
            <div className="admin-password-reveal">
              <Key size={20} />
              <span>Your generated admin password:</span>
              <div className="admin-password-box" onClick={() => copyPassword(generatedPassword)}>
                <code>{generatedPassword}</code>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </div>
              <p className="admin-password-warning">
                Save this password now. You will need it to access the admin panel.
              </p>
            </div>
            <button type="button" className="admin-login-btn" onClick={handleAdminSetup} disabled={loading}>
              {loading ? <Loader2 size={18} className="spin" /> : <Shield size={18} />}
              I Saved the Password — Enter Admin Panel
            </button>
            <button className="admin-login-back" onClick={() => navigate("/chat")}>
              Back to Chat
            </button>
          </>
        )}

        {mode === "admin-env-login" && (
          <>
            <h1>Admin Panel</h1>
            <p className="admin-login-sub">{authUser?.fullName}</p>
            <form onSubmit={handleAdminLogin} className="admin-login-form">
              <div className="admin-env-notice">
                <Globe size={16} />
                <span>
                  Password is set via <code>ADMIN_PANEL_SECRET</code> environment variable.
                  Check your Render dashboard for the current value.
                </span>
              </div>
              <div className="admin-login-field">
                <Lock size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter ADMIN_PANEL_SECRET from Render"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <button type="button" className="admin-login-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="admin-login-error">{error}</p>}
              <button type="submit" className="admin-login-btn" disabled={loading}>
                {loading ? <Loader2 size={18} className="spin" /> : null}
                Enter Admin Panel
              </button>
            </form>
            <button className="admin-login-back" onClick={() => navigate("/chat")}>
              Back to Chat
            </button>
          </>
        )}

        {mode === "admin-login" && (
          <>
            <h1>Welcome, Admin</h1>
            <p className="admin-login-sub">{authUser?.fullName}</p>
            <form onSubmit={handleAdminLogin} className="admin-login-form">
              <p className="admin-login-desc">
                <Lock size={16} />
                Enter your admin password to access the panel
              </p>
              <div className="admin-login-field">
                <Lock size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <button type="button" className="admin-login-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="admin-login-error">{error}</p>}
              <button type="submit" className="admin-login-btn" disabled={loading}>
                {loading ? <Loader2 size={18} className="spin" /> : null}
                Enter Admin Panel
              </button>
            </form>
            <button className="admin-login-back" onClick={() => navigate("/chat")}>
              Back to Chat
            </button>
          </>
        )}
      </div>
    </div>
  );
}
