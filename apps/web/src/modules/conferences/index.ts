import type { ModuleManifest } from '@/lib/modules'

const manifest: ModuleManifest = {
  name: 'conferences',
  navLabelKey: 'nav.conferences',
  icon: 'heroicons:academic-cap',
  route: '/conferences',
  implemented: true,
  tier: 'active-pta',
}

export default manifest
