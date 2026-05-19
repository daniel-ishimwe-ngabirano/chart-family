import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import passport from "passport";
import "./config/passport.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setCsrfToken } from "./middleware/csrf.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import groupRoutes from "./routes/group.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import publicRoutes from "./routes/public.routes.js";
import { csrfProtection } from "./middleware/csrf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const corsOrigins = env.FRONTEND_URL
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat("http://localhost:5173");

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use("/api/auth", limiter);

// CSRF token cookie
app.use(setCsrfToken);

// Passport
app.use(passport.initialize());

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);

// Serve frontend in production (Docker/standalone)
if (env.NODE_ENV === "production") {
  const candidates = [
    path.join(__dirname, "..", "public"),
    path.join(__dirname, "..", "..", "frontend", "dist"),
  ];
  for (const distPath of candidates) {
    if (fs.existsSync(path.join(distPath, "index.html"))) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
      break;
    }
  }
}

// Error handler
app.use(errorHandler);

export { app, httpServer };
