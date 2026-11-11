'use client'

import * as React from 'react'
import { buildQrPayload } from '@/lib/qr'

interface QrCodeProps {
  kind: 'PICKUP' | 'ORDER'
  id: string
  token?: string
  size?: number
}

// Renders a scannable QR label for a pickup or order. Uses the qrcode
// package (dynamically imported) so it works offline once cached.
export function QrCode({ kind, id, token, size = 160 }: QrCodeProps) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const url = await QRCode.toDataURL(buildQrPayload(kind, id, token), {
          width: size,
          margin: 1,
          color: { dark: '#1e293b', light: '#ffffff' },
        })
        if (!cancelled) setDataUrl(url)
      } catch {
        if (!cancelled) setDataUrl(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [kind, id, token, size])

  if (!dataUrl) {
    return (
      <div
        className="animate-pulse rounded-lg bg-stone-100 border border-stone-200"
        style={{ width: size, height: size }}
        aria-label="Loading QR code"
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={'QR code for ' + id}
      className="rounded-lg border border-stone-200 bg-white"
    />
  )
}
