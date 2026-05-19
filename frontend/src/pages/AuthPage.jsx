import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore.js";
import { useLocaleStore } from "../stores/localeStore.js";
import { useTranslate } from "../hooks/useTranslate.js";
import { useLocation } from "react-router-dom";
import { MessageCircle, Eye, EyeOff, Loader2, Mail, Phone, ArrowLeft } from "lucide-react";

function GoogleButton({ label }) {
  return (
    <a href="/api/auth/google" className="btn-google">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {label}
    </a>
  );
}

function LoginForm({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState("email");
  const [otpSent, setOtpSent] = useState(false);
  const [storedOtp, setStoredOtp] = useState("");
  const { login, isLoggingIn } = useAuthStore();
  const t = useTranslate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login({ email, password });
  };

  const sendOtp = async () => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }), credentials: "include",
    });
    const data = await res.json();
    setStoredOtp(data.otp);
    setOtpSent(true);
  };

  const verifyOtp = async () => {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp, storedOtp }), credentials: "include",
    });
    const data = await res.json();
    if (data.accessToken) window.location.reload();
  };

  return (
    <div className="auth-form-container">
      <h2>{t("auth.welcome", "Welcome back")}</h2>
      <p className="auth-subtitle">{t("auth.signIn", "Sign in to continue to WaveChat")}</p>

      <div className="auth-tabs">
        <button className={`auth-tab ${mode === "email" ? "active" : ""}`} onClick={() => setMode("email")}>
          <Mail size={16} /> {t("auth.email", "Email")}
        </button>
        <button className={`auth-tab ${mode === "phone" ? "active" : ""}`} onClick={() => setMode("phone")}>
          <Phone size={16} /> {t("auth.phone", "Phone")}
        </button>
      </div>

      {mode === "email" ? (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>{t("auth.email", "Email")}</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>{t("auth.password", "Password")}</label>
            <div className="password-wrapper">
              <input type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="toggle-password" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={isLoggingIn}>
            {isLoggingIn ? <Loader2 size={20} className="spin" /> : t("auth.login", "Sign In")}
          </button>
        </form>
      ) : (
        <div className="auth-form">
          {!otpSent ? (
            <>
              <div className="input-group">
                <label>{t("auth.phoneNumber", "Phone Number")}</label>
                <input type="tel" placeholder="+1 234 567 890" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <button type="button" className="btn-primary" onClick={sendOtp}>{t("auth.sendOtp", "Send OTP")}</button>
            </>
          ) : (
            <>
              <div className="input-group">
                <label>{t("auth.verifyOtp", "Enter OTP")}</label>
                <input type="text" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
              </div>
              <button type="button" className="btn-primary" onClick={verifyOtp}>{t("auth.verifyOtp", "Verify")}</button>
            </>
          )}
        </div>
      )}

      <div className="auth-divider"><span>{t("auth.orContinueWith", "or continue with")}</span></div>
      <GoogleButton label={t("auth.google", "Google")} />

      <p className="auth-switch">
        {t("auth.noAccount", "Don't have an account?")}{" "}
        <button className="link-btn" onClick={() => onNavigate("register")}>{t("auth.register", "Sign up")}</button>
      </p>
    </div>
  );
}

function RegisterForm({ onNavigate }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const { signup, isSigningUp } = useAuthStore();
  const t = useTranslate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError("Passwords don't match"); return; }
    const result = await signup({ fullName: form.fullName, email: form.email, password: form.password });
    if (!result.success) setError(result.error);
  };

  return (
    <div className="auth-form-container">
      <h2>{t("auth.createAccount", "Create account")}</h2>
      <p className="auth-subtitle">{t("auth.join", "Join WaveChat and start chatting")}</p>

      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label>{t("auth.fullName", "Full Name")}</label>
          <input type="text" name="fullName" placeholder="John Doe" value={form.fullName} onChange={handleChange} required />
        </div>
        <div className="input-group">
          <label>{t("auth.email", "Email")}</label>
          <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
        </div>
        <div className="input-group">
          <label>{t("auth.password", "Password")}</label>
          <div className="password-wrapper">
            <input type={showPw ? "text" : "password"} name="password" placeholder="At least 6 characters" value={form.password} onChange={handleChange} required />
            <button type="button" className="toggle-password" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="input-group">
          <label>{t("auth.confirmPassword", "Confirm Password")}</label>
          <input type={showPw ? "text" : "password"} name="confirmPassword" placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} required />
        </div>
        <button type="submit" className="btn-primary" disabled={isSigningUp}>
          {isSigningUp ? <Loader2 size={20} className="spin" /> : t("auth.signup", "Create Account")}
        </button>
      </form>

      <div className="auth-divider"><span>{t("auth.orContinueWith", "or continue with")}</span></div>
      <GoogleButton label={t("auth.google", "Google")} />

      <p className="auth-switch">
        {t("auth.haveAccount", "Already have an account?")}{" "}
        <button className="link-btn" onClick={() => onNavigate("login")}>{t("auth.login", "Sign in")}</button>
      </p>
    </div>
  );
}

export default function AuthPage() {
  const location = useLocation();
  const [view, setView] = useState(location.pathname === "/register" ? "register" : "login");
  const { checkAuth } = useAuthStore();
  const t = useTranslate();

  useEffect(() => {
    setView(location.pathname === "/register" ? "register" : "login");
  }, [location.pathname]);

  // Handle Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("auth") === "success") {
      checkAuth();
      window.history.replaceState({}, "", location.pathname);
    }
  }, []);

  return (
    <div className="auth-page-split">
      <div className="auth-branding">
        <div className="auth-brand-content">
          <MessageCircle size={48} />
          <h1>WaveChat</h1>
          <p>{t("app.tagline", "Fast, secure, real-time messaging.")}</p>
          <div className="auth-animation">
            <div className="auth-msg anim-1">Messages appear instantly</div>
            <div className="auth-msg anim-2">End-to-end encrypted</div>
            <div className="auth-msg anim-3">Works on all devices</div>
          </div>
        </div>
      </div>
      <div className="auth-form-panel glass">
        <button className="auth-back-btn" onClick={() => window.location.href = "/"}>
          <ArrowLeft size={20} /> {t("nav.backToApp", "Home")}
        </button>
        {view === "login" ? (
          <LoginForm onNavigate={setView} />
        ) : (
          <RegisterForm onNavigate={setView} />
        )}
      </div>
    </div>
  );
}
