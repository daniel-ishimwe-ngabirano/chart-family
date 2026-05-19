try { const t = localStorage.getItem("wavechat_theme") || "dark"; document.documentElement.setAttribute("data-theme", t); } catch {}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
