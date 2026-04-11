import { describe, it, expect } from 'vitest'
import { sortNewsDesc, getFeaturedNews, getNewsBySlug, filterByTag } from './news.js'
import type { NewsPost } from './types.js'

function mkPost(over: Partial<NewsPost>): NewsPost {
  return {
    slug: over.slug ?? 'test',
    title: over.title ?? 'Test Post',
    publishDate: over.publishDate ?? '2026-06-01T00:00:00.000Z',
    summary: over.summary ?? '',
    tags: over.tags ?? [],
    featured: over.featured ?? false,
    ...over,
  }
}

describe('sortNewsDesc', () => {
  it('sorts news newest first', () => {
    const posts = [
      mkPost({ slug: 'old', publishDate: '2026-01-01' }),
      mkPost({ slug: 'new', publishDate: '2026-08-01' }),
      mkPost({ slug: 'mid', publishDate: '2026-05-01' }),
    ]
    expect(sortNewsDesc(posts).map((p) => p.slug)).toEqual(['new', 'mid', 'old'])
  })

  it('does not mutate the input', () => {
    const posts = [mkPost({ slug: 'a' }), mkPost({ slug: 'b', publishDate: '2027-01-01' })]
    sortNewsDesc(posts)
    expect(posts[0].slug).toBe('a')
  })
})

describe('getFeaturedNews', () => {
  it('returns the featured post when one exists', () => {
    const posts = [
      mkPost({ slug: 'normal', publishDate: '2026-08-01' }),
      mkPost({ slug: 'star', publishDate: '2026-05-01', featured: true }),
    ]
    expect(getFeaturedNews(posts)?.slug).toBe('star')
  })

  it('falls back to the most recent post when nothing is featured', () => {
    const posts = [
      mkPost({ slug: 'old', publishDate: '2026-01-01' }),
      mkPost({ slug: 'recent', publishDate: '2026-08-01' }),
    ]
    expect(getFeaturedNews(posts)?.slug).toBe('recent')
  })

  it('returns undefined for empty input', () => {
    expect(getFeaturedNews([])).toBeUndefined()
  })
})

describe('getNewsBySlug', () => {
  it('returns the matching post', () => {
    const posts = [mkPost({ slug: 'a' }), mkPost({ slug: 'b' })]
    expect(getNewsBySlug(posts, 'b')?.slug).toBe('b')
  })

  it('returns undefined for unknown slugs', () => {
    expect(getNewsBySlug([mkPost({ slug: 'a' })], 'z')).toBeUndefined()
  })
})

describe('filterByTag', () => {
  it('returns only posts with the given tag, sorted desc', () => {
    const posts = [
      mkPost({ slug: 'a', publishDate: '2026-01-01', tags: ['fundraising'] }),
      mkPost({ slug: 'b', publishDate: '2026-08-01', tags: ['fundraising', 'update'] }),
      mkPost({ slug: 'c', publishDate: '2026-05-01', tags: ['volunteer'] }),
    ]
    const fundraising = filterByTag(posts, 'fundraising')
    expect(fundraising.map((p) => p.slug)).toEqual(['b', 'a'])
  })

  it('returns empty array when no posts match', () => {
    const posts = [mkPost({ slug: 'a', tags: ['x'] })]
    expect(filterByTag(posts, 'y')).toEqual([])
  })
})
