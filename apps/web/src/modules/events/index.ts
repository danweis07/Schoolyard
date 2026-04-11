import type { ModuleManifest } from '@/lib/modules'

const manifest: ModuleManifest = {
  name: 'events',
  navLabelKey: 'nav.events',
  icon: 'heroicons:calendar-days',
  route: '/events',
  implemented: true,
  tier: 'just-getting-started',
}

export default manifest
