import type { ModuleManifest } from '@/lib/modules'

const manifest: ModuleManifest = {
  name: 'news',
  navLabelKey: 'nav.news',
  icon: 'heroicons:newspaper',
  route: '/news',
  implemented: true,
  tier: 'just-getting-started',
}

export default manifest
