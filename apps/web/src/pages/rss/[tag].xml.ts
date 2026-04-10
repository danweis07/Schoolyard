import rss from '@astrojs/rss'
import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { siteConfig } from '@/lib/site'
import { isModuleEnabled } from '@schoolyard/config'

/**
 * Per-tag RSS feeds for the news module. The combined feed lives at
 * `/rss.xml`; these tag-scoped variants let families subscribe to just
 * the topics they care about (e.g. `/rss/fundraising.xml`, `/rss/pta.xml`).
 *
 * The tag list is built at compile time from the distinct tags across all
 * news posts, so no content = no feeds.
 */

interface Props {
  tag: string
}

export const getStaticPaths: GetStaticPaths = async () => {
  if (!isModuleEnabled(siteConfig, 'news')) return []
  const posts = await getCollection('news')
  const tags = Array.from(new Set(posts.flatMap((p) => p.data.tags))).sort()
  return tags.map((tag) => ({
    params: { tag },
    props: { tag },
  }))
}

export const GET: APIRoute = async (context) => {
  const { tag } = context.props as Props

  const posts = (await getCollection('news'))
    .filter((p) => p.data.tags.includes(tag))
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime())

  return rss({
    title: `${siteConfig.school.name} — News · #${tag}`,
    description: `News posts tagged "${tag}" from ${siteConfig.school.name}`,
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
