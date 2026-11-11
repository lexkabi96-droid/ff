import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LaunderSync — Services Platform',
    short_name: 'LaunderSync',
    description:
      'Book services, arrange pickups and track orders with QR-verified collection and drop-off.',
    start_url: '/booking',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F0F2F5',
    theme_color: '#3380CC',
    icons: [
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
