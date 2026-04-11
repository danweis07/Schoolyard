import type { ModuleManifest } from '@/lib/modules'

const manifest: ModuleManifest = {
  name: 'community',
  navLabelKey: 'nav.community',
  icon: 'heroicons:users',
  route: '/community',
  implemented: true,
  tier: 'full-community-hub',
}

export default manifest
