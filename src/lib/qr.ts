// QR payload helpers for pickup and drop-off verification.
// Payload format: FF://PICKUP/<id>/<token> or FF://ORDER/<id>/<token>
// Plain ids (PK-1001, ORD-7301) are also accepted for manual entry.

export type QrKind = 'PICKUP' | 'ORDER'

export interface ParsedQr {
  kind: QrKind
  id: string
  token?: string
}

export function buildQrPayload(kind: QrKind, id: string, token?: string): string {
  if (token) return 'FF://' + kind + '/' + id + '/' + token
  return 'FF://' + kind + '/' + id
}

export function parseQrPayload(raw: string): ParsedQr | null {
  const value = raw.trim()
  if (!value) return null
  const match = value.match(/^FF:\/\/(PICKUP|ORDER)\/([A-Za-z0-9-]+)(?:\/([A-Za-z0-9-]+))?$/i)
  if (match) {
    return {
      kind: match[1].toUpperCase() as QrKind,
      id: match[2].toUpperCase(),
      token: match[3],
    }
  }
  if (/^(PK|ORD)-[A-Za-z0-9-]+$/i.test(value)) {
    return {
      kind: value.toUpperCase().indexOf('PK') === 0 ? 'PICKUP' : 'ORDER',
      id: value.toUpperCase(),
    }
  }
  return null
}

export function newQrToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  }
  return Math.random().toString(36).slice(2, 12).toUpperCase()
}
