import { defineCollection, z } from "astro:content";

const exploreAct = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    section: z.enum(["legislative", "provisions", "implementation"]),
  }),
});

const resources = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(["template", "one-pager", "guide", "talking-points"]),
    downloadable: z.boolean(),
    filePath: z.string().optional(),
  }),
});

const caseStudies = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    blm_office: z.string(),
    state: z.string(),
    status: z.enum(["built", "approved", "proposed", "in-progress"]),
    course_holes: z.number().optional(),
    date: z.coerce.date(),
    image: z.string().optional(),
    image_alt: z.string().optional(),
    udisc_url: z.string().optional(),
    gallery: z.array(z.object({
      src: z.string(),
      alt: z.string(),
    })).optional(),
  }),
});

const news = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().optional(),
  }),
});

export const collections = {
  "explore-act": exploreAct,
  resources,
  "case-studies": caseStudies,
  news,
};
