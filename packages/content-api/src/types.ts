/**
 * Shared types for content shapes used by both web and mobile.
 *
 * The Astro side uses Zod schemas in apps/web/src/content/config.ts to
 * derive these types via inference. We mirror them here as plain TypeScript
 * so the mobile app can consume the same shapes without depending on Astro.
 */

export type EventCategory = 'fundraiser' | 'social' | 'academic' | 'volunteer' | 'other'

export interface SchoolEvent {
  slug: string
  title: string
  date: string // ISO date string
  endDate?: string
  time?: string
  location?: string
  description: string
  category: EventCategory
  registrationUrl?: string
  featured: boolean
  cancelled: boolean
}

export interface NewsPost {
  slug: string
  title: string
  publishDate: string // ISO date string
  author?: string
  summary: string
  tags: string[]
  featured: boolean
  image?: string
  imageAlt?: string
}

export interface BoardMember {
  slug: string
  name: string
  role: string
  email?: string
  photo?: string
  bio?: string
  termStart?: string
  termEnd?: string
  order: number
}

export interface VolunteerRole {
  slug: string
  title: string
  description: string
  commitment: string
  contact?: string
  filled: boolean
  order: number
}

export type ResourceCategory = 'food' | 'health' | 'housing' | 'legal' | 'mental-health' | 'other'

export interface SchoolResource {
  slug: string
  name: string
  category: ResourceCategory
  description: string
  address?: string
  phone?: string
  url?: string
  languages: string[]
}
