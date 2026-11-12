'use client'

import * as React from 'react'
import Link from 'next/link'
import { useStore } from '@/context/store-context'
import { QrCode } from '@/components/qr/order-qr'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QrCode as QrIcon, Printer, ArrowLeft } from 'lucide-react'

// Printable QR label sheet: print these and attach one to each bag or
// job ticket. Scanning a label on /scan verifies pickup or drop-off.
export default function QrLabelsPage() {
  const { pickups, orders } = useStore()

  const activePickups = pickups.filter((p) => p.status !== 'Completed' && p.status !== 'Cancelled')
  const activeOrders = orders.filter((o) => o.status !== 'delivered')

  return (
    <div className="min-h-screen bg-stone-50 text-foreground py-10 px-4 md:px-6">
      <header className="max-w-3xl mx-auto w-full text-center mb-6">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-md shadow-blue-500/10">
            <QrIcon className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-primary font-headline">
            QR Label Sheet
          </span>
        </div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
          Print and attach to bags or job tickets
        </p>
        <div className="flex justify-center gap-2 mt-4 print:hidden">
          <Button onClick={() => window.print()} className="gap-2 rounded-xl">
            <Printer className="h-4 w-4" /> Print labels
          </Button>
          <Link href="/scan">
            <Button variant="outline" className="gap-2 rounded-xl">Open scanner</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full space-y-8">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Pickup labels ({activePickups.length})
          </h2>
          {activePickups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active pickups.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activePickups.map((p) => (
                <Card key={p.id} className="border bg-white rounded-2xl">
                  <CardContent className="flex items-center gap-4 p-4">
                    <QrCode kind="PICKUP" id={p.id} token={p.qrToken} size={110} />
                    <div className="min-w-0 text-xs space-y-1">
                      <div className="font-mono font-bold text-primary text-sm">{p.id}</div>
                      <div className="font-semibold truncate">{p.customerName}</div>
                      <div className="text-muted-foreground truncate">{p.location}</div>
                      <div className="text-muted-foreground truncate">{p.items}</div>
                      <div className="font-medium">{p.time} ({p.date})</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Order labels ({activeOrders.length})
          </h2>
          {activeOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active orders.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeOrders.map((o) => (
                <Card key={o.id} className="border bg-white rounded-2xl">
                  <CardContent className="flex items-center gap-4 p-4">
                    <QrCode kind="ORDER" id={o.id} token={o.qrToken} size={110} />
                    <div className="min-w-0 text-xs space-y-1">
                      <div className="font-mono font-bold text-primary text-sm">{o.id}</div>
                      <div className="font-semibold truncate">{o.customerName}</div>
                      <div className="text-muted-foreground truncate">{o.items}</div>
                      <div className="font-bold text-primary">{o.amount}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <div className="text-center pt-2 print:hidden">
          <Link href="/" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
