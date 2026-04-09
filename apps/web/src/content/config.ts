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
    category: z
      .enum(['fundraiser', 'social', 'academic', 'volunteer', 'other'])
      .default('other'),
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

export const collections = { events, news, board, volunteers, resources }
