import type { ModuleManifest } from '@/lib/modules'

const manifest: ModuleManifest = {
  name: 'volunteer',
  navLabelKey: 'nav.volunteer',
  icon: 'heroicons:hand-raised',
  route: '/volunteer',
  implemented: true,
  tier: 'active-pta',
}

export default manifest
