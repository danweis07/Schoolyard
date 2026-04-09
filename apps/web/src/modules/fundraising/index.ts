import type { ModuleManifest } from '@/lib/modules'

const manifest: ModuleManifest = {
  name: 'fundraising',
  navLabelKey: 'nav.donate',
  icon: 'heroicons:heart',
  route: '/donate',
  implemented: true,
}

export default manifest
