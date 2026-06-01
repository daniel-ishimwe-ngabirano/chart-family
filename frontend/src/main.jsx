try { const t = localStorage.getItem("wavechat_theme") || "dark"; document.documentElement.setAttribute("data-theme", t); } catch {}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/messages.css";
import "./styles/modals.css";
import "./styles/stories.css";
import "./styles/calls.css";
import "./styles/landing.css";
import "./styles/admin.css";
import "./styles/responsive.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
