import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { siteConfig } from '@/lib/site'
import { isModuleEnabled } from '@schoolyard/config'

/**
 * RSS feed for the news module. Feeds like this are how families subscribe
 * to school news in a reader, and how aggregators pick up posts.
 *
 * URL: `/rss.xml`
 */

export const GET: APIRoute = async (context) => {
  if (!isModuleEnabled(siteConfig, 'news')) {
    return new Response('News module disabled', { status: 404 })
  }

  const posts = (await getCollection('news')).sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime(),
  )

  return rss({
    title: `${siteConfig.school.name} — News`,
    description: siteConfig.school.tagline || `Latest news from ${siteConfig.school.name}`,
    site: context.site ?? siteConfig.deployment.siteUrl ?? 'https://example.org',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishDate,
      description: post.data.summary,
      author: post.data.author,
      link: `/news/${post.slug}/`,
      categories: post.data.tags,
    })),
    customData: `<language>${siteConfig.languages.default}</language>`,
  })
}
