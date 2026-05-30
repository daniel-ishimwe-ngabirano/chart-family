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
import storyRoutes from "./routes/story.routes.js";
import { csrfProtection } from "./middleware/csrf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// Trust proxy (Render places you behind a proxy)
app.set("trust proxy", 1);

// Security headers
const frontendUrls = env.FRONTEND_URL.split(",").map(s => s.trim()).filter(Boolean);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:", ...frontendUrls, "http://localhost:5173"],
      imgSrc: ["'self'", "data:", "blob:", "https://api.dicebear.com", "https://res.cloudinary.com", "*"],
      mediaSrc: ["'self'", "data:", "blob:", "*"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  ieNoOpen: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
}));

const corsOrigins = env.FRONTEND_URL
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat("http://localhost:5173");

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Global rate limiting (100 req/15 min per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use(globalLimiter);

// Auth rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth requests, try again later" },
});
app.use("/api/auth", authLimiter);

// Message rate limit (prevent spam)
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages, slow down" },
});
app.use("/api/conversations", messageLimiter);

// Body parsing (must be before CSRF so cookies/body are available)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport
app.use(passport.initialize());

function skipCsrf(path: string): boolean {
  if (path === "/api/health") return true;
  if (path.startsWith("/api/public")) return true;
  if (path.startsWith("/api/auth")) return true;
  if (path.startsWith("/api/admin")) return true;
  if (path === "/api/users/avatar") return true;
  if (path.startsWith("/api/users/push")) return true;
  if (path.startsWith("/api/conversations/") && (path.endsWith("/messages") || path.endsWith("/read"))) return true;
  return false;
}

// CSRF token cookie + protection (skipped for public & auth endpoints)
app.use(setCsrfToken);
app.use((req, res, next) => {
  if (skipCsrf(req.path)) return next();
  csrfProtection(req, res, next);
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// CSRF token endpoint (reads token set by setCsrfToken middleware)
app.get("/api/csrf-token", (req, res) => {
  const token = req.cookies?.["csrf-token"] || res.locals["csrf-token"] || null;
  res.json({ csrfToken: token });
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
app.use("/api/stories", storyRoutes);

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
