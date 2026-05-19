import { Router } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

router.get("/stats", async (_req, res) => {
  try {
    const [totalUsers, totalMessages] = await Promise.all([
      prisma.user.count(),
      prisma.message.count(),
    ]);
    res.json({ totalUsers, totalMessages });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/page-sections", async (_req, res) => {
  try {
    const sections = await prisma.pageSection.findMany({ where: { published: true } });
    res.json(sections);
  } catch {
    res.status(500).json({ error: "Failed to fetch page sections" });
  }
});

router.get("/page-sections/:slug", async (req, res) => {
  try {
    const section = await prisma.pageSection.findUnique({ where: { slug: req.params.slug } });
    if (!section || !section.published) {
      return res.status(404).json({ error: "Section not found" });
    }
    res.json(section);
  } catch {
    res.status(500).json({ error: "Failed to fetch page section" });
  }
});

export default router;
