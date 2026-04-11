import { defineCollection, z } from 'astro:content'

/**
 * Astro content collections — canonical schemas for school content.
 * These shapes are mirrored as plain TypeScript types in
 * @schoolyard/content-api so the mobile app can consume the same data.
 */

const events = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    time: z.string().optional(),
    location: z.string().optional(),
    description: z.string(),
    category: z.enum(['fundraiser', 'social', 'academic', 'volunteer', 'other']).default('other'),
    registrationUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    cancelled: z.boolean().default(false),
  }),
})

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    publishDate: z.coerce.date(),
    author: z.string().optional(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
})

const board = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    email: z.string().email().optional(),
    photo: z.string().optional(),
    bio: z.string().optional(),
    termStart: z.string().optional(),
    termEnd: z.string().optional(),
    order: z.number().default(99),
  }),
})

const volunteers = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    commitment: z.string(),
    contact: z.string().email().optional(),
    filled: z.boolean().default(false),
    order: z.number().default(99),
  }),
})

const resources = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    category: z.enum(['food', 'health', 'housing', 'legal', 'mental-health', 'other']),
    description: z.string(),
    address: z.string().optional(),
    phone: z.string().optional(),
    url: z.string().url().optional(),
    languages: z.array(z.string()).default(['en']),
  }),
})

// ─────────────────────────────────────────────
// New collections for stub modules
// ─────────────────────────────────────────────

/** Weekly lunch menu. One entry per week, dated by the Monday of the week. */
const lunchMenus = defineCollection({
  type: 'content',
  schema: z.object({
    weekStart: z.coerce.date(),
    weekEnd: z.coerce.date().optional(),
    monday: z.string().default(''),
    tuesday: z.string().default(''),
    wednesday: z.string().default(''),
    thursday: z.string().default(''),
    friday: z.string().default(''),
    allergens: z.array(z.string()).default([]),
    freeReducedNote: z.string().optional(),
  }),
})

/** Bus routes and transportation schedules. */
const transportationRoutes = defineCollection({
  type: 'content',
  schema: z.object({
    routeNumber: z.string(),
    routeName: z.string(),
    driver: z.string().optional(),
    morningArrival: z.string().optional(),
    afternoonDeparture: z.string().optional(),
    stops: z
      .array(
        z.object({
          name: z.string(),
          time: z.string().optional(),
        }),
      )
      .default([]),
    notes: z.string().optional(),
    order: z.number().default(99),
  }),
})

/** Community classifieds, carpool, skill share, business directory. */
const communityListings = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z
      .enum(['classified', 'carpool', 'skill-share', 'business', 'new-family', 'other'])
      .default('other'),
    description: z.string(),
    contact: z.string().optional(),
    neighborhood: z.string().optional(),
    postedDate: z.coerce.date().optional(),
    expiresDate: z.coerce.date().optional(),
    url: z.string().url().optional(),
    order: z.number().default(99),
  }),
})

/** Teacher pages with wishlists and reading lists. */
const classroomTeachers = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    grade: z.string(),
    subject: z.string().optional(),
    email: z.string().email().optional(),
    photo: z.string().optional(),
    wishlist: z.array(z.string()).default([]),
    readingList: z.array(z.string()).default([]),
    order: z.number().default(99),
  }),
})

/** Budget transparency — year-by-year PTA budget summaries. */
const budgetYears = defineCollection({
  type: 'content',
  schema: z.object({
    year: z.string(),
    totalRaised: z.number().nonnegative(),
    totalSpent: z.number().nonnegative(),
    categories: z
      .array(
        z.object({
          name: z.string(),
          amount: z.number().nonnegative(),
          percent: z.number().nonnegative().optional(),
        }),
      )
      .default([]),
    summary: z.string().optional(),
    order: z.number().default(99),
  }),
})

/** PTA committees — previously hardcoded in committees.astro. */
const committees = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    icon: z.string().default(''),
    description: z.string(),
    meets: z.string().optional(),
    members: z.string().optional(),
    order: z.number().default(99),
  }),
})

/** PTA enrichment programs — previously hardcoded in enrichment.astro. */
const programs = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    grades: z.string(),
    schedule: z.string(),
    description: z.string(),
    funding: z.string().optional(),
    partner: z.string().optional(),
    order: z.number().default(99),
  }),
})

export const collections = {
  events,
  news,
  board,
  volunteers,
  resources,
  lunchMenus,
  transportationRoutes,
  communityListings,
  classroomTeachers,
  budgetYears,
  committees,
  programs,
}
