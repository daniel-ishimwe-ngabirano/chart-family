import { prisma } from "../config/prisma.js";

export class PageSectionService {
  async getAll() {
    return prisma.pageSection.findMany({ orderBy: { slug: "asc" } });
  }

  async getPublished() {
    return prisma.pageSection.findMany({ where: { published: true }, orderBy: { slug: "asc" } });
  }

  async getBySlug(slug: string) {
    return prisma.pageSection.findUnique({ where: { slug } });
  }

  async upsert(slug: string, data: { title: string; content: string; published: boolean }) {
    return prisma.pageSection.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    });
  }

  async publish(slug: string, published: boolean) {
    return prisma.pageSection.update({ where: { slug }, data: { published } });
  }
}

export const pageSectionService = new PageSectionService();
