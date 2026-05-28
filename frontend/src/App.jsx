import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore.js";
import { useChatStore } from "./stores/chatStore.js";
import { useFeatureStore } from "./stores/featureStore.js";
import { useThemeStore } from "./stores/themeStore.js";
import { connectSocket, disconnectSocket } from "./stores/socketStore.js";
import { registerServiceWorker, subscribeToPush } from "./utils/push.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ConnectionStatus from "./components/ConnectionStatus.jsx";
import { STORAGE_KEYS } from "./lib/constants.js";
import LandingPage from "./pages/LandingPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/Dashboard.jsx";
import AdminFeatures from "./pages/admin/Features.jsx";
import AdminTheme from "./pages/admin/AdminTheme.jsx";
import AdminModeration from "./pages/admin/AdminModeration.jsx";
import AdminBroadcasts from "./pages/admin/AdminBroadcasts.jsx";
import AdminNavigation from "./pages/admin/AdminNavigation.jsx";
import AdminRoles from "./pages/admin/AdminRoles.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminSettings from "./pages/admin/Settings.jsx";
import AdminLogs from "./pages/admin/Logs.jsx";
import AdminSections from "./pages/admin/Sections.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ children }) {
  const { authUser, isCheckingAuth } = useAuthStore();
  if (isCheckingAuth) return <div className="loading-screen"><Loader2 size={48} className="spin" /></div>;
  return authUser ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { authUser, isCheckingAuth } = useAuthStore();
  if (isCheckingAuth) return <div className="loading-screen"><Loader2 size={48} className="spin" /></div>;
  if (!authUser) return <Navigate to="/admin/login" />;
  if (authUser.role !== "admin") return <Navigate to="/chat" />;
  return <AdminLayout>{children}</AdminLayout>;
}

function App() {
  const { authUser, isCheckingAuth, checkAuth } = useAuthStore();
  const { getConversations, getUsers } = useChatStore();
  const { fetchFeatures, fetchPublicFeatures } = useFeatureStore();
  const { loadTheme } = useThemeStore();
  const authCheckedRef = useRef(false);

  useEffect(() => {
    if (!authCheckedRef.current) {
      authCheckedRef.current = true;
      checkAuth();
    }
  }, [checkAuth]);

  useEffect(() => {
    if (authUser) {
      connectSocket();
      getConversations();
      getUsers();
      if (authUser.role === "admin") {
        fetchFeatures();
        loadTheme();
      } else {
        fetchPublicFeatures();
      }
      const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_SETTINGS) || "{}");
      if (settings.notifications !== false) {
        registerServiceWorker().then((reg) => {
          if (reg) {
            subscribeToPush(reg);
          }
        });
      }
      return () => disconnectSocket();
    } else {
      disconnectSocket();
    }
  }, [authUser, getConversations, getUsers, fetchFeatures, fetchPublicFeatures, loadTheme]);

  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ConnectionStatus />
      <Routes>
        <Route path="/" element={authUser ? <Navigate to="/chat" /> : <LandingPage />} />
        <Route path="/login" element={authUser ? <Navigate to="/chat" /> : <AuthPage />} />
        <Route path="/register" element={authUser ? <Navigate to="/chat" /> : <AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/features" element={<AdminRoute><AdminFeatures /></AdminRoute>} />
        <Route path="/admin/theme" element={<AdminRoute><AdminTheme /></AdminRoute>} />
        <Route path="/admin/moderation" element={<AdminRoute><AdminModeration /></AdminRoute>} />
        <Route path="/admin/broadcasts" element={<AdminRoute><AdminBroadcasts /></AdminRoute>} />
        <Route path="/admin/navigation" element={<AdminRoute><AdminNavigation /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/roles" element={<AdminRoute><AdminRoles /></AdminRoute>} />
        <Route path="/admin/sections" element={<AdminRoute><AdminSections /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
        <Route path="/admin/logs" element={<AdminRoute><AdminLogs /></AdminRoute>} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
