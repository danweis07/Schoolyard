import type { NewsPost } from './types.js'

export function sortNewsDesc(posts: NewsPost[]): NewsPost[] {
  return [...posts].sort(
    (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime(),
  )
}

export function getFeaturedNews(posts: NewsPost[]): NewsPost | undefined {
  const sorted = sortNewsDesc(posts)
  return sorted.find((p) => p.featured) ?? sorted[0]
}

export function getNewsBySlug(posts: NewsPost[], slug: string): NewsPost | undefined {
  return posts.find((p) => p.slug === slug)
}

export function filterByTag(posts: NewsPost[], tag: string): NewsPost[] {
  return sortNewsDesc(posts.filter((p) => p.tags.includes(tag)))
}
